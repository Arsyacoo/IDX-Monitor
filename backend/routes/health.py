from fastapi import APIRouter

from models import HealthResponse
from services.market_data import get_health_data

router = APIRouter()


@router.get("/api/health", response_model=HealthResponse)
def get_health():
    return get_health_data()


@router.get("/")
def read_root():
    return {"status": "ok", "message": "IDX Dashboard API is running"}
