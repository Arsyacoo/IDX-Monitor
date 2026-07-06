from typing import Optional

from fastapi import APIRouter

from models import MarketSummaryResponse, StockDetail, StockListResponse
from services.market_data import get_market_summary_data, get_stock_detail_data, get_stocks_data

router = APIRouter()


@router.get("/api/stocks", response_model=StockListResponse)
async def get_stocks(page: int = 1, limit: int = 10, search: Optional[str] = None):
    return await get_stocks_data(page=page, limit=limit, search=search)


@router.get("/api/stock/{ticker}", response_model=StockDetail)
async def get_stock_detail(ticker: str, period: str = "1mo"):
    return await get_stock_detail_data(ticker=ticker, period=period)


@router.post("/api/stock/{ticker}/refresh", response_model=StockDetail)
async def refresh_stock_detail(ticker: str, period: str = "1mo"):
    return await get_stock_detail_data(ticker=ticker, period=period, force_refresh=True)


@router.get("/api/market-summary", response_model=MarketSummaryResponse)
def get_market_summary():
    return get_market_summary_data()
