import asyncio
import json
import math
import os
from typing import Optional

from fastapi import HTTPException

from cache import (
    CACHE_STATUS,
    HISTORY_CACHE,
    PRICE_CACHE,
    PROVIDER_STATUS,
    UNAVAILABLE_TICKERS,
    clear_unavailable_ticker,
    is_history_cache_fresh,
    is_ticker_unavailable,
    mark_ticker_unavailable,
    utc_now_iso,
)
from config import (
    HISTORY_CACHE_TTL_SECONDS,
    PRICE_BATCH_DELAY_SECONDS,
    PRICE_BATCH_SIZE,
    PRICE_REFRESH_INTERVAL_SECONDS,
    VALID_HISTORY_PERIODS,
)
from services.providers.yahoo_chart import fetch_yahoo_chart
from services.providers.yfinance_provider import fetch_yfinance_batch, fetch_yfinance_history
from services.sector_classifier import classify_sector
from services.technical_indicators import build_enriched_history, calculate_technical_indicators

STOCKS_DB = []
try:
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(current_dir, "idx_tickers.json")
    with open(json_path, "r", encoding="utf-8") as f:
        STOCKS_DB = json.load(f)
except Exception as e:
    print(f"Error loading tickers: {e}")
    STOCKS_DB = [
        {"ticker": "BBCA", "name": "Bank Central Asia Tbk"},
        {"ticker": "BBRI", "name": "Bank Rakyat Indonesia (Persero) Tbk"},
    ]


def build_stock_summary(stock):
    ticker_key = f"{stock['ticker']}.JK"
    sector, sector_source = classify_sector(stock)
    cache_data = PRICE_CACHE.get(ticker_key, {
        "last_price": 0.0,
        "change_percent": 0.0,
        "volume": 0,
    })

    return {
        "ticker": stock["ticker"],
        "name": stock["name"],
        "sector": sector,
        "sector_source": sector_source,
        "last_price": cache_data["last_price"],
        "change_percent": round(cache_data["change_percent"], 2),
        "volume": int(cache_data.get("volume", 0) or 0),
    }


def update_price_cache(ticker_key, current, change_pct, volume=0, previous_close=0.0):
    PRICE_CACHE[ticker_key] = {
        "last_price": current or 0.0,
        "change_percent": change_pct or 0.0,
        "volume": int(volume or 0),
        "prev_close": previous_close or 0.0,
    }
    CACHE_STATUS["last_successful_ticker"] = ticker_key
    clear_unavailable_ticker(ticker_key)


async def update_prices_background():
    await asyncio.sleep(1)
    print("Background price update task started.")
    batch_size = PRICE_BATCH_SIZE
    CACHE_STATUS["worker_running"] = True

    while True:
        try:
            CACHE_STATUS["is_updating"] = True
            CACHE_STATUS["last_update_started_at"] = utc_now_iso()
            total_stocks = len(STOCKS_DB)

            for start_index in range(0, total_stocks, batch_size):
                batch = STOCKS_DB[start_index:start_index + batch_size]
                tickers_with_suffix = [
                    f"{stock['ticker']}.JK"
                    for stock in batch
                    if not is_ticker_unavailable(f"{stock['ticker']}.JK")
                ]
                CACHE_STATUS["current_batch_start"] = start_index
                CACHE_STATUS["current_batch_end"] = min(start_index + batch_size, total_stocks)
                CACHE_STATUS["current_batch_size"] = len(tickers_with_suffix)

                if not tickers_with_suffix:
                    await asyncio.sleep(PRICE_BATCH_DELAY_SECONDS)
                    continue

                tickers_str = " ".join(tickers_with_suffix)

                try:
                    data = fetch_yfinance_batch(tickers_str)
                    for ticker_code in tickers_with_suffix:
                        CACHE_STATUS["current_ticker"] = ticker_code
                        try:
                            if ticker_code not in data.tickers:
                                mark_ticker_unavailable(ticker_code, "Ticker missing from yfinance batch")
                                continue

                            ticker_obj = data.tickers[ticker_code]
                            current = 0.0
                            previous = 0.0
                            volume = 0

                            try:
                                current = ticker_obj.fast_info.last_price
                                previous = ticker_obj.fast_info.previous_close
                                volume = ticker_obj.fast_info.last_volume
                            except Exception:
                                info = ticker_obj.info
                                current = info.get('currentPrice') or info.get('regularMarketPrice') or 0.0
                                previous = info.get('previousClose') or current
                                volume = info.get('volume') or 0

                            if not current:
                                mark_ticker_unavailable(ticker_code, "No current price")
                                continue

                            change_pct = ((current - previous) / previous) * 100 if previous else 0.0
                            update_price_cache(ticker_code, current, change_pct, volume, previous)
                        except Exception as inner_error:
                            mark_ticker_unavailable(ticker_code, inner_error)
                            continue
                except Exception as batch_error:
                    CACHE_STATUS["last_error"] = str(batch_error)
                    for ticker_code in tickers_with_suffix:
                        mark_ticker_unavailable(ticker_code, batch_error)
                    print(f"Error updating batch {start_index}: {batch_error}")

                await asyncio.sleep(PRICE_BATCH_DELAY_SECONDS)

            CACHE_STATUS["last_update_completed_at"] = utc_now_iso()
            CACHE_STATUS["last_error"] = None
            CACHE_STATUS["is_updating"] = False
            CACHE_STATUS["current_ticker"] = None
            print(f"Full update cycle completed. Cache size: {len(PRICE_CACHE)}")
            await asyncio.sleep(PRICE_REFRESH_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            CACHE_STATUS["worker_running"] = False
            CACHE_STATUS["is_updating"] = False
            raise
        except Exception as error:
            CACHE_STATUS["last_error"] = str(error)
            CACHE_STATUS["is_updating"] = False
            print(f"Fatal error in background task: {error}")
            await asyncio.sleep(5)


def get_health_data():
    total_stocks = len(STOCKS_DB)
    cached_stocks = len(PRICE_CACHE)
    coverage = (cached_stocks / total_stocks * 100) if total_stocks else 0

    return {
        "status": "ok" if CACHE_STATUS["last_error"] is None else "degraded",
        "total_stocks": total_stocks,
        "cached_stocks": cached_stocks,
        "cached_histories": len(HISTORY_CACHE),
        "history_cache_ttl_seconds": HISTORY_CACHE_TTL_SECONDS,
        "cache_coverage_percent": round(coverage, 2),
        "is_updating": CACHE_STATUS["is_updating"],
        "worker_running": CACHE_STATUS["worker_running"],
        "current_batch_start": CACHE_STATUS["current_batch_start"],
        "current_batch_end": CACHE_STATUS["current_batch_end"],
        "current_batch_size": CACHE_STATUS["current_batch_size"],
        "current_ticker": CACHE_STATUS["current_ticker"],
        "last_successful_ticker": CACHE_STATUS["last_successful_ticker"],
        "failed_tickers_count": CACHE_STATUS["failed_tickers_count"],
        "unavailable_tickers_count": len(UNAVAILABLE_TICKERS),
        "last_update_started_at": CACHE_STATUS["last_update_started_at"],
        "last_update_completed_at": CACHE_STATUS["last_update_completed_at"],
        "last_error": CACHE_STATUS["last_error"],
    }


def get_provider_diagnostics_data():
    providers = []
    for key, provider in PROVIDER_STATUS.items():
        if provider["last_error"]:
            status = "degraded"
        elif provider["last_success_at"]:
            status = "ok"
        else:
            status = "idle"

        providers.append({
            "key": key,
            "name": provider["name"],
            "status": status,
            "success_count": provider["success_count"],
            "failure_count": provider["failure_count"],
            "last_success_at": provider["last_success_at"],
            "last_failure_at": provider["last_failure_at"],
            "last_error": provider["last_error"],
        })

    unavailable_tickers = [
        {
            "ticker": ticker,
            "reason": data.get("reason"),
            "failed_at": data.get("failed_at"),
            "retry_after": data.get("retry_after"),
        }
        for ticker, data in UNAVAILABLE_TICKERS.items()
    ]

    return {
        "providers": providers,
        "unavailable_tickers": unavailable_tickers,
        "total_unavailable": len(unavailable_tickers),
    }
async def get_stocks_data(page: int = 1, limit: int = 10, search: Optional[str] = None):
    filtered_stocks = STOCKS_DB
    if search:
        search_lower = search.lower()
        filtered_stocks = [
            stock for stock in STOCKS_DB
            if search_lower in stock['ticker'].lower() or search_lower in stock['name'].lower()
        ]

    total = len(filtered_stocks)
    total_pages = math.ceil(total / limit)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_stocks = filtered_stocks[start_idx:end_idx]
    results = [build_stock_summary(stock) for stock in paginated_stocks]

    return {
        "data": results,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


def default_metrics():
    return {
        "open": 0.0,
        "high": 0.0,
        "low": 0.0,
        "previous_close": 0.0,
        "volume": 0,
    }


def cache_history(cache_key, current, change_pct, history_points, metrics, cached_at):
    HISTORY_CACHE[cache_key] = {
        "last_price": current,
        "change_percent": change_pct,
        "history": history_points,
        "metrics": metrics,
        "cached_at": cached_at,
    }


async def get_stock_detail_data(ticker: str, period: str = "1mo", force_refresh: bool = False):
    if period not in VALID_HISTORY_PERIODS:
        raise HTTPException(status_code=400, detail="Invalid period. Use one of: 5d, 1mo, 3mo, 6mo, 1y")

    stock_info = next((stock for stock in STOCKS_DB if stock["ticker"] == ticker.upper()), None)
    name = stock_info["name"] if stock_info else "Unknown Company"
    sector, sector_source = classify_sector(stock_info or {"ticker": ticker.upper(), "name": name})
    ticker_jk = f"{ticker.upper()}.JK"
    cache_key = f"{ticker_jk}:{period}"
    cached_history = HISTORY_CACHE.get(cache_key)
    current = 0.0
    change_pct = 0.0
    history_points = []
    data_source = "unavailable"
    last_updated_at = None
    detail_metrics = default_metrics()

    if not force_refresh and is_history_cache_fresh(cached_history):
        current = cached_history["last_price"]
        change_pct = cached_history["change_percent"]
        history_points = cached_history["history"]
        detail_metrics = cached_history.get("metrics", detail_metrics)
        data_source = "history_cache"
        last_updated_at = cached_history["cached_at"]
    else:
        try:
            chart_data = fetch_yahoo_chart(ticker_jk, period)
            if chart_data:
                current = chart_data["current"]
                change_pct = chart_data["change_percent"]
                history_points = chart_data["history"]
                data_source = chart_data["data_source"]
                last_updated_at = chart_data["last_updated_at"]
                detail_metrics = {
                    "open": chart_data["open"],
                    "high": chart_data["high"],
                    "low": chart_data["low"],
                    "previous_close": chart_data["previous_close"],
                    "volume": int(chart_data["volume"] or 0),
                }
                update_price_cache(ticker_jk, current, change_pct, chart_data["volume"], chart_data["previous_close"])
                cache_history(cache_key, current, change_pct, history_points, detail_metrics, last_updated_at)
        except Exception as error:
            mark_ticker_unavailable(ticker_jk, error)
            print(f"Warning: Yahoo chart API failed for {ticker}: {error}")

    if not history_points and cached_history:
        current = cached_history["last_price"]
        change_pct = cached_history["change_percent"]
        history_points = cached_history["history"]
        detail_metrics = cached_history.get("metrics", detail_metrics)
        data_source = "stale_history_cache"
        last_updated_at = cached_history["cached_at"]

    if not current and ticker_jk in PRICE_CACHE:
        cache = PRICE_CACHE[ticker_jk]
        current = cache.get("last_price", 0.0)
        change_pct = cache.get("change_percent", 0.0)
        detail_metrics["previous_close"] = cache.get("prev_close", 0.0)
        detail_metrics["volume"] = int(cache.get("volume", 0) or 0)
        if data_source == "unavailable":
            data_source = "price_cache"

    if not history_points:
        try:
            fallback_data = fetch_yfinance_history(ticker_jk, period, current, change_pct)
            if fallback_data:
                current = fallback_data["current"]
                change_pct = fallback_data["change_percent"]
                history_points = fallback_data["history"]
                data_source = fallback_data["data_source"]
                last_updated_at = fallback_data["last_updated_at"]
                cache_history(cache_key, current, change_pct, history_points, detail_metrics, last_updated_at)
        except Exception as error:
            mark_ticker_unavailable(ticker_jk, error)
            print(f"Warning: Failed to fetch history for {ticker}: {error}")

    technical_indicators = calculate_technical_indicators(history_points, current)
    enriched_history = build_enriched_history(history_points)

    return {
        "ticker": ticker.upper(),
        "name": name,
        "sector": sector,
        "sector_source": sector_source,
        "last_price": current if current else 0.0,
        "change_percent": round(change_pct, 2),
        "period": period,
        "data_source": data_source,
        "last_updated_at": last_updated_at,
        "open": detail_metrics["open"],
        "high": detail_metrics["high"],
        "low": detail_metrics["low"],
        "previous_close": detail_metrics["previous_close"],
        "volume": int(detail_metrics["volume"] or 0),
        "history": enriched_history,
        "technical_indicators": technical_indicators,
    }


def get_market_summary_data():
    summaries = []
    for ticker_key in PRICE_CACHE:
        if is_ticker_unavailable(ticker_key):
            continue
        ticker = ticker_key.replace(".JK", "")
        stock = next((item for item in STOCKS_DB if item["ticker"] == ticker), None)
        if not stock:
            continue
        summaries.append(build_stock_summary(stock))

    gainers = [stock for stock in summaries if stock["change_percent"] > 0]
    losers = [stock for stock in summaries if stock["change_percent"] < 0]
    unchanged = [stock for stock in summaries if stock["change_percent"] == 0]

    top_gainers = sorted(gainers, key=lambda stock: stock["change_percent"], reverse=True)[:5]
    top_losers = sorted(losers, key=lambda stock: stock["change_percent"])[:5]
    top_volume = sorted(summaries, key=lambda stock: stock["volume"], reverse=True)[:5]

    return {
        "total_cached": len(summaries),
        "gainers": len(gainers),
        "losers": len(losers),
        "unchanged": len(unchanged),
        "top_gainers": top_gainers,
        "top_losers": top_losers,
        "top_volume": top_volume,
    }

