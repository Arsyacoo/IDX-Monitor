from fastapi.testclient import TestClient

from main import app, build_stock_summary, PRICE_CACHE

client = TestClient(app)


def test_health_endpoint_returns_cache_status():
    response = client.get('/api/health')

    assert response.status_code == 200
    payload = response.json()
    assert payload['status'] in {'ok', 'degraded'}
    assert payload['total_stocks'] > 0
    assert 'cache_coverage_percent' in payload


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
