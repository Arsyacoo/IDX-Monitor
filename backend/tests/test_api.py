from fastapi.testclient import TestClient

from config import parse_cors_origins
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
    assert payload['history'] == [{'date': '2026-01-01', 'price': 1000.0}]

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
