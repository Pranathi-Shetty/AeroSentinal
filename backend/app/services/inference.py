"""
AeroSentinal — Inference Service Layer
========================================
Each subsystem has a service that wraps model inference.
Currently uses physics-informed simulation (clearly labeled as synthetic).
When ONNX models are trained, the `_predict_with_model()` methods will
load from `ml/export/` and run via ONNX Runtime.

IMPORTANT: All responses carry `is_synthetic_data=True` until real models
are deployed. This is by design — never fabricate results.
"""

import math
import random
import time
from typing import Optional

from backend.app.models.schemas import (
    HealthStatus,
    EnginePrediction,
    HydraulicsPrediction,
    LandingGearPrediction,
    APUPrediction,
    ECSPrediction,
)


# ============================================================
# Engine Service (C-MAPSS BiLSTM+Attention)
# ============================================================

class EngineService:
    """
    Engine RUL prediction service.
    Currently: physics-informed degradation curve simulation.
    Target: ONNX BiLSTM+Attention model trained on C-MAPSS FD001/FD004.
    """

    MODEL_LOADED = False  # Will flip to True when ONNX model is available

    # C-MAPSS FD001 has max ~362 cycles; use as reference
    MAX_CYCLES = 362

    @classmethod
    def predict(cls, unit_id: int, cycle: int, sensors: dict, operating_condition: int = 1) -> EnginePrediction:
        start = time.perf_counter()

        # Simulated RUL: linear degradation with noise
        # In real deployment, this calls ONNX Runtime
        rul_true_max = cls.MAX_CYCLES - cycle
        rul_predicted = max(0, rul_true_max + random.gauss(0, 8))

        # Health score: exponential decay as RUL approaches 0
        health = min(100, max(0, (rul_predicted / cls.MAX_CYCLES) * 100))

        # Status thresholds aligned with aviation standards
        if health >= 75:
            status = HealthStatus.HEALTHY
        elif health >= 40:
            status = HealthStatus.WARNING
        else:
            status = HealthStatus.CRITICAL

        # Simulated SHAP importances (top contributing sensors)
        top_features = {
            "T50": round(random.uniform(0.08, 0.15), 4),
            "T30": round(random.uniform(0.06, 0.12), 4),
            "phi": round(random.uniform(0.05, 0.10), 4),
            "NRc": round(random.uniform(0.04, 0.09), 4),
            "P30": round(random.uniform(0.03, 0.07), 4),
        }

        latency_ms = (time.perf_counter() - start) * 1000

        return EnginePrediction(
            unit_id=unit_id,
            predicted_rul=round(rul_predicted, 1),
            health_score=round(health, 1),
            status=status,
            confidence=round(random.uniform(0.82, 0.95), 3),
            top_features=top_features,
            is_synthetic_data=not cls.MODEL_LOADED,
        )


# ============================================================
# Hydraulics Service (UCI 1D Conv Autoencoder)
# ============================================================

class HydraulicsService:
    """
    Hydraulic system anomaly detection.
    Currently: rule-based simulation from UCI dataset structure.
    Target: ONNX 1D Conv Autoencoder trained on UCI nominal data.
    """

    MODEL_LOADED = False

    @classmethod
    def predict(cls, sensors: dict) -> HydraulicsPrediction:
        start = time.perf_counter()

        # Simulated reconstruction error
        # Nominal range: 0.001-0.01, Faulty: 0.05-0.5
        base_error = random.uniform(0.002, 0.008)
        anomaly_boost = 0

        # Check for injected faults via sensor readings
        ps1_mean = sensors.get("PS1", 100.0)
        if ps1_mean < 90:  # Pressure drop indicates fault
            anomaly_boost = random.uniform(0.05, 0.3)

        recon_error = base_error + anomaly_boost
        anomaly = recon_error > 0.02

        health = max(0, min(100, 100 - (recon_error * 200)))

        if health >= 75:
            status = HealthStatus.HEALTHY
        elif health >= 40:
            status = HealthStatus.WARNING
        else:
            status = HealthStatus.CRITICAL

        fault_probs = {
            "cooler": round(random.uniform(0, 0.1 if not anomaly else 0.6), 3),
            "valve": round(random.uniform(0, 0.05 if not anomaly else 0.4), 3),
            "pump": round(random.uniform(0, 0.05 if not anomaly else 0.3), 3),
            "accumulator": round(random.uniform(0, 0.05 if not anomaly else 0.2), 3),
        }

        return HydraulicsPrediction(
            health_score=round(health, 1),
            status=status,
            reconstruction_error=round(recon_error, 6),
            anomaly_detected=anomaly,
            fault_probabilities=fault_probs,
            is_synthetic_data=not cls.MODEL_LOADED,
        )


# ============================================================
# Landing Gear Service (XGBoost Classifier)
# ============================================================

class LandingGearService:
    """
    Landing gear brake wear classification.
    Currently: physics-based brake energy model.
    Target: ONNX XGBoost classifier.
    """

    MODEL_LOADED = False

    @classmethod
    def predict(cls, brake_wear_pct: float = 0, sensors: Optional[dict] = None) -> LandingGearPrediction:
        start = time.perf_counter()

        # Use provided wear percentage or derive from sensors
        if sensors and "brake_temp" in sensors:
            wear = min(100, sensors["brake_temp"] / 5.0)
        else:
            wear = brake_wear_pct

        # Severity classification
        if wear < 25:
            severity = "nominal"
        elif wear < 50:
            severity = "moderate"
        elif wear < 75:
            severity = "severe"
        else:
            severity = "critical"

        health = max(0, 100 - wear)
        remaining = max(0, int((100 - wear) * 12))  # ~12 landings per % remaining

        if health >= 75:
            status = HealthStatus.HEALTHY
        elif health >= 40:
            status = HealthStatus.WARNING
        else:
            status = HealthStatus.CRITICAL

        return LandingGearPrediction(
            health_score=round(health, 1),
            status=status,
            wear_severity=severity,
            brake_wear_pct=round(wear, 1),
            remaining_landings=remaining,
            is_synthetic_data=not cls.MODEL_LOADED,
        )


# ============================================================
# APU Service (Random Forest)
# ============================================================

class APUService:
    """
    APU EGT health scoring.
    Currently: parametric EGT startup curve simulation.
    Target: ONNX Random Forest trained on synthetic APU data.
    """

    MODEL_LOADED = False

    # Fleet baseline EGT at stabilization (°C)
    FLEET_BASELINE_EGT = 620.0
    FLEET_STD_EGT = 15.0

    @classmethod
    def predict(cls, sensors: Optional[dict] = None, fouling_factor: float = 0) -> APUPrediction:
        start = time.perf_counter()

        # Simulate EGT with fouling
        baseline = cls.FLEET_BASELINE_EGT
        fouled_egt = baseline + (fouling_factor * 80)  # Up to +80°C with full fouling
        egt_margin = baseline + 50 - fouled_egt  # Margin to redline

        deviation = (fouled_egt - baseline) / cls.FLEET_STD_EGT

        health = max(0, min(100, 100 - (abs(deviation) * 15)))

        if health >= 75:
            status = HealthStatus.HEALTHY
        elif health >= 40:
            status = HealthStatus.WARNING
        else:
            status = HealthStatus.CRITICAL

        return APUPrediction(
            health_score=round(health, 1),
            status=status,
            egt_margin=round(egt_margin, 1),
            fleet_deviation_sigma=round(deviation, 2),
            is_synthetic_data=not cls.MODEL_LOADED,
        )


# ============================================================
# ECS Service (Reverse-Brayton Thermodynamic Simulator)
# ============================================================

class ECSService:
    """
    ECS health and cross-domain coupling attribution.
    Uses physics-informed reverse-Brayton-cycle model.
    This IS the production model for the prototype — it's inherently
    physics-based, not ML-based (by design per the roadmap).
    """

    # Thermodynamic constants
    T_AMBIENT = 220.0       # K, cruise altitude
    GAMMA = 1.4             # Air specific heat ratio
    PRESSURE_RATIO = 3.5    # Compressor pressure ratio
    NOMINAL_COP = 0.85      # Nominal coefficient of performance

    @classmethod
    def predict(cls, fouling_pct: float = 0) -> ECSPrediction:
        start = time.perf_counter()

        # Fouling reduces heat exchanger effectiveness
        effectiveness = max(0.1, 1.0 - (fouling_pct / 100.0) * 0.7)

        # Actual COP degrades with fouling
        actual_cop = cls.NOMINAL_COP * effectiveness

        # Delta-T masking: closed-loop control tries to maintain cabin temp
        # by increasing bleed air demand, hiding the degradation
        delta_t_masked = fouling_pct > 15  # Control system compensates below 15%

        # Bleed demand increases to compensate for reduced effectiveness
        bleed_demand_ratio = 1.0 / effectiveness
        bleed_anomaly = bleed_demand_ratio > 1.2

        # Coupling effect: excess bleed demand raises engine compressor load
        # This artificially depresses engine health readings by up to 15 points
        coupling_effect = min(15, max(0, (bleed_demand_ratio - 1.0) * 30))

        # ECS health score
        health = max(0, min(100, 100 - fouling_pct))

        if health >= 75:
            status = HealthStatus.HEALTHY
        elif health >= 40:
            status = HealthStatus.WARNING
        else:
            status = HealthStatus.CRITICAL

        return ECSPrediction(
            health_score=round(health, 1),
            status=status,
            fouling_pct=round(fouling_pct, 1),
            delta_t_masked=delta_t_masked,
            bleed_demand_anomaly=bleed_anomaly,
            coupling_effect_on_engine=round(coupling_effect, 1),
            is_synthetic_data=True,  # Always true — physics model by design
        )
