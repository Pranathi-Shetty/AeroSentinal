"""
AeroSentinal — APU Router
============================
Endpoints for APU health scoring.
"""

from fastapi import APIRouter, Query
from backend.app.models.schemas import APUPrediction
from backend.app.services.inference import APUService

router = APIRouter()


@router.get("/apu", response_model=APUPrediction)
async def predict_apu(
    fouling_factor: float = Query(0.0, ge=0, le=1, description="APU fouling factor (0-1)"),
):
    """
    Score APU health based on EGT deviation from fleet baseline.
    
    Uses Random Forest trained on physics-informed synthetic startup curves.
    """
    return APUService.predict(fouling_factor=fouling_factor)
