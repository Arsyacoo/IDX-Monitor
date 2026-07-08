from logging_config import setup_logging
# Initialize logging as the first step
setup_logging()

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import time
from fastapi import Request, status
from fastapi.responses import JSONResponse
from cache import HISTORY_CACHE, PRICE_CACHE, is_history_cache_fresh, utc_now_iso, warm_history_cache_from_db
from config import CORS_ORIGINS, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_SECONDS
from database import init_db
from routes.health import router as health_router
from routes.stocks import router as stocks_router
from routes.whales import router as whales_router
from routes.news import router as news_router
from services.market_data import build_stock_summary, update_prices_background
from services.whale_detector import update_whale_alerts_background

@asynccontextmanager
async def lifespan(app):
    # Initialize database schema and cache
    init_db()
    warm_history_cache_from_db()
    
    price_update_task = asyncio.create_task(update_prices_background())
    whale_update_task = asyncio.create_task(update_whale_alerts_background())
    try:
        yield
    finally:
        price_update_task.cancel()
        whale_update_task.cancel()
        try:
            await asyncio.gather(price_update_task, whale_update_task, return_exceptions=True)
        except Exception:
            pass


app = FastAPI(title="IDX Stock Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory rate limiting state
RATE_LIMIT_STORE = {}

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    if client_ip not in RATE_LIMIT_STORE:
        RATE_LIMIT_STORE[client_ip] = []
        
    # Keep only timestamps within the sliding window
    RATE_LIMIT_STORE[client_ip] = [t for t in RATE_LIMIT_STORE[client_ip] if now - t < RATE_LIMIT_WINDOW_SECONDS]
    
    if len(RATE_LIMIT_STORE[client_ip]) >= RATE_LIMIT_REQUESTS:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Too many requests. Please try again later."}
        )
        
    RATE_LIMIT_STORE[client_ip].append(now)
    return await call_next(request)

app.include_router(health_router)
app.include_router(stocks_router)
app.include_router(whales_router)
app.include_router(news_router)

