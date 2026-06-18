"""
AeroSentinal — Engine Router
==============================
Endpoints for turbofan engine RUL prediction.
"""

from fastapi import APIRouter, Query
from backend.app.models.schemas import EnginePrediction, EngineInput
from backend.app.services.inference import EngineService

router = APIRouter()


@router.post("/engine", response_model=EnginePrediction)
async def predict_engine(request: EngineInput):
    """
    Predict Remaining Useful Life for a turbofan engine unit.
    
    Uses BiLSTM+Attention model trained on NASA C-MAPSS dataset.
    Currently returns physics-informed simulation (is_synthetic_data=True)
    until the ONNX model is deployed.
    """
    return EngineService.predict(
        unit_id=request.unit_id,
        cycle=request.cycle,
        sensors=request.sensors,
        operating_condition=request.operating_condition,
    )


@router.get("/engine/quick", response_model=EnginePrediction)
async def quick_engine_prediction(
    unit_id: int = Query(1, description="Engine unit ID"),
    cycle: int = Query(100, description="Current operating cycle"),
):
    """Quick engine prediction with default sensor values."""
    return EngineService.predict(unit_id=unit_id, cycle=cycle, sensors={})
