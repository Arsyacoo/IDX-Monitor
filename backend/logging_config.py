"""Structured logging configuration for the IDX Dashboard backend."""

import logging
import json
import sys
from datetime import datetime, timezone

from config import LOG_LEVEL, LOG_FORMAT


class JSONFormatter(logging.Formatter):
    """Emit log records as single-line JSON objects."""

    def format(self, record):
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)
        # Attach extra fields added via ``extra=`` keyword
        for key in ("ticker", "provider", "batch", "endpoint", "status_code", "duration_ms"):
            value = getattr(record, key, None)
            if value is not None:
                log_entry[key] = value
        return json.dumps(log_entry, default=str)


class TextFormatter(logging.Formatter):
    """Human-readable coloured formatter for local development."""

    FORMAT = "%(asctime)s | %(levelname)-8s | %(name)-24s | %(message)s"

    def __init__(self):
        super().__init__(self.FORMAT, datefmt="%Y-%m-%d %H:%M:%S")


def setup_logging():
    """Configure the root logger and return a convenience ``getLogger`` alias."""
    root = logging.getLogger()

    # Avoid duplicate handlers when called more than once (e.g. tests)
    if root.handlers:
        return logging.getLogger

    root.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

    handler = logging.StreamHandler(sys.stdout)
    if LOG_FORMAT == "json":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(TextFormatter())

    root.addHandler(handler)

    # Quieten noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("yfinance").setLevel(logging.WARNING)

    return logging.getLogger


def get_logger(name: str) -> logging.Logger:
    """Return a named logger.  Call ``setup_logging()`` once at startup."""
    return logging.getLogger(name)
