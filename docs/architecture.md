# AeroSentinal — System Architecture

## Overview

AeroSentinal is a holistic aircraft predictive maintenance platform that fuses predictions from five independently trained ML subsystem models into a unified aircraft health assessment.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 14)                         │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Dashboard │  │ Aircraft/[id]│  │ Simulator  │  │  NLP Panel   │  │
│  │  (Fleet)  │  │  (3D View)   │  │ (What-if)  │  │ (Retrieval)  │  │
│  └─────┬─────┘  └──────┬───────┘  └─────┬──────┘  └──────┬───────┘  │
└────────┼───────────────┼───────────────┼───────────────┼────────────┘
         │               │               │               │
         └───────────────┴───────────────┴───────────────┘
                                │
                          REST API / WebSocket
                                │
┌───────────────────────────────┴─────────────────────────────────────┐
│                     Backend (FastAPI)                                 │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    Fusion Orchestrator                        │    │
│  │  /fusion/aircraft/{id} → unified health JSON                 │    │
│  │  ACARS compiler (≤220 chars) + AOG cost scorer               │    │
│  └──────────┬───────┬───────┬───────┬───────┬──────────────────┘    │
│             │       │       │       │       │                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                      │
│  │Engine│ │Hydra │ │L.Gear│ │ APU  │ │ ECS  │  ← ONNX Runtime      │
│  │Router│ │Router│ │Router│ │Router│ │Router│    inference           │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘                      │
│     │        │        │        │        │                            │
│  ┌──┴───┐ ┌──┴───┐ ┌──┴───┐ ┌──┴───┐ ┌──┴──────────────────┐      │
│  │BiLSTM│ │Conv  │ │XGB   │ │ RF   │ │Brayton Sim          │      │
│  │+Attn │ │Auto  │ │Class │ │Health│ │+ Coupling + Attrib  │      │
│  │(ONNX)│ │(ONNX)│ │(ONNX)│ │      │ │                     │      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └─────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │   MLflow Tracking     │
                    │   (local, ./mlruns/)  │
                    └───────────────────────┘
```

## Data Flow

1. **Training** (offline): Each subsystem trains independently on its own dataset, logging metrics to MLflow
2. **Export**: Engine, Hydraulics, Landing Gear models exported to ONNX format
3. **Inference** (online): FastAPI loads ONNX models via onnxruntime; ECS runs its simulator directly
4. **Fusion**: `/fusion/aircraft/{id}` aggregates all 5 subsystem predictions into unified JSON
5. **ACARS**: Fusion JSON compressed to ≤220 character alert string
6. **AOG Cost**: `risk_score = P(failure) × $150k/hr × grounding_hours` from live outputs
7. **What-If**: Simulator endpoint accepts fault parameters, re-runs models live

## Cross-Domain Coupling (ECS ↔ Engine)

The centerpiece feature:

```
ECS Heat Exchanger Fouling ↑
    → Reduced cooling effectiveness
    → ECS controller demands more bleed air
    → Engine bleed port extraction increases
    → Compressor inlet temperature rises artificially
    → Engine-only model incorrectly flags "compressor degradation"
    
Fusion Attribution Layer:
    → Checks ECS health simultaneously
    → Detects ECS fouling as root cause
    → Correctly attributes temperature rise to ECS, not engine
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/predict/engine` | POST | Engine RUL prediction |
| `/predict/hydraulics` | POST | Hydraulics anomaly detection |
| `/predict/landing_gear` | POST | Landing gear fault classification |
| `/predict/apu` | POST | APU health scoring |
| `/predict/ecs` | POST | ECS health + coupling analysis |
| `/fusion/aircraft/{id}` | GET | Unified aircraft health JSON |
| `/simulate/what-if` | POST | Fault injection simulation |
| `/nlp/query` | POST | Maintenance log retrieval |
| `/health` | GET | Service health check |
