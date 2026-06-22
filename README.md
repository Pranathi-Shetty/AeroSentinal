# AeroSentinel — Holistic Aircraft Predictive Maintenance
> Transcending Turbofan Prognostics for Fleet-Wide Asset Management

## 🎯 Problem Statement — A To Z

### What Is This Problem?
Aviation maintenance currently operates under three paradigms:
1. **Scheduled maintenance:** Fixed time/flight-hour intervals regardless of actual component condition, resulting in premature part replacement and wasted life.
2. **Reactive (run-to-failure):** Waiting for a fault to occur, causing highly disruptive Aircraft on Ground (AOG) events that cost up to $150,000 per hour.
3. **Predictive maintenance:** Using continuous sensor telemetry and machine learning to forecast Remaining Useful Life (RUL) of components, enabling "just-in-time" interventions. 

The goal of this project is to build a Predictive Health Management (PHM) system that operates across the **entire aircraft** — not just turbofan engines — using a multi-modal sensor fusion and ML architecture. It deploys at the edge of the aircraft and communicates actionable results to ground crews via the ACARS datalink.

### Why Is This Hard?
- **Massive Data Scale:** Aircraft generate terabytes of heterogeneous sensor data per flight (thermodynamic, acoustic, kinematic, electrical, textual).
- **Masked Degradation:** Subsystems like the Environmental Control System (ECS) are governed by closed-loop controllers that actively mask degradation signals.
- **Scarce Real Data:** True "run-to-failure" data for safety-critical components is incredibly rare due to aviation safety protocols.
- **Domain Shift:** Different operating conditions (e.g., humid vs. dry routes) drastically change sensor distributions, breaking standard ML models.
- **Bandwidth Constraints:** ACARS bandwidth is limited to 220 characters per message block, mandating that all heavy ML inference occurs onboard at the edge.

## 💡 The Solution: Beyond the Turbofan

Most predictive maintenance solutions stop at the turbofan engine (relying on synthetic data like C-MAPSS). **AeroSentinel is different.** We built a 6-layer multi-domain ensemble architecture combining 9+ real-world and research datasets to monitor **12 physical aircraft subsystems**.

| Dimension | Baseline (Turbofan Only) | AeroSentinel (Whole Aircraft) |
| :--- | :--- | :--- |
| **Systems Covered** | Turbofan engine only | 12 subsystems across the entire airframe |
| **Data Modalities** | Thermodynamic variables | Thermo + Acoustic + Kinematic + Electrical + NLP Text |
| **Cross-System Coupling** | Not modeled | Explicitly handles interactions (e.g., ECS ↔ Engine) |
| **Deployment Target** | Single cloud model | Edge (ONNX/TensorRT) multi-model ensemble |

Unlike isolated models, our system performs **cross-subsystem correlation analysis**, preventing misdiagnoses (e.g., ECS failure masquerading as an engine fault).

Key innovations:
- **Edge Inference:** ONNX/TensorRT quantization achieving sub-5ms latency.
- **NLP Integration:** Fine-tuned LLaMA-3.2 / Gemma-3 models trained on the MaintNet corpus for automated repair step recommendations.
- **3D Visualization:** A visually stunning React Three Fiber dashboard displaying fleet-wide health scores and interactive what-if fault simulations.

---

## 🏗️ System Architecture — 6-Layer Multi-Domain Ensemble

> 12 Subsystems · 15.1M+ Data Points · 273 System Variables · 17+ ML Models

```
╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                          ① MULTI-SUBSYSTEM DATA SOURCES (12 Subsystems)                            ║
║                                                                                                    ║
║   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         ║
║   │  Turbofan    │  │     APU      │  │     ECS      │  │ Landing Gear │  │Carbon Brakes │         ║
║   │  Engine      │  │              │  │              │  │              │  │              │         ║
║   │ C-MAPSS      │  │ EGT/N1/Vib  │  │ Boeing 737   │  │ AeroTwin 787 │  │ Brake Thermo │         ║
║   │ 21 sensors   │  │ Bleed Press  │  │ T1-T6, P1-P4 │  │ 15.1M pts    │  │ Core Temp    │         ║
║   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         ║
║          │                 │                 │                 │                 │                  ║
║   ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐         ║
║   │    EMA /     │  │  Hydraulics  │  │  Electrical  │  │   Li-ion     │  │  Structural  │         ║
║   │  Actuators   │  │              │  │   / ADAPT    │  │   Battery    │  │   / CFRP     │         ║
║   │ NASA FLEA    │  │ UCI Dataset  │  │ NASA ADAPT   │  │ HIRF 18650   │  │ NASA Ames    │         ║
║   │ Ball-screw   │  │ 43,680 feat  │  │ 273 vars 2Hz │  │ Capacity fade│  │ 16 PZT sens  │         ║
║   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         ║
║          │                 │                 │                 │                 │                  ║
║   ┌──────┴─────────────────┴───────┐  ┌──────┴─────────────────┴───────────────────┘                ║
║   │  QAR Telemetry (NGAFID-MC)    │  │  Maintenance Logs NLP (MaintNet)                            ║
║   │  11,500 hrs · 23 flight params│  │  6,169 records · 76,866 tokens                              ║
║   └──────────────┬─────────────────┘  └──────────────┬──────────────────                            ║
╚══════════════════╪═══════════════════════════════════╪══════════════════════════════════════════════╝
                   │                                   │
         ══════════╪═══════════════════════════════════╪══════════════
                   ▼                                   ▼
╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                               ② DATA INGESTION LAYER                                               ║
║                                                                                                    ║
║   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                  ║
║   │  Thermodynamic  │ │    Kinematic    │ │    Acoustic     │ │  Avionics Bus   │                  ║
║   │    Streams      │ │   Telemetry     │ │   Emissions     │ │   Electrical    │                  ║
║   │   1–4 Hz cont.  │ │ Vel/Disp/Vib   │ │ PZT burst waves │ │  2 Hz sampling  │                  ║
║   └────────┬────────┘ └────────┬────────┘ └────────┬────────┘ └────────┬────────┘                  ║
║            │                   │                   │                   │                            ║
║   ┌────────┴────────┐ ┌────────┴────────┐          │                   │                            ║
║   │  QAR Flight     │ │  NLP Text Logs  │          │                   │                            ║
║   │  Parameters     │ │  Batch Process  │          │                   │                            ║
║   │  1 Hz per-sec   │ │  Digital submit │          │                   │                            ║
║   └────────┬────────┘ └────────┬────────┘          │                   │                            ║
╚════════════╪════════════════════╪══════════════════╪═══════════════════╪════════════════════════════╝
             │                    │                  │                   │
             ▼                    ▼                  ▼                   ▼
╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                        ③ FEATURE ENGINEERING & PREPROCESSING                                       ║
║                                                                                                    ║
║   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                  ║
║   │  Min-Max +      │ │  30-Cycle       │ │  Continuous     │ │  TF-IDF + SVD   │                  ║
║   │  Z-Score Norm   │ │  Sliding Window │ │  Wavelet (CWT)  │ │  (LSA)          │                  ║
║   └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘                  ║
║   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                  ║
║   │  SHAP Feature   │ │     SMOTE       │ │  Transfer Comp  │ │  Levenshtein    │                  ║
║   │  Selection      │ │  Oversampling   │ │  Analysis (TCA) │ │  Spell-Check    │                  ║
║   │  21 → 14 vars   │ │  Rare faults    │ │  Domain align   │ │  Aviation abbr  │                  ║
║   └────────┬────────┘ └────────┬────────┘ └────────┬────────┘ └────────┬────────┘                  ║
╚════════════╪════════════════════╪══════════════════╪═══════════════════╪════════════════════════════╝
             │                    │                  │                   │
             ▼                    ▼                  ▼                   ▼
╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                         ④ DOMAIN-SPECIFIC MODEL ENSEMBLE (17+ Models)                              ║
║                                                                                                    ║
║   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                  ║
║   │  BiLSTM +       │ │  Transformer    │ │   BCA-DATrans   │ │  1D Conv        │                  ║
║   │  Attention      │ │  Encoder        │ │  Cross-Attn DA  │ │  Autoencoder    │                  ║
║   │  Engine RUL     │ │  Multi-fault    │ │  EMA Actuators  │ │  Hydraulics     │                  ║
║   └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘                  ║
║   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                  ║
║   │  Gaussian Proc  │ │  Bayesian Net   │ │  TCN + Transfer │ │  CNN on CWT     │                  ║
║   │  Regression     │ │  (503 nodes)    │ │  Learning       │ │  Images         │                  ║
║   │  EMA spall prog │ │  ADAPT 0.26ms   │ │  Battery SOH    │ │  CFRP delam     │                  ║
║   └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘                  ║
║   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                  ║
║   │  Conv-MHSA /    │ │  Random Forest  │ │  LLaMA-3.2-3B  │ │  Gemma-3-4B    │                  ║
║   │  DUTSAM         │ │  + CART         │ │  (fine-tuned)   │ │  (fine-tuned)   │                  ║
║   │  QAR hard-land  │ │  APU health     │ │  Repair recom.  │ │  Repair recom.  │                  ║
║   └────────┬────────┘ └────────┬────────┘ └────────┬────────┘ └────────┬────────┘                  ║
╚════════════╪════════════════════╪══════════════════╪═══════════════════╪════════════════════════════╝
             │                    │                  │                   │
             ▼                    ▼                  ▼                   ▼
╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                          ⑤ FUSION ALERT & ANOMALY ENGINE                                           ║
║                                                                                                    ║
║   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                                      ║
║   │  Multivariate   │ │  SLIDE Hier.    │ │  Kalman / Bond  │                                      ║
║   │  Anomaly Det.   │ │  Fault Filter   │ │  Graph Isolate  │                                      ║
║   │  Cross-subsys   │ │  False alarm ↓  │ │  LRU-level dx   │                                      ║
║   └─────────────────┘ └─────────────────┘ └─────────────────┘                                      ║
║   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                                      ║
║   │  RUL Confidence │ │  AOG Cost       │ │  ACARS 220-char │                                      ║
║   │  Interval       │ │  Scorer         │ │  Alert Compiler │                                      ║
║   │  Ensemble uncert│ │  $150k/hr risk  │ │  Compressed msg │                                      ║
║   └────────┬────────┘ └────────┬────────┘ └────────┬────────┘                                      ║
╚════════════╪════════════════════╪══════════════════╪═══════════════════════════════════════════════╝
             │                    │                  │
             ▼                    ▼                  ▼
╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                       ⑥ EDGE INFERENCE + 3D VISUALIZATION DASHBOARD                                ║
║                                                                                                    ║
║   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                                      ║
║   │  ONNX + TensorRT│ │  React Three    │ │  Live Recharts  │                                      ║
║   │  INT8 / FP16    │ │  Fiber 3D       │ │  Sensor Streams │                                      ║
║   │  < 5ms latency  │ │  Aircraft Model │ │  Multi-modal    │                                      ║
║   └─────────────────┘ └─────────────────┘ └─────────────────┘                                      ║
║   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                                      ║
║   │  What-If Fault  │ │  Fleet Maint.   │ │  NLP Repair     │                                      ║
║   │  Simulator      │ │  Planner        │ │  Recommender    │                                      ║
║   │  Inject + RUL ↓ │ │  Gantt schedule │ │  LLM chat iface │                                      ║
║   └─────────────────┘ └─────────────────┘ └─────────────────┘                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

### Layer Details

<details>
<summary><b>① Data Sources — 12 Subsystems, 9+ Datasets</b></summary>

| Subsystem | Dataset | Key Sensors |
| :--- | :--- | :--- |
| Turbofan Engine | NASA C-MAPSS (FD001–FD004) | T2/T24/T30, Ps30, NF/NC shaft speeds (21 sensors) |
| APU | EGT Monitoring / RIF | EGT startup peaks, N1, vibration, bleed pressure |
| ECS | Boeing 737-200 Simulation | T1-T6 temps, P1-P4 pressures, RH, bypass valve |
| Landing Gear | AeroTwin Boeing 787 (15.1M pts) | TP2/TP3 pneumatic, H1 separator, DV valve state |
| Carbon Brakes | Operational Telemetry | Landstrike velocity, aircraft mass, brake-core temp |
| EMA / Actuators | NASA FLEA Testbed | Motor current/voltage, ball-screw spall, parasitic loads |
| Hydraulics | UCI Condition Monitoring (43,680 feat) | PS1-PS6 pressure, TS1-TS4 temp, FS1/FS2 flow, VS1 vibration |
| Electrical / ADAPT | NASA ADAPT (273 vars @ 2Hz) | Relay states, bus voltages/currents, CB positions (128 sensors) |
| Li-ion Battery | HIRF + 18650 Aging | Terminal voltage, current, temperature, impedance |
| Structural / CFRP | NASA Ames SMART Layer | Lamb-wave 1D/2D, phase velocity, 16 PZT sensors |
| QAR Telemetry | NGAFID-MC (11,500 hrs) | GPS alt, pitch, vertical accel, fatigue load (23 params) |
| Maintenance Logs | MaintNet (6,169 records) | "Problem" + "Action" text pairs, abbreviations |

</details>

<details>
<summary><b>④ Model Ensemble — 17+ Specialized Models</b></summary>

| Model | Subsystem Target | Output |
| :--- | :--- | :--- |
| BiLSTM + Attention | Engine (C-MAPSS) | RUL (cycles to failure) |
| Transformer Encoder | Engine FD004 (multi-fault) | RUL (multi-condition) |
| Random Forest + CART | APU health classification | Health index, EGT margin alert |
| TCA / JDA | ECS cross-condition adaptation | Heat-exchanger efficiency Δ |
| XGBoost + SMOTE | Landing Gear bushing wear | Bushing wear class, overhaul date |
| BCA-DATrans | EMA actuator faults | Spall size, jam probability |
| 1D Conv Autoencoder | Hydraulic anomaly detection | Pump leak severity, valve lag |
| Bayesian Network (503 nodes) | Electrical fault isolation | Fault isolation in 0.26ms |
| TCN + Transfer Learning | Li-ion battery SOH | SOH, Remaining Flying Time |
| CNN on CWT Spectrograms | CFRP delamination | Delamination size, structural RUL |
| Conv-MHSA / DUTSAM | QAR flight telemetry | Hard-landing flag, fatigue load |
| LLaMA-3.2-3B (fine-tuned) | Maintenance log parsing | Repair step recommendation |
| Gemma-3-4B (fine-tuned) | Maintenance log parsing | Repair step recommendation |
| Gaussian Process Regression | EMA spall prognostics | RUL with uncertainty bounds |
| Bayesian Particle Filter | Structural SHM | Probabilistic RUL update |

</details>

---

## 🛠️ Full Technology Stack

- **Frontend / Visualization:** Next.js 14 (App Router), React Three Fiber (WebGL), Recharts, Tailwind CSS, Zustand, TypeScript
- **Backend API:** FastAPI (Python), WebSocket Live Streaming, Pydantic, Uvicorn
- **ML / AI Layer:** PyTorch, ONNX Runtime, TensorRT INT8 Quantization, scikit-learn, HuggingFace Transformers
- **Data Processing:** Pandas, NumPy, SciPy, PyWavelets, SHAP, SMOTE, spaCy
- **Edge / Deployment:** ONNX Runtime, Vercel / Railway cloud deploy, Docker

---

## 🚀 How to Run the Project

### Prerequisites
- Python 3.10+
- Node.js 20+
- Git

### Mac OS
```bash
# 1. Clone the repository
git clone https://github.com/diiyeah/AeroSentinal.git
cd AeroSentinal

# 2. Setup Python Virtual Environment & Install Dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Data Setup
python scripts/download_data.py
python scripts/generate_synthetic.py

# 4. Start the Backend API
python -m uvicorn backend.app.main:app --reload --port 8000 &

# 5. Start the Frontend Dashboard (in a new terminal)
cd frontend
npm install
npm run dev
```

### Windows
```powershell
# 1. Clone the repository
git clone https://github.com/diiyeah/AeroSentinal.git
cd AeroSentinal

# 2. Setup Python Virtual Environment & Install Dependencies
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# 3. Data Setup
python scripts/download_data.py
python scripts/generate_synthetic.py

# 4. Start the Backend API
start "Backend" cmd /c "python -m uvicorn backend.app.main:app --reload --port 8000"

# 5. Start the Frontend Dashboard
cd frontend
npm install
npm run dev
```

---

## 🗺️ Implementation Roadmap

### 🏁 Prototype Round
The prototype round focuses on building the core foundation and multi-system framework.
- **Phase 1 (Foundation):** Load NASA C-MAPSS data, train the baseline BiLSTM+Attention engine model, build the FastAPI backend, and construct a basic Next.js dashboard.
- **Phase 2 (Multi-System Expansion):** Load UCI Hydraulic and AeroTwin datasets, build domain-specific models for landing gear and hydraulics, and build out the ECS thermodynamic model.

### 🏆 Final Round
The final round shifts focus to cross-domain fusion, edge optimization, and delivering massive competitive differentiators.
- **Phase 3 (Cross-Domain Fusion):** Implement the cross-domain anomaly engine (scoring ECS↔Engine bleed correlations), SLIDE fault tree, and fine-tune LLaMA-3.2-3B on MaintNet for actionable NLP repair recommendations.
- **Phase 4 (Differentiators):** Fully realize the React Three Fiber 3D aircraft visualization, the interactive what-if fault injection simulator, the AOG probabilistic business cost impact panel, and ONNX/INT8 quantization ensuring sub-5ms edge latency.
- **Phase 5 (Polish & Demo):** Build the fleet maintenance Gantt planner, integrate real-time WebSocket sensor streaming, handle Vercel/Railway deployments, and refine robust architectural documentation for judges.

---

## 🌟 Unique Differentiators (Why We Win)
1. **3D Aircraft Inspector with Fault Heatmaps:** Visually stunning React Three Fiber integration showcasing component health live on the airframe. No other team will have this.
2. **What-If Fault Injection Simulator:** Interactive tool allowing users to simulate degradation and instantly see system-wide RUL collapses.
3. **Cross-Domain Fault Cascade Graph:** Proves sophisticated architectural awareness beyond isolated, single-component ML analysis.
4. **LLM Repair Recommendation Chat:** Bridges the gap between abstract ML anomaly outputs and human maintenance steps.
5. **AOG Business Impact Panel:** Translates technical RUL into direct financial metrics ($150k/hr).
6. **Edge Latency Benchmarking:** Proves production-readiness by compiling diagnostic messages into compressed ACARS 220-character alerts in real-time.

---
*Confidential Hackathon Research Document · Updated Architecture v2.0*
