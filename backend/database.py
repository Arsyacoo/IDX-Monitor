"""SQLite persistent cache layer for history data.

Provides crash-resilient storage so that chart history survives server restarts
without needing to re-fetch everything from upstream providers.
"""

import json
import sqlite3
import threading
from datetime import datetime, timezone

from config import HISTORY_CACHE_TTL_SECONDS, SQLITE_DB_PATH
from logging_config import get_logger

logger = get_logger(__name__)

_local = threading.local()


_db_initialized = False
_db_lock = threading.Lock()


def _get_connection() -> sqlite3.Connection:
    """Return a thread-local SQLite connection (created on first call)."""
    global _db_initialized
    conn = getattr(_local, "conn", None)
    if conn is None:
        conn = sqlite3.connect(SQLITE_DB_PATH, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.row_factory = sqlite3.Row
        _local.conn = conn

    if not _db_initialized:
        with _db_lock:
            if not _db_initialized:
                _db_initialized = True
                try:
                    init_db()
                except Exception as e:
                    _db_initialized = False
                    logger.error(f"Failed to initialize database: {e}")
    return conn


def init_db():
    """Create the schema if it does not exist yet."""
    conn = _get_connection()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS history_cache (
            cache_key   TEXT PRIMARY KEY,
            last_price  REAL NOT NULL DEFAULT 0.0,
            change_pct  REAL NOT NULL DEFAULT 0.0,
            history     TEXT NOT NULL DEFAULT '[]',
            metrics     TEXT NOT NULL DEFAULT '{}',
            cached_at   TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS news_cache (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            link        TEXT NOT NULL UNIQUE,
            source      TEXT NOT NULL DEFAULT '',
            published   TEXT NOT NULL DEFAULT '',
            fetched_at  TEXT NOT NULL
        );
        """
    )
    conn.commit()

    # Column migrations for sentiment metadata
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(news_cache)")
    columns = [row["name"] for row in cursor.fetchall()]
    if "sentiment_score" not in columns:
        conn.execute("ALTER TABLE news_cache ADD COLUMN sentiment_score REAL DEFAULT 0.0")
        conn.execute("ALTER TABLE news_cache ADD COLUMN sentiment_label TEXT DEFAULT 'NEUTRAL'")
        conn.execute("ALTER TABLE news_cache ADD COLUMN associated_ticker TEXT DEFAULT ''")
        conn.commit()

    logger.info("SQLite database initialised", extra={"endpoint": SQLITE_DB_PATH})


# ── history helpers ──────────────────────────────────────────────────────────


def save_history(cache_key: str, last_price: float, change_pct: float,
                 history_points: list, metrics: dict, cached_at: str):
    """Upsert a history entry into SQLite."""
    conn = _get_connection()
    conn.execute(
        """
        INSERT INTO history_cache (cache_key, last_price, change_pct, history, metrics, cached_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(cache_key) DO UPDATE SET
            last_price = excluded.last_price,
            change_pct = excluded.change_pct,
            history    = excluded.history,
            metrics    = excluded.metrics,
            cached_at  = excluded.cached_at
        """,
        (cache_key, last_price, change_pct,
         json.dumps(history_points), json.dumps(metrics), cached_at),
    )
    conn.commit()


def load_history(cache_key: str):
    """Load a history entry from SQLite.  Returns ``None`` if missing."""
    conn = _get_connection()
    row = conn.execute(
        "SELECT last_price, change_pct, history, metrics, cached_at FROM history_cache WHERE cache_key = ?",
        (cache_key,),
    ).fetchone()
    if row is None:
        return None
    return {
        "last_price": row["last_price"],
        "change_percent": row["change_pct"],
        "history": json.loads(row["history"]),
        "metrics": json.loads(row["metrics"]),
        "cached_at": row["cached_at"],
    }


def is_db_history_fresh(entry) -> bool:
    """Check whether a loaded DB entry is still within the TTL."""
    if not entry:
        return False
    cached_at = entry.get("cached_at")
    if not cached_at:
        return False
    age = (datetime.now(timezone.utc) - datetime.fromisoformat(cached_at)).total_seconds()
    return age < HISTORY_CACHE_TTL_SECONDS


def load_all_histories() -> dict:
    """Bulk-load every history row into a dict keyed by ``cache_key``.

    Used at startup to warm the in-memory ``HISTORY_CACHE``.
    """
    conn = _get_connection()
    rows = conn.execute(
        "SELECT cache_key, last_price, change_pct, history, metrics, cached_at FROM history_cache"
    ).fetchall()
    result = {}
    for row in rows:
        result[row["cache_key"]] = {
            "last_price": row["last_price"],
            "change_percent": row["change_pct"],
            "history": json.loads(row["history"]),
            "metrics": json.loads(row["metrics"]),
            "cached_at": row["cached_at"],
        }
    return result


# ── news helpers ─────────────────────────────────────────────────────────────


def save_news_items(items: list):
    """Insert new RSS items with sentiment analysis, ignoring duplicates by link."""
    from services.sentiment import analyze_sentiment
    conn = _get_connection()
    now = datetime.now(timezone.utc).isoformat()
    for item in items:
        analysis = analyze_sentiment(item["title"])
        conn.execute(
            """
            INSERT OR IGNORE INTO news_cache (title, link, source, published, fetched_at, sentiment_score, sentiment_label, associated_ticker)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (item["title"], item["link"], item.get("source", ""),
             item.get("published", ""), now,
             analysis["score"], analysis["label"], analysis["ticker"]),
        )
    conn.commit()


def load_news_items(limit: int = 20) -> list:
    """Return the most recent ``limit`` news items with sentiment data."""
    conn = _get_connection()
    rows = conn.execute(
        """
        SELECT title, link, source, published, fetched_at, sentiment_score, sentiment_label, associated_ticker 
        FROM news_cache 
        ORDER BY id DESC LIMIT ?
        """,
        (limit,),
    ).fetchall()
    return [dict(row) for row in rows]


def get_ticker_sentiment(ticker: str) -> dict:
    """Aggregate sentiment metrics for a specific ticker based on news cache."""
    conn = _get_connection()
    rows = conn.execute(
        """
        SELECT sentiment_label, COUNT(*) as count 
        FROM news_cache 
        WHERE associated_ticker = ?
        GROUP BY sentiment_label
        """,
        (ticker.upper(),),
    ).fetchall()

    breakdown = {"positive": 0, "neutral": 0, "negative": 0}
    total = 0
    for row in rows:
        label = row["sentiment_label"].lower()
        if label in breakdown:
            breakdown[label] = row["count"]
            total += row["count"]

    pos = breakdown["positive"]
    neg = breakdown["negative"]
    if pos + neg == 0:
        score_percent = 50.0
        label = "NEUTRAL"
    else:
        score_percent = round((pos / (pos + neg)) * 100, 1)
        if score_percent > 60:
            label = "BULLISH"
        elif score_percent < 40:
            label = "BEARISH"
        else:
            label = "NEUTRAL"

    return {
        "score_percent": score_percent,
        "label": label,
        "total_articles": total,
        "breakdown": breakdown
    }



def close_db():
    """Close the thread-local connection if it exists."""
    conn = getattr(_local, "conn", None)
    if conn is not None:
        conn.close()
        _local.conn = None
