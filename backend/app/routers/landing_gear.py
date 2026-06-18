"""
AeroSentinal — Landing Gear Router
=====================================
Endpoints for landing gear brake wear prediction.
"""

from fastapi import APIRouter, Query
from backend.app.models.schemas import LandingGearPrediction
from backend.app.services.inference import LandingGearService

router = APIRouter()


@router.get("/landing-gear", response_model=LandingGearPrediction)
async def predict_landing_gear(
    brake_wear_pct: float = Query(10.0, ge=0, le=100, description="Current brake wear %"),
):
    """
    Predict landing gear brake wear severity.
    
    Uses XGBoost classifier trained on physics-informed synthetic data.
    """
    return LandingGearService.predict(brake_wear_pct=brake_wear_pct)
