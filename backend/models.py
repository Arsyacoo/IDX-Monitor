from pydantic import BaseModel
from typing import List, Optional


class HealthResponse(BaseModel):
    status: str
    total_stocks: int
    cached_stocks: int
    cached_histories: int
    history_cache_ttl_seconds: int
    cache_coverage_percent: float
    is_updating: bool
    last_update_started_at: Optional[str]
    last_update_completed_at: Optional[str]
    last_error: Optional[str]

class StockSummary(BaseModel):
    ticker: str
    name: str
    last_price: float
    change_percent: float
    volume: int

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
    period: str
    data_source: str
    last_updated_at: Optional[str]
    open: float
    high: float
    low: float
    previous_close: float
    volume: int
    history: List[StockHistoryPoint]




class WhaleAlert(BaseModel):
    ticker: str
    name: str
    price: float
    change_percent: float
    volume: int
    avg_volume: int
    volume_ratio: float
    signal: str
