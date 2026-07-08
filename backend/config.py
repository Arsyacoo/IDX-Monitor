import os


def parse_cors_origins(value):
    if not value or value.strip() == "*":
        return ["*"]
    return [origin.strip() for origin in value.split(",") if origin.strip()]


CORS_ORIGINS = parse_cors_origins(os.getenv("CORS_ORIGINS", "*"))
PRICE_BATCH_SIZE = int(os.getenv("PRICE_BATCH_SIZE", "50"))
PRICE_BATCH_DELAY_SECONDS = float(os.getenv("PRICE_BATCH_DELAY_SECONDS", "2"))
PRICE_REFRESH_INTERVAL_SECONDS = float(os.getenv("PRICE_REFRESH_INTERVAL_SECONDS", "60"))
HISTORY_CACHE_TTL_SECONDS = int(os.getenv("HISTORY_CACHE_TTL_SECONDS", "600"))
YAHOO_CHART_URL = os.getenv("YAHOO_CHART_URL", "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}")
VALID_HISTORY_PERIODS = {"5d", "1mo", "3mo", "6mo", "1y"}

UNAVAILABLE_TICKER_TTL_SECONDS = int(os.getenv("UNAVAILABLE_TICKER_TTL_SECONDS", "3600"))
EXTERNAL_REQUEST_RETRIES = int(os.getenv("EXTERNAL_REQUEST_RETRIES", "2"))
EXTERNAL_REQUEST_BACKOFF_SECONDS = float(os.getenv("EXTERNAL_REQUEST_BACKOFF_SECONDS", "1"))

# ---------- SQLite persistent cache ----------
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", os.path.join(os.path.dirname(__file__), "cache.db"))

# ---------- Rate limiting ----------
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "60"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

# ---------- News / RSS proxy ----------
NEWS_RSS_URL = os.getenv(
    "NEWS_RSS_URL",
    "https://news.google.com/rss/search?q=IDX+OR+IHSG+OR+%22Bursa+Efek+Indonesia%22&hl=id&gl=ID&ceid=ID:id",
)
NEWS_CACHE_TTL_SECONDS = int(os.getenv("NEWS_CACHE_TTL_SECONDS", "300"))
NEWS_MAX_ITEMS = int(os.getenv("NEWS_MAX_ITEMS", "20"))

# ---------- Logging ----------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = os.getenv("LOG_FORMAT", "json")  # "json" or "text"
