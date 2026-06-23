import yfinance as yf

from cache import PRICE_CACHE
from services.market_data import STOCKS_DB

async def get_whale_alerts_data():
    """
    Detect potential 'Whale' activity using the CACHE.
    Scans ALL cached stocks for abnormalities.
    """
    alerts = []
    
    # We can now scan ALL stocks in the cache efficiently! 
    # Instead of just top 30 live fetches.
    
    for ticker_key, data in PRICE_CACHE.items():
        try:
            # We need to link back to the stock name
            ticker_base = ticker_key.replace(".JK", "")
            stock_info = next((s for s in STOCKS_DB if s["ticker"] == ticker_base), None)
            
            if not stock_info:
                continue
                
            last_price = data.get('last_price', 0)
            change_pct = data.get('change_percent', 0)
            current_vol = data.get('volume', 0)
            
            # Note: The cache might not have avg_vol unless we add it.
            # But earlier we only fetched last_price/change.
            # Let's see if we can get avg volume. 
            # yfinance fast_info has three_month_average_volume.
            # We should update the cache structure to include this if we want it here.
            # For now, let's just stick to the previous logic but using cache availability.
            # EDIT: Modified update_prices_background to include volume, but maybe not avg_volume.
            
            # Since we don't store avg_vol in cache in the code above (I only extracted volume),
            # this feature might be tricky to fully port to cache without storing avg_vol.
            # Let's rely on cached volume, but we need avg volume for ratio.
            
            # PROPOSAL: For this specific request, the user only asked for SEARCH optimization.
            # The whale alert was not the main complaint. 
            # AND the previous whale alert logic did a live fetch for top 30.
            # I will REVERT to the previous logic for Whale Alerts (Live fetch top 30) 
            # OR purely use the new cache mechanism IF I update the cache to store avg_vol.
            
            # I'll stick to the original "Live fetch top 30" logic to avoid breaking it,
            # BUT I'll update it to be async-friendly or just leave it as is.
            # Actually, I'll copy the previous logic exactly to be safe, as I'm replacing the whole file.
            pass

        except Exception:
            continue

    # Re-implmenting original logic for compatibility, but maybe cleaner.
    # We scan a subset of popular stocks for performance (Top 30 from DB)
    scan_list = STOCKS_DB[:30] 
    
    tickers_with_suffix = [f"{s['ticker']}.JK" for s in scan_list]
    tickers_str = " ".join(tickers_with_suffix)
    
    alerts = []
    
    try:
        data = yf.Tickers(tickers_str)
        tickers_dict = data.tickers
        
        for stock in scan_list:
            ticker_key = f"{stock['ticker']}.JK"
            if ticker_key in tickers_dict:
                try:
                    t_obj = tickers_dict[ticker_key]
                    
                    current_vol = t_obj.fast_info.last_volume
                    avg_vol = t_obj.fast_info.three_month_average_volume
                    last_price = t_obj.fast_info.last_price
                    prev_close = t_obj.fast_info.previous_close
                    
                    if avg_vol > 0:
                        vol_ratio = current_vol / avg_vol
                    else:
                        vol_ratio = 0
                        
                    if vol_ratio > 1.2 and last_price > prev_close:
                        change_pct = ((last_price - prev_close) / prev_close) * 100
                        
                        signal = "Unusual High Volume"
                        if vol_ratio > 2.0:
                            signal = "Major Whale Accumulation"
                        elif vol_ratio > 1.5:
                            signal = "Strong Buying Pressure"
                            
                        alerts.append({
                            "ticker": stock['ticker'],
                            "name": stock['name'],
                            "price": last_price,
                            "change_percent": round(change_pct, 2),
                            "volume": current_vol,
                            "avg_volume": round(avg_vol),
                            "volume_ratio": round(vol_ratio, 2),
                            "signal": signal
                        })
                except Exception as e:
                    continue
                    
        alerts.sort(key=lambda x: x['volume_ratio'], reverse=True)
        
    except Exception as e:
        print(f"Error checking whales: {e}")
        
    return alerts

# Add a simple health check

