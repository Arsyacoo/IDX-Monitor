import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cache import HISTORY_CACHE, PRICE_CACHE, is_history_cache_fresh, utc_now_iso
from config import CORS_ORIGINS
from routes.health import router as health_router
from routes.stocks import router as stocks_router
from routes.whales import router as whales_router
from services.market_data import build_stock_summary, update_prices_background

@asynccontextmanager
async def lifespan(app):
    price_update_task = asyncio.create_task(update_prices_background())
    try:
        yield
    finally:
        price_update_task.cancel()
        try:
            await price_update_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="IDX Stock Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(stocks_router)
app.include_router(whales_router)
