import yfinance as yf

from cache import record_provider_failure, record_provider_success, utc_now_iso
from services.providers.retry import retry_with_backoff


def fetch_yfinance_history(ticker_jk, period, current=0.0, change_pct=0.0):
    def request_history():
        stock = yf.Ticker(ticker_jk)
        resolved_current = current
        resolved_change = change_pct
        if not resolved_current:
            resolved_current = stock.fast_info.last_price
            previous = stock.fast_info.previous_close
            if previous and previous != 0:
                resolved_change = ((resolved_current - previous) / previous) * 100

        hist = stock.history(period=period)
        history = []
        for date, row in hist.iterrows():
            history.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": row["Close"],
            })
        return resolved_current, resolved_change, history

    try:
        resolved_current, resolved_change, history = retry_with_backoff(request_history)
        record_provider_success("yfinance")
    except Exception as error:
        record_provider_failure("yfinance", error)
        raise
    if not history:
        return None

    return {
        "current": resolved_current or history[-1]["price"],
        "change_percent": resolved_change,
        "volume": 0,
        "open": 0.0,
        "high": 0.0,
        "low": 0.0,
        "previous_close": 0.0,
        "history": history,
        "data_source": "yfinance_fallback",
        "last_updated_at": utc_now_iso(),
    }


def fetch_yfinance_batch(tickers_str):
    try:
        data = retry_with_backoff(lambda: yf.Tickers(tickers_str))
        record_provider_success("yfinance")
        return data
    except Exception as error:
        record_provider_failure("yfinance", error)
        raise
