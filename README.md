# AeroSentinal — Holistic Aircraft Predictive Maintenance

> **Phase 1 Prototype** | 20-Day Engineering Competition Build  
> Built for technical mentor review — every metric is real, every synthetic dataset is labeled.

---

## 🎯 What This Is

A multi-subsystem aircraft predictive maintenance platform with:
- **5 independently trained ML models** covering engine, hydraulics, landing gear, APU, and ECS
- **FastAPI fusion/orchestration backend** aggregating all subsystem health into unified aircraft risk scores
- **Next.js + React Three Fiber dashboard** with 3D aircraft visualization, what-if fault simulation, and live diagnostics

### Key Differentiator
**Cross-domain fault attribution**: The ECS↔Engine coupling module demonstrates how environmental control system degradation can masquerade as engine compressor fouling — and how a fusion architecture correctly attributes the root cause. This is a live, testable demonstration, not a slide.

---

## 📊 Subsystem Models

| Subsystem | Model | Dataset | Status |
|---|---|---|---|
| Turbofan Engine (RUL) | BiLSTM + Attention | NASA C-MAPSS (FD001, FD004) | 🔲 Pending |
| Hydraulics (Anomaly) | 1D Conv Autoencoder | UCI Hydraulic Systems | 🔲 Pending |
| Landing Gear / Brakes | XGBoost Classifier | Physics-informed synthetic | 🔲 Pending |
| APU Health Scoring | Random Forest | Physics-informed synthetic | 🔲 Pending |
| ECS Cross-Domain | Brayton-cycle simulator + rule-based attribution | Physics-informed synthetic | 🔲 Pending |

### Phase 2 Roadmap (not yet implemented)
EMA/Actuators · Electrical Power/Avionics · Li-ion Battery · Structural Health (CFRP) · Fine-tuned LLM Repair Assistant

---

## 🏗️ Repository Structure

```
AeroSentinal/
├── ml/                          # Machine learning subsystems
│   ├── data/                    # Raw + processed datasets
│   ├── engine/                  # C-MAPSS BiLSTM+Attention
│   ├── hydraulics/              # UCI 1D Conv Autoencoder
│   ├── landing_gear/            # XGBoost classifier
│   ├── apu/                     # Random Forest health scoring
│   ├── ecs/                     # Brayton-cycle simulator + coupling
│   ├── nlp/                     # TF-IDF retrieval stand-in
│   ├── export/                  # ONNX export + benchmarking
│   └── notebooks/               # Exploratory analysis
├── backend/                     # FastAPI service
│   ├── app/                     # Routers, models, services
│   └── tests/                   # Unit tests
├── frontend/                    # Next.js 14 + React Three Fiber
│   ├── app/                     # Pages (dashboard, aircraft, simulator)
│   ├── components/              # 3D, charts, UI components
│   └── lib/                     # API client, state management
├── docs/                        # Architecture, limitations, dataset sources
├── scripts/                     # Data download & setup automation
└── requirements.txt             # Python dependencies
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.13+
- Node.js 24+
- Git

### Setup
```bash
# Clone
git clone https://github.com/diiyeah/AeroSentinal.git
cd AeroSentinal

# Install Python dependencies
pip install -r requirements.txt

# Download datasets
python scripts/download_data.py

# Generate synthetic data
python scripts/generate_synthetic.py

# Start MLflow tracking
mlflow ui --port 5000

# Start backend (from project root)
python -m uvicorn backend.app.main:app --reload --port 8000

# Start frontend (separate terminal)
cd frontend && npm install && npm run dev
```

---

## 📋 Build Progress

- [x] Repository scaffolding & dependency setup
- [ ] Engine model (BiLSTM+Attention on C-MAPSS)
- [ ] Hydraulics model (1D Conv Autoencoder)
- [ ] Landing gear classifier (XGBoost + SMOTE)
- [ ] APU health scoring (Random Forest)
- [x] ECS simulator + cross-domain coupling (physics-informed, production)
- [x] Fusion API + ACARS compiler + AOG cost scorer
- [ ] ONNX export + latency benchmarks
- [x] What-if fault injection simulator (live re-runs, not canned)
- [ ] NLP retrieval stand-in
- [x] Frontend dashboard + 3D aircraft viewer + simulator UI
- [ ] Known-limitations documentation + final review

---

## ⚖️ Honesty Policy

This project follows a strict honesty-first approach:
- **Real data** is used where public datasets exist (C-MAPSS, UCI Hydraulics)
- **Synthetic data** is used where no public dataset exists (landing gear, APU, ECS) — always labeled with `is_synthetic_data: true` in code, API responses, and UI
- **Phase 2 placeholders** are visually present but explicitly marked as "not yet implemented"
- **Measured benchmarks** are labeled as measured; projected numbers are labeled as projected
- See [`docs/known-limitations.md`](docs/known-limitations.md) for the full honesty sheet

---

## 📄 Documentation

- [Architecture Overview](docs/architecture.md)
- [Dataset Sources & Licenses](docs/dataset-sources.md)
- [Known Limitations & Honesty Sheet](docs/known-limitations.md)

---

## 📜 License

This project is built for the 6-month engineering competition. See individual dataset licenses in [`docs/dataset-sources.md`](docs/dataset-sources.md).
