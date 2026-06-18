# Known Limitations & Honesty Sheet

> This document is the single source of truth for what is real, what is synthetic, and what is a placeholder in the AeroSentinal prototype.  
> **Updated continuously from Day 1.** Mentors should reference this document for any question of the form "is this real data?"

---

## Last Updated
2026-06-18 — Initial scaffolding phase

---

## Data Provenance

| Subsystem | Data Source | Real or Synthetic? | Notes |
|---|---|---|---|
| Turbofan Engine | NASA C-MAPSS | Real (simulated by NASA) | C-MAPSS is a high-fidelity physics simulation, not flight recorder data. This is standard and accepted in PHM literature. |
| Hydraulics | UCI Condition Monitoring | **Real** | Physical test rig data with systematically varied fault conditions |
| Landing Gear / Brakes | Self-generated | **Synthetic** | Physics-informed simulator; no suitable public real-world dataset found |
| APU | Self-generated | **Synthetic** | EGT startup curve simulator with controllable degradation |
| ECS | Self-generated | **Synthetic** | Reverse-Brayton-cycle thermodynamic simulator |
| NLP Maintenance Logs | Curated | **Partially synthetic** | Manually assembled problem/action text pairs, not from a production maintenance system |

---

## Model Limitations

| Limitation | Impact | Mitigation / Phase 2 Plan |
|---|---|---|
| CPU-only training | Longer training times, limited hyperparameter search | Sufficient for C-MAPSS scale; GPU training planned for Phase 2 scale-up |
| No real flight data | Models validated on simulation/test-rig data, not production flights | Standard for PHM research; airline data partnership is a Phase 2 goal |
| Engine model uses C-MAPSS only | No vibration or acoustic data; single-source sensor degradation | Acoustic/vibration pipeline planned as Phase 2 SHM module |
| No domain adaptation | Performance may degrade across operating conditions not seen in training | Domain shift is measured and reported on FD004; TCA planned for Phase 2 |
| ECS attribution is rule-based | Not a learned model; may not generalize to complex multi-fault scenarios | Deliberately chosen for explainability; ML attribution planned for Phase 2 |

---

## Benchmark Limitations

| Benchmark | What's Measured | What's Projected |
|---|---|---|
| ONNX inference latency | **Measured** on available CPU hardware | Jetson/edge hardware numbers are **projected, not measured** (no physical Jetson available) |
| Training metrics (RMSE, F1, etc.) | **Measured** on held-out test sets | N/A |
| AOG cost scores | **Computed** from live model outputs | Dollar amounts use industry-standard $150k/hr estimate, not airline-specific costs |

---

## UI / Feature Scope

| Feature | Status | Notes |
|---|---|---|
| 5 subsystem models | Phase 1 — built and validated | Each with real metrics |
| EMA/Actuators | **Phase 2 placeholder** | UI card only, no backend |
| Electrical Power/Avionics | **Phase 2 placeholder** | UI card only, no backend |
| Li-ion Battery | **Phase 2 placeholder** | UI card only, no backend |
| Structural Health (CFRP) | **Phase 2 placeholder** | UI card only, no backend |
| NLP Repair Assistant | **Phase 1: TF-IDF retrieval only** | Fine-tuned LLM is Phase 2 |
| What-if Simulator | Phase 1 — live re-inference | Calls actual models, not canned responses |
| ACARS Alert Compiler | Phase 1 — real function | Tested with unit tests |

---

## Things This Prototype Does NOT Claim

1. We do **not** claim to have real airline flight data
2. We do **not** claim the NLP component is a fine-tuned LLM
3. We do **not** claim edge hardware benchmarks unless measured on that hardware
4. We do **not** claim the synthetic datasets are equivalent to real-world degradation data
5. We do **not** claim domain adaptation is solved — we measure and report the gap
