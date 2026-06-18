"""
AeroSentinal — Fusion Router
================================
Full aircraft health assessment with cross-domain attribution,
ACARS alert compilation, and AOG risk scoring.
"""

from fastapi import APIRouter, Query
from backend.app.models.schemas import FusionResponse, ACARSMessage
from backend.app.services.fusion import FusionService, ACARSCompiler

router = APIRouter()


@router.get("/health", response_model=FusionResponse)
async def get_aircraft_health(
    aircraft_id: str = Query("N1234A", description="Aircraft tail number"),
    engine_cycle: int = Query(100, ge=0, description="Current engine cycle"),
    brake_wear_pct: float = Query(10.0, ge=0, le=100),
    apu_fouling: float = Query(0.0, ge=0, le=1),
    ecs_fouling: float = Query(0.0, ge=0, le=100),
):
    """
    Run all 5 subsystem models and produce a unified health assessment.
    
    Includes:
    - Per-subsystem health scores with status
    - Cross-domain coupling attribution (ECS→Engine)
    - ACARS 220-character compressed alert
    - AOG risk calculation ($150K/hr × P(failure))
    
    This is the primary endpoint consumed by the frontend dashboard.
    """
    return FusionService.run_full_assessment(
        aircraft_id=aircraft_id,
        engine_cycle=engine_cycle,
        brake_wear_pct=brake_wear_pct,
        apu_fouling=apu_fouling,
        ecs_fouling=ecs_fouling,
    )


@router.get("/acars", response_model=ACARSMessage)
async def get_acars_message(
    aircraft_id: str = Query("N1234A"),
    engine_cycle: int = Query(100, ge=0),
    ecs_fouling: float = Query(0.0, ge=0, le=100),
):
    """
    Generate an ACARS 220-character compressed alert for the aircraft.
    Shows before (full JSON) and after (220-char message) with compression ratio.
    """
    fusion = FusionService.run_full_assessment(
        aircraft_id=aircraft_id,
        engine_cycle=engine_cycle,
        ecs_fouling=ecs_fouling,
    )
    return ACARSCompiler.compile(fusion)
