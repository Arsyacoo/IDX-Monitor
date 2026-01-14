import yfinance as yf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import random

app = FastAPI(title="IDX Stock Dashboard API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock database of popular IDX stocks for demonstration
# In a real app, this would come from a database or a comprehensive screenings endpoint
import json
import os
import math

# Load tickers from JSON
STOCKS_DB = []
try:
    with open("idx_tickers.json", "r", encoding="utf-8") as f:
        STOCKS_DB = json.load(f)
except Exception as e:
    print(f"Error loading tickers: {e}")
    # Fallback if file missing
    STOCKS_DB = [
        {"ticker": "BBCA", "name": "Bank Central Asia Tbk"},
        {"ticker": "BBRI", "name": "Bank Rakyat Indonesia (Persero) Tbk"},
    ]

class StockSummary(BaseModel):
    ticker: str
    name: str
    last_price: float
    change_percent: float

class StockListResponse(BaseModel):
    data: List[StockSummary]
    total: int
    page: int
    limit: int
    total_pages: int

class StockHistoryPoint(BaseModel):
    date: str
    price: float

class StockDetail(BaseModel):
    ticker: str
    name: str
    last_price: float
    change_percent: float
    history: List[StockHistoryPoint]

@app.get("/api/stocks", response_model=StockListResponse)
async def get_stocks(page: int = 1, limit: int = 10, search: Optional[str] = None):
    """
    Get a paginated list of stocks with real-time data.
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
    
    results = []
    
    if paginated_stocks:
        # yfinance allows fetching multiple tickers at once string
        # Limit batch size to avoid timeouts if user requests huge page
        tickers_with_suffix = [f"{s['ticker']}.JK" for s in paginated_stocks]
        tickers_str = " ".join(tickers_with_suffix)
        
        try:
            # Batch fetch for performance
            data = yf.Tickers(tickers_str)
            
            # yfinance .tickers returns a dict-like object
            # accessing it safely
            tickers_dict = data.tickers
            
            for stock in paginated_stocks:
                ticker_key = f"{stock['ticker']}.JK"
                try:
                    info = {}
                    current = 0.0
                    change_pct = 0.0
                    
                    if ticker_key in tickers_dict:
                        ticker_obj = tickers_dict[ticker_key]
                        # Try fast_info first (faster/more reliable for price)
                        try:
                             current = ticker_obj.fast_info.last_price
                             previous = ticker_obj.fast_info.previous_close
                             if previous and previous != 0:
                                 change_pct = ((current - previous) / previous) * 100
                        except:
                            # Fallback to full info
                            info = ticker_obj.info
                            current = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose') or 0.0
                            previous = info.get('previousClose') or current
                            if previous and previous != 0:
                                change_pct = ((current - previous) / previous) * 100

                    results.append({
                        "ticker": stock['ticker'],
                        "name": stock['name'],
                        "last_price": current if current else 0.0,
                        "change_percent": round(change_pct, 2)
                    })
                except Exception as e:
                    print(f"Error processing {ticker_key}: {e}")
                    results.append({
                        "ticker": stock['ticker'],
                        "name": stock['name'],
                        "last_price": 0.0,
                        "change_percent": 0.0
                    })
        except Exception as e:
             # Fallback: if batch fails, return list with 0 prices
             for stock in paginated_stocks:
                results.append({
                    "ticker": stock['ticker'],
                    "name": stock['name'],
                    "last_price": 0.0,
                    "change_percent": 0.0
                })

    return {
        "data": results,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

@app.get("/api/stock/{ticker}", response_model=StockDetail)
async def get_stock_detail(ticker: str):
    """
    Get detailed historical data for a stock.
    """
    # Find name
    stock_info = next((s for s in STOCKS_DB if s["ticker"] == ticker.upper()), None)
    name = stock_info["name"] if stock_info else "Unknown Company"
    
    ticker_jk = f"{ticker.upper()}.JK"
    
    try:
        stock = yf.Ticker(ticker_jk)
        
        # Get history (1 month for the chart)
        hist = stock.history(period="1mo")
        
        # Get quote info
        info = stock.info
        current = info.get('currentPrice') or info.get('regularMarketPrice') or 0.0
        previous = info.get('previousClose') or current
        change_pct = ((current - previous) / previous) * 100 if previous else 0.0
        
        history_points = []
        for date, row in hist.iterrows():
            history_points.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": row['Close']
            })
            
        return {
            "ticker": ticker.upper(),
            "name": name,
            "last_price": current if current else 0.0,
            "change_percent": round(change_pct, 2),
            "history": history_points
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data for {ticker}: {str(e)}")

class WhaleAlert(BaseModel):
    ticker: str
    name: str
    price: float
    change_percent: float
    volume: int
    avg_volume: int
    volume_ratio: float
    signal: str # "Accumulation" or "Spike"

@app.get("/api/whale-alerts", response_model=List[WhaleAlert])
async def get_whale_alerts():
    """
    Detect potential 'Whale' activity by looking for abnormal volume spikes 
    combined with price action.
    """
    # We'll scan a subset of popular stocks for performance (Top 20-30 from DB)
    # Scanning all 900+ takes too long for a single request
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
                    
                    # We need volume stats
                    # fast_info is good for this
                    current_vol = t_obj.fast_info.last_volume
                    avg_vol = t_obj.fast_info.three_month_average_volume
                    last_price = t_obj.fast_info.last_price
                    prev_close = t_obj.fast_info.previous_close
                    
                    if avg_vol > 0:
                        vol_ratio = current_vol / avg_vol
                    else:
                        vol_ratio = 0
                        
                    # Logic: If Volume is > 1.2x Avg AND Price is UP, it might be Big Money buying
                    # Or just general high activity
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
                    
        # Sort by volume ratio descending (most unusual first)
        alerts.sort(key=lambda x: x['volume_ratio'], reverse=True)
        
    except Exception as e:
        print(f"Error checking whales: {e}")
        
    return alerts

# Add a simple health check
@app.get("/")
def read_root():
    return {"status": "ok", "message": "IDX Dashboard API is running"}
