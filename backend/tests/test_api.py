from fastapi.testclient import TestClient

from cache import clear_unavailable_ticker, is_ticker_unavailable, mark_ticker_unavailable
from config import parse_cors_origins
from services.providers.retry import retry_with_backoff
from services.providers.yahoo_chart import fetch_yahoo_chart
from services.technical_indicators import calculate_technical_indicators
from services.whale_detector import build_whale_alert, classify_whale_signal
from main import (
    app,
    build_stock_summary,
    HISTORY_CACHE,
    PRICE_CACHE,
    is_history_cache_fresh,
    utc_now_iso,
)

client = TestClient(app)


def test_health_endpoint_returns_cache_status():
    response = client.get('/api/health')

    assert response.status_code == 200
    payload = response.json()
    assert payload['status'] in {'ok', 'degraded'}
    assert payload['total_stocks'] > 0
    assert 'cache_coverage_percent' in payload
    assert 'cached_histories' in payload
    assert payload['history_cache_ttl_seconds'] > 0
    assert 'worker_running' in payload
    assert 'current_batch_start' in payload
    assert 'current_batch_end' in payload
    assert 'current_batch_size' in payload
    assert 'current_ticker' in payload
    assert 'last_successful_ticker' in payload
    assert 'failed_tickers_count' in payload
    assert 'unavailable_tickers_count' in payload


def test_provider_status_endpoint_returns_diagnostics():
    response = client.get('/api/status/providers')

    assert response.status_code == 200
    payload = response.json()
    assert 'providers' in payload
    assert 'unavailable_tickers' in payload
    assert 'total_unavailable' in payload
    assert {provider['key'] for provider in payload['providers']} == {'yahoo_chart', 'yfinance'}


def test_unavailable_ticker_helpers_track_and_clear_failures():
    ticker = 'FAIL.JK'
    clear_unavailable_ticker(ticker)

    mark_ticker_unavailable(ticker, 'temporary provider failure')

    assert is_ticker_unavailable(ticker) is True

    clear_unavailable_ticker(ticker)

    assert is_ticker_unavailable(ticker) is False


def test_retry_with_backoff_recovers_after_transient_failure(monkeypatch):
    attempts = {'count': 0}
    monkeypatch.setattr('services.providers.retry.time.sleep', lambda _: None)

    def flaky_operation():
        attempts['count'] += 1
        if attempts['count'] == 1:
            raise RuntimeError('temporary')
        return 'ok'

    assert retry_with_backoff(flaky_operation, retries=1, base_delay=0) == 'ok'
    assert attempts['count'] == 2


def test_yahoo_chart_provider_parses_chart_response(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                'chart': {
                    'result': [{
                        'meta': {
                            'regularMarketPrice': 110.0,
                            'chartPreviousClose': 100.0,
                            'regularMarketVolume': 12345,
                            'regularMarketOpen': 101.0,
                            'regularMarketDayHigh': 111.0,
                            'regularMarketDayLow': 99.0,
                        },
                        'timestamp': [1767225600, 1767312000],
                        'indicators': {
                            'quote': [{
                                'close': [100.0, 110.0],
                                'volume': [1000, 12345],
                            }],
                        },
                    }],
                },
            }

    monkeypatch.setattr('services.providers.yahoo_chart.requests.get', lambda *args, **kwargs: FakeResponse())

    payload = fetch_yahoo_chart('TEST.JK', '5d')

    assert payload['current'] == 110.0
    assert payload['change_percent'] == 10.0
    assert payload['volume'] == 12345
    assert payload['open'] == 101.0
    assert payload['high'] == 111.0
    assert payload['low'] == 99.0
    assert payload['previous_close'] == 100.0
    assert payload['data_source'] == 'yahoo_chart'
    assert len(payload['history']) == 2


def test_stock_summary_includes_volume_from_cache():
    PRICE_CACHE['TEST.JK'] = {
        'last_price': 1234.0,
        'change_percent': 2.345,
        'volume': 987654,
    }

    summary = build_stock_summary({'ticker': 'TEST', 'name': 'Test Equity'})

    assert summary == {
        'ticker': 'TEST',
        'name': 'Test Equity',
        'last_price': 1234.0,
        'change_percent': 2.35,
        'volume': 987654,
    }

    PRICE_CACHE.pop('TEST.JK', None)


def test_invalid_stock_period_is_rejected():
    response = client.get('/api/stock/BBCA?period=10y')

    assert response.status_code == 400
    assert 'Invalid period' in response.json()['detail']


def test_history_cache_freshness_uses_cached_at():
    assert is_history_cache_fresh({'cached_at': utc_now_iso()}) is True
    assert is_history_cache_fresh({}) is False
    assert is_history_cache_fresh(None) is False


def test_technical_indicators_identify_bullish_trend():
    history = [{'date': f'2026-01-{day:02d}', 'price': float(day)} for day in range(1, 61)]

    indicators = calculate_technical_indicators(history, last_price=60.0)

    assert indicators['ma20'] == 50.5
    assert indicators['ma50'] == 35.5
    assert indicators['rsi14'] == 100.0
    assert indicators['trend_label'] == 'Bullish'
    assert indicators['period_points'] == 60


def test_stock_detail_can_return_history_cache_without_external_fetch():
    cache_key = 'TEST.JK:1mo'
    HISTORY_CACHE[cache_key] = {
        'last_price': 1000.0,
        'change_percent': 1.5,
        'history': [{'date': '2026-01-01', 'price': 1000.0}],
        'metrics': {
            'open': 990.0,
            'high': 1010.0,
            'low': 980.0,
            'previous_close': 985.0,
            'volume': 123456,
        },
        'cached_at': utc_now_iso(),
    }

    response = client.get('/api/stock/TEST?period=1mo')

    assert response.status_code == 200
    payload = response.json()
    assert payload['ticker'] == 'TEST'
    assert payload['last_price'] == 1000.0
    assert payload['data_source'] == 'history_cache'
    assert payload['last_updated_at'] is not None
    assert payload['open'] == 990.0
    assert payload['high'] == 1010.0
    assert payload['low'] == 980.0
    assert payload['previous_close'] == 985.0
    assert payload['volume'] == 123456
    assert payload['history'] == [{'date': '2026-01-01', 'price': 1000.0, 'ma20': 1000.0, 'ma50': 1000.0}]
    assert payload['technical_indicators'] == {
        'ma20': 1000.0,
        'ma50': 1000.0,
        'rsi14': None,
        'trend_label': 'Insufficient Data',
        'period_points': 1,
    }

    HISTORY_CACHE.pop(cache_key, None)


def test_market_summary_endpoint_returns_lists():
    PRICE_CACHE['AAA.JK'] = {
        'last_price': 100.0,
        'change_percent': 5.0,
        'volume': 1000,
    }
    PRICE_CACHE['BBB.JK'] = {
        'last_price': 90.0,
        'change_percent': -1.0,
        'volume': 500,
    }

    response = client.get('/api/market-summary')

    assert response.status_code == 200
    payload = response.json()
    assert 'total_cached' in payload
    assert 'top_gainers' in payload
    assert 'top_losers' in payload
    assert 'top_volume' in payload

    PRICE_CACHE.pop('AAA.JK', None)
    PRICE_CACHE.pop('BBB.JK', None)


def test_parse_cors_origins_supports_wildcard_and_lists():
    assert parse_cors_origins('*') == ['*']
    assert parse_cors_origins('http://localhost:5173, https://example.com') == [
        'http://localhost:5173',
        'https://example.com',
    ]


def test_whale_signal_classification_and_alert_shape():
    category, signal, confidence, action = classify_whale_signal(2.5, 3.0)

    assert category == 'Major Accumulation'
    assert signal == 'Major Whale Accumulation'
    assert confidence > 0
    assert action == 'Open in Chart'

    alert = build_whale_alert(
        {'ticker': 'TEST', 'name': 'Test Equity'},
        last_price=120.0,
        prev_close=100.0,
        current_vol=2500,
        avg_vol=1000,
    )

    assert alert['ticker'] == 'TEST'
    assert alert['category'] == 'Major Accumulation'
    assert alert['confidence_score'] > 0
    assert alert['action_label'] == 'Open in Chart'
