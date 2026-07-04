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
    worker_running: bool
    current_batch_start: Optional[int]
    current_batch_end: Optional[int]
    current_batch_size: int
    current_ticker: Optional[str]
    last_successful_ticker: Optional[str]
    failed_tickers_count: int
    unavailable_tickers_count: int
    last_update_started_at: Optional[str]
    last_update_completed_at: Optional[str]
    last_error: Optional[str]

class ProviderStatus(BaseModel):
    key: str
    name: str
    status: str
    success_count: int
    failure_count: int
    last_success_at: Optional[str]
    last_failure_at: Optional[str]
    last_error: Optional[str]

class ProviderDiagnosticsResponse(BaseModel):
    providers: List[ProviderStatus]
    unavailable_tickers: List[dict]
    total_unavailable: int

class StockSummary(BaseModel):
    ticker: str
    name: str
    sector: str
    sector_source: str
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
    ma20: Optional[float] = None
    ma50: Optional[float] = None

class TechnicalIndicators(BaseModel):
    ma20: Optional[float]
    ma50: Optional[float]
    rsi14: Optional[float]
    trend_label: str
    period_points: int

class StockDetail(BaseModel):
    ticker: str
    name: str
    sector: str
    sector_source: str
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
    technical_indicators: TechnicalIndicators




class WhaleAlert(BaseModel):
    ticker: str
    name: str
    price: float
    change_percent: float
    volume: int
    avg_volume: int
    volume_ratio: float
    signal: str
    category: str
    confidence_score: int
    action_label: str


class MarketSummaryResponse(BaseModel):
    total_cached: int
    gainers: int
    losers: int
    unchanged: int
    top_gainers: List[StockSummary]
    top_losers: List[StockSummary]
    top_volume: List[StockSummary]
