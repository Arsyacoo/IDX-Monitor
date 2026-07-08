"""RSS news proxy endpoint for IDX-related market news."""

import time
from typing import List
from xml.etree import ElementTree

import requests
from fastapi import APIRouter

from config import NEWS_CACHE_TTL_SECONDS, NEWS_MAX_ITEMS, NEWS_RSS_URL
from database import load_news_items, save_news_items
from logging_config import get_logger
from models import NewsItem

logger = get_logger(__name__)

router = APIRouter()

# Simple in-memory timestamp to throttle RSS fetches
_last_fetch_ts: float = 0.0


def _parse_rss(xml_text: str) -> list:
    """Parse an RSS 2.0 XML string and return a list of item dicts."""
    items = []
    try:
        root = ElementTree.fromstring(xml_text)
        for item_el in root.iter("item"):
            title = (item_el.findtext("title") or "").strip()
            link = (item_el.findtext("link") or "").strip()
            source_el = item_el.find("source")
            source = (source_el.text or "").strip() if source_el is not None else ""
            pub_date = (item_el.findtext("pubDate") or "").strip()
            if title and link:
                items.append({
                    "title": title,
                    "link": link,
                    "source": source,
                    "published": pub_date,
                })
    except ElementTree.ParseError as exc:
        logger.error("Failed to parse RSS XML: %s", exc)
    return items


def fetch_and_cache_news() -> list:
    """Fetch RSS feed, persist to SQLite, and return items."""
    global _last_fetch_ts

    now = time.monotonic()
    if now - _last_fetch_ts < NEWS_CACHE_TTL_SECONDS:
        cached = load_news_items(limit=NEWS_MAX_ITEMS)
        if cached:
            return cached

    try:
        resp = requests.get(
            NEWS_RSS_URL,
            headers={"User-Agent": "IDX-Dashboard/1.0"},
            timeout=10,
        )
        resp.raise_for_status()
        items = _parse_rss(resp.text)[:NEWS_MAX_ITEMS]
        if items:
            save_news_items(items)
            _last_fetch_ts = now
            logger.info("Fetched %d news items from RSS", len(items))
        return items
    except Exception as exc:
        logger.error("RSS fetch failed: %s", exc)
        # Fall back to whatever is in the database
        return load_news_items(limit=NEWS_MAX_ITEMS)


@router.get("/api/news", response_model=List[NewsItem])
def get_news():
    """Return the latest IDX market news from the RSS proxy cache."""
    return fetch_and_cache_news()
