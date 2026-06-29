from datetime import datetime, timezone

from config import HISTORY_CACHE_TTL_SECONDS, UNAVAILABLE_TICKER_TTL_SECONDS


PRICE_CACHE = {}
HISTORY_CACHE = {}
UNAVAILABLE_TICKERS = {}
PROVIDER_STATUS = {
    "yahoo_chart": {
        "name": "Yahoo Chart API",
        "success_count": 0,
        "failure_count": 0,
        "last_success_at": None,
        "last_failure_at": None,
        "last_error": None,
    },
    "yfinance": {
        "name": "yfinance",
        "success_count": 0,
        "failure_count": 0,
        "last_success_at": None,
        "last_failure_at": None,
        "last_error": None,
    },
}
CACHE_STATUS = {
    "last_update_started_at": None,
    "last_update_completed_at": None,
    "last_error": None,
    "is_updating": False,
    "worker_running": False,
    "current_batch_start": None,
    "current_batch_end": None,
    "current_batch_size": 0,
    "current_ticker": None,
    "last_successful_ticker": None,
    "failed_tickers_count": 0,
}


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def is_history_cache_fresh(cache_entry):
    if not cache_entry:
        return False
    cached_at = cache_entry.get("cached_at")
    if not cached_at:
        return False
    age = (datetime.now(timezone.utc) - datetime.fromisoformat(cached_at)).total_seconds()
    return age < HISTORY_CACHE_TTL_SECONDS


def mark_ticker_unavailable(ticker, reason):
    failed_at = utc_now_iso()
    retry_after_dt = datetime.now(timezone.utc).timestamp() + UNAVAILABLE_TICKER_TTL_SECONDS
    UNAVAILABLE_TICKERS[ticker] = {
        "reason": str(reason),
        "failed_at": failed_at,
        "retry_after_ts": retry_after_dt,
        "retry_after": datetime.fromtimestamp(retry_after_dt, timezone.utc).isoformat(),
    }
    CACHE_STATUS["failed_tickers_count"] += 1


def is_ticker_unavailable(ticker):
    entry = UNAVAILABLE_TICKERS.get(ticker)
    if not entry:
        return False
    if datetime.now(timezone.utc).timestamp() >= entry.get("retry_after_ts", 0):
        UNAVAILABLE_TICKERS.pop(ticker, None)
        return False
    return True


def clear_unavailable_ticker(ticker):
    UNAVAILABLE_TICKERS.pop(ticker, None)

def record_provider_success(provider_key):
    provider = PROVIDER_STATUS[provider_key]
    provider["success_count"] += 1
    provider["last_success_at"] = utc_now_iso()
    provider["last_error"] = None

def record_provider_failure(provider_key, error):
    provider = PROVIDER_STATUS[provider_key]
    provider["failure_count"] += 1
    provider["last_failure_at"] = utc_now_iso()
    provider["last_error"] = str(error)
