"""
AeroSentinal — Pydantic Schemas
================================
All request/response models for the API.
Every response includes `is_synthetic_data` flag per the project's
honesty-first principle.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum
from datetime import datetime


# ============================================================
# Enums
# ============================================================

class HealthStatus(str, Enum):
    HEALTHY = "Healthy"
    WARNING = "Warning"
    CRITICAL = "Critical"


class SubsystemName(str, Enum):
    ENGINE = "engine"
    HYDRAULICS = "hydraulics"
    LANDING_GEAR = "landing_gear"
    APU = "apu"
    ECS = "ecs"


# ============================================================
# Subsystem Prediction Schemas
# ============================================================

class SensorInput(BaseModel):
    """Generic sensor input — an array of named float values."""
    sensors: dict[str, float] = Field(
        ...,
        description="Named sensor readings, e.g. {'T24': 641.82, 'T50': 1589.7}"
    )
    operating_condition: Optional[int] = Field(
        None,
        description="Operating condition index (C-MAPSS: 1-6)"
    )
    cycle: Optional[int] = Field(None, description="Current engine cycle number")


class EngineInput(BaseModel):
    """Engine-specific prediction request."""
    unit_id: int = Field(..., description="Engine unit identifier")
    cycle: int = Field(..., description="Current operating cycle")
    sensors: dict[str, float] = Field(
        ...,
        description="21 C-MAPSS sensor readings"
    )
    operating_condition: int = Field(1, description="Operating condition (1-6)")


class EnginePrediction(BaseModel):
    """Engine RUL prediction response."""
    subsystem: Literal["engine"] = "engine"
    unit_id: int
    predicted_rul: float = Field(..., description="Remaining Useful Life in cycles")
    health_score: float = Field(..., ge=0, le=100)
    status: HealthStatus
    confidence: float = Field(..., ge=0, le=1)
    top_features: dict[str, float] = Field(
        default_factory=dict,
        description="SHAP feature importances for this prediction"
    )
    model_type: str = "BiLSTM+Attention"
    is_synthetic_data: bool = True


class HydraulicsPrediction(BaseModel):
    """Hydraulics anomaly detection response."""
    subsystem: Literal["hydraulics"] = "hydraulics"
    health_score: float = Field(..., ge=0, le=100)
    status: HealthStatus
    reconstruction_error: float = Field(
        ..., description="Autoencoder reconstruction error (lower = healthier)"
    )
    anomaly_detected: bool
    fault_probabilities: dict[str, float] = Field(
        default_factory=dict,
        description="Per-component fault likelihood: cooler, valve, pump, accumulator"
    )
    model_type: str = "1D Conv Autoencoder"
    is_synthetic_data: bool = True


class LandingGearPrediction(BaseModel):
    """Landing gear brake wear prediction response."""
    subsystem: Literal["landing_gear"] = "landing_gear"
    health_score: float = Field(..., ge=0, le=100)
    status: HealthStatus
    wear_severity: Literal["nominal", "moderate", "severe", "critical"]
    brake_wear_pct: float = Field(..., ge=0, le=100)
    remaining_landings: int
    model_type: str = "XGBoost Classifier"
    is_synthetic_data: bool = True


class APUPrediction(BaseModel):
    """APU health scoring response."""
    subsystem: Literal["apu"] = "apu"
    health_score: float = Field(..., ge=0, le=100)
    status: HealthStatus
    egt_margin: float = Field(
        ..., description="Exhaust Gas Temperature margin above fleet baseline (°C)"
    )
    fleet_deviation_sigma: float = Field(
        ..., description="Standard deviations from fleet mean"
    )
    model_type: str = "Random Forest"
    is_synthetic_data: bool = True


class ECSPrediction(BaseModel):
    """ECS health and coupling attribution response."""
    subsystem: Literal["ecs"] = "ecs"
    health_score: float = Field(..., ge=0, le=100)
    status: HealthStatus
    fouling_pct: float = Field(
        ..., ge=0, le=100,
        description="Estimated heat exchanger fouling percentage"
    )
    delta_t_masked: bool = Field(
        ..., description="Whether closed-loop control is masking degradation"
    )
    bleed_demand_anomaly: bool = Field(
        ..., description="Elevated bleed air demand detected"
    )
    coupling_effect_on_engine: float = Field(
        ..., description="Estimated false engine health drop caused by ECS (points)"
    )
    model_type: str = "Physics-Informed Thermodynamic"
    is_synthetic_data: bool = True


# ============================================================
# Fusion Schemas
# ============================================================

class SubsystemSummary(BaseModel):
    """Compact health summary for one subsystem."""
    name: SubsystemName
    health_score: float
    status: HealthStatus
    anomaly_flag: bool = False
    rul_estimate: Optional[float] = None
    confidence: Optional[float] = None
    is_synthetic_data: bool = True


class FusionResponse(BaseModel):
    """Full aircraft health assessment from the fusion layer."""
    aircraft_id: str
    timestamp: datetime
    global_health_score: float = Field(..., ge=0, le=100)
    global_status: HealthStatus
    subsystems: list[SubsystemSummary]
    cross_domain_alerts: list[str] = Field(default_factory=list)
    acars_message: str = Field(
        ...,
        max_length=220,
        description="ACARS-formatted 220-char compressed alert"
    )
    aog_risk: "AOGRiskAssessment"
    is_synthetic_data: bool = True


# ============================================================
# ACARS & AOG Schemas
# ============================================================

class ACARSMessage(BaseModel):
    """ACARS 220-character compressed alert."""
    message: str = Field(..., max_length=220)
    original_json_bytes: int
    compressed_bytes: int
    compression_ratio: float


class AOGRiskAssessment(BaseModel):
    """Aircraft-on-Ground risk calculation."""
    probability_of_failure: float = Field(..., ge=0, le=1)
    estimated_grounding_hours: float
    cost_per_hour_usd: float = 150_000.0
    total_risk_usd: float
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    recommendation: str


# ============================================================
# Simulator Schemas
# ============================================================

class SimulatorInput(BaseModel):
    """What-if fault injection parameters."""
    ecs_fouling_pct: float = Field(0, ge=0, le=100)
    engine_degradation_cycles: int = Field(0, ge=0)
    hydraulic_leak_severity: float = Field(0, ge=0, le=1)
    brake_wear_pct: float = Field(0, ge=0, le=100)
    apu_fouling_factor: float = Field(0, ge=0, le=1)


class SimulatorResponse(BaseModel):
    """Simulator results with naive vs fusion comparison."""
    injected_faults: SimulatorInput
    naive_assessment: FusionResponse
    fusion_assessment: FusionResponse
    attribution_explanation: str
    is_synthetic_data: bool = True


# Resolve forward references
FusionResponse.model_rebuild()
