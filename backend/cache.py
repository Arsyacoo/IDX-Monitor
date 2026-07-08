import threading
from datetime import datetime, timezone

from config import HISTORY_CACHE_TTL_SECONDS, UNAVAILABLE_TICKER_TTL_SECONDS
from logging_config import get_logger

logger = get_logger(__name__)


class ThreadSafeDict(dict):
    """A dictionary subclass that is thread-safe for mutations, reads, and iteration."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._lock = threading.Lock()

    def __getitem__(self, key):
        with self._lock:
            return super().__getitem__(key)

    def __setitem__(self, key, value):
        with self._lock:
            super().__setitem__(key, value)

    def __delitem__(self, key):
        with self._lock:
            super().__delitem__(key)

    def __contains__(self, key):
        with self._lock:
            return super().__contains__(key)

    def get(self, key, default=None):
        with self._lock:
            return super().get(key, default)

    def pop(self, key, default=None):
        with self._lock:
            return super().pop(key, default)

    def update(self, *args, **kwargs):
        with self._lock:
            super().update(*args, **kwargs)

    def clear(self):
        with self._lock:
            super().clear()

    def __len__(self):
        with self._lock:
            return super().__len__()
            
    def keys(self):
        with self._lock:
            return list(super().keys())
            
    def values(self):
        with self._lock:
            return list(super().values())
            
    def items(self):
        with self._lock:
            return list(super().items())
            
    def __iter__(self):
        with self._lock:
            return iter(list(super().keys()))


PRICE_CACHE = ThreadSafeDict()
HISTORY_CACHE = ThreadSafeDict()
UNAVAILABLE_TICKERS = ThreadSafeDict()

PROVIDER_STATUS = ThreadSafeDict({
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
})

CACHE_STATUS = ThreadSafeDict({
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
})



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
    logger.warning("Ticker marked unavailable", extra={"ticker": ticker})


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
    logger.debug("Provider success", extra={"provider": provider_key})

def record_provider_failure(provider_key, error):
    provider = PROVIDER_STATUS[provider_key]
    provider["failure_count"] += 1
    provider["last_failure_at"] = utc_now_iso()
    provider["last_error"] = str(error)
    logger.error("Provider failure", extra={"provider": provider_key})


def warm_history_cache_from_db():
    """Load persisted history entries from SQLite into the in-memory cache."""
    try:
        from database import load_all_histories
        persisted = load_all_histories()
        HISTORY_CACHE.update(persisted)
        logger.info(
            "Warmed in-memory history cache from SQLite",
            extra={"batch": len(persisted)},
        )
    except Exception as exc:
        logger.error("Failed to warm history cache from SQLite: %s", exc)
