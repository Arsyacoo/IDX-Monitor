from datetime import datetime, timezone

import requests

from cache import record_provider_failure, record_provider_success, utc_now_iso
from config import YAHOO_CHART_URL
from services.providers.retry import retry_with_backoff


def fetch_yahoo_chart(ticker_jk, period):
    def request_chart():
        response = requests.get(
            YAHOO_CHART_URL.format(ticker=ticker_jk),
            params={"range": period, "interval": "1d"},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()

    try:
        payload = retry_with_backoff(request_chart)
        record_provider_success("yahoo_chart")
    except Exception as error:
        record_provider_failure("yahoo_chart", error)
        raise
    result = payload.get("chart", {}).get("result") or []
    if not result:
        return None

    chart = result[0]
    meta = chart.get("meta", {})
    timestamps = chart.get("timestamp") or []
    quote = (chart.get("indicators", {}).get("quote") or [{}])[0]
    closes = quote.get("close") or []
    volumes = quote.get("volume") or []

    history = []
    for timestamp, close in zip(timestamps, closes):
        if close is None:
            continue
        history.append({
            "date": datetime.fromtimestamp(timestamp, timezone.utc).astimezone().strftime("%Y-%m-%d"),
            "price": close,
        })

    current = meta.get("regularMarketPrice") or (history[-1]["price"] if history else 0.0)
    previous = meta.get("chartPreviousClose") or meta.get("previousClose") or current
    change_pct = ((current - previous) / previous * 100) if previous else 0.0

    return {
        "current": current or 0.0,
        "change_percent": change_pct,
        "volume": meta.get("regularMarketVolume") or (volumes[-1] if volumes else 0),
        "open": meta.get("regularMarketOpen") or 0.0,
        "high": meta.get("regularMarketDayHigh") or 0.0,
        "low": meta.get("regularMarketDayLow") or 0.0,
        "previous_close": previous or 0.0,
        "history": history,
        "data_source": "yahoo_chart",
        "last_updated_at": utc_now_iso(),
    }
