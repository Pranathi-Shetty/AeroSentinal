"""
AeroSentinal — Hydraulics Router
===================================
Endpoints for hydraulic system anomaly detection.
"""

from fastapi import APIRouter
from backend.app.models.schemas import HydraulicsPrediction, SensorInput
from backend.app.services.inference import HydraulicsService

router = APIRouter()


@router.post("/hydraulics", response_model=HydraulicsPrediction)
async def predict_hydraulics(request: SensorInput):
    """
    Detect anomalies in the hydraulic system.
    
    Uses 1D Conv Autoencoder trained on UCI Hydraulic nominal data.
    Currently returns simulation (is_synthetic_data=True).
    """
    return HydraulicsService.predict(sensors=request.sensors)


@router.get("/hydraulics/quick", response_model=HydraulicsPrediction)
async def quick_hydraulics():
    """Quick hydraulics prediction with default sensor values."""
    return HydraulicsService.predict(sensors={"PS1": 100.0})
