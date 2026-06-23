import asyncio
import json
import math
import os
from datetime import datetime, timezone
from typing import Optional

import requests
import yfinance as yf
from fastapi import HTTPException

from cache import CACHE_STATUS, HISTORY_CACHE, PRICE_CACHE, is_history_cache_fresh, utc_now_iso
from config import (
    HISTORY_CACHE_TTL_SECONDS,
    PRICE_BATCH_DELAY_SECONDS,
    PRICE_BATCH_SIZE,
    PRICE_REFRESH_INTERVAL_SECONDS,
    VALID_HISTORY_PERIODS,
    YAHOO_CHART_URL,
)

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

def fetch_yahoo_chart(ticker_jk, period):
    response = requests.get(
        YAHOO_CHART_URL.format(ticker=ticker_jk),
        params={"range": period, "interval": "1d"},
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()
    result = payload.get("chart", {}).get("result") or []
    if not result:
        return None

    chart = result[0]
    meta = chart.get("meta", {})
    timestamps = chart.get("timestamp") or []
    quote = (chart.get("indicators", {}).get("quote") or [{}])[0]
    closes = quote.get("close") or []
    volumes = quote.get("volume") or []

    history = []
    for timestamp, close in zip(timestamps, closes):
        if close is None:
            continue
        history.append({
            "date": datetime.fromtimestamp(timestamp, timezone.utc).astimezone().strftime("%Y-%m-%d"),
            "price": close,
        })

    current = meta.get("regularMarketPrice") or (history[-1]["price"] if history else 0.0)
    previous = meta.get("chartPreviousClose") or meta.get("previousClose") or current
    change_pct = ((current - previous) / previous * 100) if previous else 0.0

    return {
        "current": current or 0.0,
        "change_percent": change_pct,
        "volume": meta.get("regularMarketVolume") or (volumes[-1] if volumes else 0),
        "open": meta.get("regularMarketOpen") or 0.0,
        "high": meta.get("regularMarketDayHigh") or 0.0,
        "low": meta.get("regularMarketDayLow") or 0.0,
        "previous_close": previous or 0.0,
        "history": history,
        "data_source": "yahoo_chart",
        "last_updated_at": utc_now_iso(),
    }

def build_stock_summary(stock):
    ticker_key = f"{stock['ticker']}.JK"
    cache_data = PRICE_CACHE.get(ticker_key, {
        "last_price": 0.0,
        "change_percent": 0.0,
        "volume": 0,
    })

    return {
        "ticker": stock["ticker"],
        "name": stock["name"],
        "last_price": cache_data["last_price"],
        "change_percent": round(cache_data["change_percent"], 2),
        "volume": int(cache_data.get("volume", 0) or 0),
    }


async def update_prices_background():
    """
    Background task to continuously update stock prices in batches.
    This avoids blocking the search endpoint with slow API calls.
    """
    print("Background price update task started.")
    batch_size = PRICE_BATCH_SIZE
    while True:
        try:
            CACHE_STATUS["is_updating"] = True
            CACHE_STATUS["last_update_started_at"] = utc_now_iso()
            total_stocks = len(STOCKS_DB)
            for i in range(0, total_stocks, batch_size):
                batch = STOCKS_DB[i:i+batch_size]
                tickers_with_suffix = [f"{s['ticker']}.JK" for s in batch]
                tickers_str = " ".join(tickers_with_suffix)
                
                try:
                    # Fetch batch data
                    data = yf.Tickers(tickers_str)
                    
                    # Process each ticker in the batch
                    for ticker_code in tickers_with_suffix:
                        try:
                            # Note: yfinance access patterns can be tricky.
                            # accessing .tickers[ticker_code] is usually safe if fetched in batch
                            if ticker_code in data.tickers:
                                t_obj = data.tickers[ticker_code]
                                
                                # Prefer fast_info for speed
                                current = 0.0
                                previous = 0.0
                                volume = 0
                                
                                try:
                                    current = t_obj.fast_info.last_price
                                    previous = t_obj.fast_info.previous_close
                                    volume = t_obj.fast_info.last_volume
                                except:
                                    # Fallback
                                    info = t_obj.info
                                    current = info.get('currentPrice') or info.get('regularMarketPrice') or 0.0
                                    previous = info.get('previousClose') or current
                                    volume = info.get('volume') or 0
                                
                                change_pct = 0.0
                                if previous and previous != 0:
                                    change_pct = ((current - previous) / previous) * 100
                                
                                # Update Cache
                                PRICE_CACHE[ticker_code] = {
                                    "last_price": current,
                                    "change_percent": change_pct,
                                    "volume": volume,
                                    "prev_close": previous
                                }
                        except Exception as inner_e:
                            # Skip individual ticker errors
                            continue
                            
                except Exception as batch_e:
                    CACHE_STATUS["last_error"] = str(batch_e)
                    print(f"Error updating batch {i}: {batch_e}")
                
                # Sleep longer between batches to avoid rate limits
                await asyncio.sleep(PRICE_BATCH_DELAY_SECONDS)
            
            # Sleep longer after a full cycle
            CACHE_STATUS["last_update_completed_at"] = utc_now_iso()
            CACHE_STATUS["last_error"] = None
            CACHE_STATUS["is_updating"] = False
            print(f"Full update cycle completed. Cache size: {len(PRICE_CACHE)}")
            await asyncio.sleep(PRICE_REFRESH_INTERVAL_SECONDS) 
            
        except Exception as e:
            CACHE_STATUS["last_error"] = str(e)
            CACHE_STATUS["is_updating"] = False
            print(f"Fatal error in background task: {e}")
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
        "last_update_started_at": CACHE_STATUS["last_update_started_at"],
        "last_update_completed_at": CACHE_STATUS["last_update_completed_at"],
        "last_error": CACHE_STATUS["last_error"],
    }


async def get_stocks_data(page: int = 1, limit: int = 10, search: Optional[str] = None):
    """
    Get a paginated list of stocks using CACHED data for instant response.
    """
    # Filter by search
    filtered_stocks = STOCKS_DB
    if search:
        search_lower = search.lower()
        filtered_stocks = [
            s for s in STOCKS_DB 
            if search_lower in s['ticker'].lower() or search_lower in s['name'].lower()
        ]
    
    total = len(filtered_stocks)
    total_pages = math.ceil(total / limit)
    
    # Pagination slicing
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_stocks = filtered_stocks[start_idx:end_idx]
    
    results = [build_stock_summary(stock) for stock in paginated_stocks]

    return {
        "data": results,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }


async def get_stock_detail_data(ticker: str, period: str = "1mo"):
    """
    Get detailed historical data for a stock.
    """
    if period not in VALID_HISTORY_PERIODS:
        raise HTTPException(status_code=400, detail="Invalid period. Use one of: 5d, 1mo, 3mo, 6mo, 1y")
    # Find name
    stock_info = next((s for s in STOCKS_DB if s["ticker"] == ticker.upper()), None)
    name = stock_info["name"] if stock_info else "Unknown Company"
    
    ticker_jk = f"{ticker.upper()}.JK"
    
    cache_key = f"{ticker_jk}:{period}"
    cached_history = HISTORY_CACHE.get(cache_key)
    current = 0.0
    change_pct = 0.0
    history_points = []
    data_source = "unavailable"
    last_updated_at = None
    detail_metrics = {
        "open": 0.0,
        "high": 0.0,
        "low": 0.0,
        "previous_close": 0.0,
        "volume": 0,
    }

    if is_history_cache_fresh(cached_history):
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
                PRICE_CACHE[ticker_jk] = {
                    "last_price": current,
                    "change_percent": change_pct,
                    "volume": chart_data["volume"],
                    "prev_close": chart_data["previous_close"],
                }
                HISTORY_CACHE[cache_key] = {
                    "last_price": current,
                    "change_percent": change_pct,
                    "history": history_points,
                    "metrics": detail_metrics,
                    "cached_at": last_updated_at,
                }
        except Exception as e:
            print(f"Warning: Yahoo chart API failed for {ticker}: {e}")

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
            stock = yf.Ticker(ticker_jk)
            if not current:
                current = stock.fast_info.last_price
                prev = stock.fast_info.previous_close
                if prev and prev != 0:
                    change_pct = ((current - prev) / prev) * 100

            hist = stock.history(period=period)
            for date, row in hist.iterrows():
                history_points.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "price": row['Close']
                })
            if history_points:
                data_source = "yfinance_fallback"
                last_updated_at = utc_now_iso()
                if not current and history_points:
                    current = history_points[-1]["price"]
                HISTORY_CACHE[cache_key] = {
                    "last_price": current,
                    "change_percent": change_pct,
                    "history": history_points,
                    "metrics": detail_metrics,
                    "cached_at": last_updated_at,
                }
        except Exception as e:
            print(f"Warning: Failed to fetch history for {ticker}: {e}")

    return {
        "ticker": ticker.upper(),
        "name": name,
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
        "history": history_points
    }



def get_market_summary_data():
    summaries = []
    for ticker_key, cache_data in PRICE_CACHE.items():
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
