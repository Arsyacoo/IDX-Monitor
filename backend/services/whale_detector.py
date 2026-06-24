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


async def get_whale_alerts_data():
    scan_list = STOCKS_DB[:30]
    tickers_with_suffix = [f"{stock['ticker']}.JK" for stock in scan_list]
    tickers_str = " ".join(tickers_with_suffix)
    alerts = []

    try:
        data = yf.Tickers(tickers_str)
        tickers_dict = data.tickers

        for stock in scan_list:
            ticker_key = f"{stock['ticker']}.JK"
            if ticker_key not in tickers_dict:
                continue

            try:
                ticker_obj = tickers_dict[ticker_key]
                current_vol = ticker_obj.fast_info.last_volume
                avg_vol = ticker_obj.fast_info.three_month_average_volume
                last_price = ticker_obj.fast_info.last_price
                prev_close = ticker_obj.fast_info.previous_close

                alert = build_whale_alert(stock, last_price, prev_close, current_vol, avg_vol)
                if alert:
                    alerts.append(alert)
            except Exception:
                continue

        alerts.sort(key=lambda alert: alert["confidence_score"], reverse=True)
    except Exception as error:
        print(f"Error checking whales: {error}")

    return alerts
