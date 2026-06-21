from datetime import datetime, timezone

from config import HISTORY_CACHE_TTL_SECONDS


PRICE_CACHE = {}
HISTORY_CACHE = {}
CACHE_STATUS = {
    "last_update_started_at": None,
    "last_update_completed_at": None,
    "last_error": None,
    "is_updating": False,
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
