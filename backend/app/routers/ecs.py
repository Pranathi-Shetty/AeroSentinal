"""
AeroSentinal — ECS Router
============================
Endpoints for Environmental Control System health and coupling analysis.
"""

from fastapi import APIRouter, Query
from backend.app.models.schemas import ECSPrediction
from backend.app.services.inference import ECSService

router = APIRouter()


@router.get("/ecs", response_model=ECSPrediction)
async def predict_ecs(
    fouling_pct: float = Query(0.0, ge=0, le=100, description="Heat exchanger fouling %"),
):
    """
    Assess ECS health and cross-domain coupling effects.
    
    Uses physics-informed reverse-Brayton-cycle thermodynamic model.
    Reports coupling effect on engine readings for fusion attribution.
    """
    return ECSService.predict(fouling_pct=fouling_pct)
