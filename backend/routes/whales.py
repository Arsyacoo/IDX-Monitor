from typing import List

from fastapi import APIRouter

from models import WhaleAlert
from services.whale_detector import get_whale_alerts_data

router = APIRouter()


@router.get("/api/whale-alerts", response_model=List[WhaleAlert])
async def get_whale_alerts():
    return await get_whale_alerts_data()
