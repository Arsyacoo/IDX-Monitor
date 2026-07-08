import yfinance as yf

from cache import PRICE_CACHE
from services.market_data import STOCKS_DB


def classify_whale_signal(volume_ratio, change_percent):
    confidence_score = min(99, round((volume_ratio * 28) + max(change_percent, 0) * 4))

    if volume_ratio > 2.0:
        return "Major Accumulation", "Major Whale Accumulation", confidence_score, "Open in Chart"
    if volume_ratio > 1.5:
        return "Strong Buying", "Strong Buying Pressure", confidence_score, "Review Momentum"
    return "High Volume", "Unusual High Volume", confidence_score, "Inspect Volume"


def build_whale_alert(stock, last_price, prev_close, current_vol, avg_vol):
    if not avg_vol or avg_vol <= 0 or last_price <= prev_close:
        return None

    volume_ratio = current_vol / avg_vol
    if volume_ratio <= 1.2:
        return None

    change_percent = ((last_price - prev_close) / prev_close) * 100 if prev_close else 0
    category, signal, confidence_score, action_label = classify_whale_signal(volume_ratio, change_percent)

    return {
        "ticker": stock["ticker"],
        "name": stock["name"],
        "price": last_price,
        "change_percent": round(change_percent, 2),
        "volume": int(current_vol or 0),
        "avg_volume": round(avg_vol),
        "volume_ratio": round(volume_ratio, 2),
        "signal": signal,
        "category": category,
        "confidence_score": confidence_score,
        "action_label": action_label,
    }


import threading
import asyncio

WHALE_ALERTS_CACHE = []
WHALE_ALERTS_LOCK = threading.Lock()


async def get_whale_alerts_data():
    """Return the cached whale alerts instantly."""
    with WHALE_ALERTS_LOCK:
        return list(WHALE_ALERTS_CACHE)


async def update_whale_alerts_background():
    """Background worker to periodically scan the entire IDX market for whale alerts."""
    await asyncio.sleep(5)  # Wait for price updates to start
    print("Background whale detection task started.")

    while True:
        try:
            total_stocks = len(STOCKS_DB)
            batch_size = 20  # Safe batch size to avoid rate limiting
            temp_alerts = []

            for start_index in range(0, total_stocks, batch_size):
                batch = STOCKS_DB[start_index:start_index + batch_size]
                tickers_with_suffix = [f"{stock['ticker']}.JK" for stock in batch]
                tickers_str = " ".join(tickers_with_suffix)

                try:
                    data = yf.Tickers(tickers_str)
                    tickers_dict = data.tickers

                    for stock in batch:
                        ticker_key = f"{stock['ticker']}.JK"
                        if ticker_key not in tickers_dict:
                            continue

                        try:
                            ticker_obj = tickers_dict[ticker_key]
                            current_vol = 0
                            avg_vol = 0
                            last_price = 0.0
                            prev_close = 0.0

                            try:
                                current_vol = ticker_obj.fast_info.last_volume
                                avg_vol = ticker_obj.fast_info.three_month_average_volume
                                last_price = ticker_obj.fast_info.last_price
                                prev_close = ticker_obj.fast_info.previous_close
                            except Exception:
                                info = ticker_obj.info
                                current_vol = info.get("volume") or 0
                                avg_vol = info.get("averageVolume") or info.get("averageVolume10days") or 0
                                last_price = info.get("currentPrice") or info.get("regularMarketPrice") or 0.0
                                prev_close = info.get("previousClose") or last_price

                            alert = build_whale_alert(stock, last_price, prev_close, current_vol, avg_vol)
                            if alert:
                                temp_alerts.append(alert)
                        except Exception:
                            continue
                except Exception as batch_error:
                    print(f"Error scanning batch {start_index} in whale detector: {batch_error}")

                # Yield control and sleep between batches to avoid rate limits
                await asyncio.sleep(3)

            # Sort and update cache
            temp_alerts.sort(key=lambda alert: alert["confidence_score"], reverse=True)
            with WHALE_ALERTS_LOCK:
                global WHALE_ALERTS_CACHE
                WHALE_ALERTS_CACHE = temp_alerts
            print(f"Whale detection cycle completed. Cached alerts: {len(WHALE_ALERTS_CACHE)}")

            # Update every 10 minutes
            await asyncio.sleep(600)

        except asyncio.CancelledError:
            print("Background whale detection task cancelled.")
            raise
        except Exception as error:
            print(f"Fatal error in whale detector background task: {error}")
            await asyncio.sleep(10)

