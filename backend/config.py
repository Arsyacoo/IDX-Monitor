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
