# 20-Day Functional Prototype Roadmap
## Holistic Aircraft Predictive Maintenance — Phase 1 of 6-Month Build

This is not a hackathon demo plan. It is a 20-day plan to produce a **real, defensible, working prototype** that a panel of mentors can question on methodology and that survives follow-up rounds. Every weakness flagged in the original research report is mapped to a specific countermeasure below — the goal is to walk into mentor round 1 having already pre-empted the obvious criticisms.

---

## 0. Scope Decision (locked)

| Parameter | Decision |
|---|---|
| Subsystems with real trained models | **5**: Turbofan Engine, Hydraulics, Landing Gear/Brakes, ECS (cross-domain coupling), APU |
| Subsystems shown as roadmap-only (UI placeholder, "Phase 2") | EMA/Actuators, Electrical/ADAPT, Battery, CFRP/Structural, NLP/MaintNet |
| Compute | GPU available (local or cloud) — used for engine BiLSTM/Transformer + hydraulic autoencoder training, not for any LLM fine-tuning in this phase |
| NLP/LLM | Deferred to Phase 2. A lightweight stand-in (TF-IDF + cosine retrieval over a small curated MaintNet sample) is acceptable for demo purposes but is explicitly labeled "Phase 2: LLM fine-tune pending" in the UI — do not claim a fine-tuned model you don't have |
| Frontend | Next.js + React Three Fiber, exactly as previously scoped |
| Backend | FastAPI, single service, modular routers per subsystem |

**Why 5 and not more:** maximum breadth was requested, but every subsystem added without a real dataset and real validation metric is a liability in a mentor round — a mentor's first question will be "show me the test-set error" or "what happens when you feed it out-of-distribution data," and a UI mockup has no answer. Five real subsystems with real numbers beats ten subsystems where half are decorative.

---

## 1. Mapping Weaknesses → Prototype Countermeasures

This is the core strategic move: build the prototype specifically to neutralize the criticisms already on record.

| Weakness (from original report) | Countermeasure built into the 20-day prototype |
|---|---|
| C-MAPSS is synthetic and isolated from the airframe | Build the **ECS↔Engine coupling simulator** (Day 9–11): inject a synthetic ECS bleed-air anomaly and show it artificially raising engine temperature readings, then show the fusion engine correctly attributing the anomaly to ECS rather than mis-flagging the engine. This is a live, working demonstration of the exact blind spot the report calls out — not just a slide. |
| Engine model omits vibration/acoustic data | Explicitly scoped as a **Phase 2 item** (CFRP/SHM acoustic pipeline) and stated as such in the architecture doc — do not claim coverage you don't have; show the roadmap slot instead |
| Single-model engine-only systems ignore the rest of the aircraft | 5 independently trained subsystem models running through one fusion/orchestration layer, each with its own metrics dashboard |
| ECS closed-loop control masks degradation | The ECS module explicitly models the delta-T masking effect and demonstrates detection despite the masking — this is a direct, testable claim a mentor can probe |
| Domain shift across operating conditions (humid vs dry routes) | At minimum, demonstrate **train/test split by operating condition** (use C-MAPSS FD002/FD004 multi-condition subsets) and report accuracy degradation across conditions, even if a full TCA implementation is Phase 2 — this proves you understand and measure the problem, which matters more than solving it perfectly in 20 days |
| ACARS 220-character bandwidth constraint | Implement the actual alert compiler — a function that takes a full diagnostic JSON and compresses it to a fixed-format ≤220 character string. Show before/after side by side in the UI. Cheap to build, very convincing. |
| No edge deployment / inference cost shown | Export every trained model to ONNX, benchmark actual inference latency (not invented numbers), display real measured ms/inference in the dashboard |
| No quantified business impact | AOG cost panel uses live P(failure) × $150k/hr from your actual model outputs, not hardcoded numbers |

---

## 2. The 20-Day Plan

### Phase A — Foundation & Data (Days 1–5)

**Day 1–2: Environment + data acquisition**
- Set up monorepo (`/ml`, `/backend`, `/frontend`) — structure detailed in Section 4
- Download and verify: NASA C-MAPSS (all 4 subsets), UCI Hydraulic Condition Monitoring, AeroTwin or substitute landing-gear dataset (if AeroTwin unavailable, fall back to a synthetic but physically-modeled landing gear dataset — disclose this clearly, do not misrepresent it as the AeroTwin set)
- For APU and ECS — there is no single off-the-shelf labeled dataset. Build a **physics-informed synthetic generator**: ECS as a reverse-Brayton-cycle simulation (parametrized per Section 4.1 of the original report — T1–T9, P1–P9 relationships), APU as a degraded-EGT startup curve generator with controllable fouling parameters. This is standard practice in PHM research where real degraded data is unavailable (the original C-MAPSS itself is synthetic) — be upfront about this in the mentor presentation, it is a strength not a weakness if framed correctly ("we built a physics-based simulator because real degraded-APU telemetry isn't publicly available — same approach NASA used for C-MAPSS")
- Set up experiment tracking (Weights & Biases or MLflow) from day 1 — mentors will ask about reproducibility

**Day 3–4: Engine model (the credibility anchor)**
- Train BiLSTM+Attention on C-MAPSS FD001 first (single condition, easiest) to get a working baseline RMSE
- Then train on FD004 (hardest, multi-condition/multi-fault) — this is the number you lead with in any mentor round, because it's the subset everyone else avoids
- Implement SHAP feature selection (21→14 sensors), save the importance plot — this becomes a permanent dashboard panel
- Target: RMSE competitive with published literature (~12–18 cycles on FD001 test set is a reasonable bar; document your number honestly, do not cherry-pick the best run)

**Day 5: Hydraulics model**
- Train 1D convolutional autoencoder on UCI Hydraulic nominal-condition data
- Validate reconstruction-error separation between healthy and the 4 fault severities in the dataset
- This is your "unsupervised anomaly detection" proof point — different ML paradigm from the engine model, which matters because it shows breadth of technique, not just breadth of subsystem count

### Phase B — Multi-System + Fusion (Days 6–12)

**Day 6–7: Landing gear / brakes model**
- Train XGBoost (or Random Forest if data is sparse) classifier on landing-gear/brake telemetry for wear-severity classification
- Apply SMOTE if class imbalance is present in fault categories

**Day 8: APU model**
- Train Random Forest / CART on the synthetic APU EGT generator output for fleet-deviation health scoring

**Day 9–11: ECS cross-domain coupling engine — the centerpiece**
- Build the ECS reverse-Brayton simulator with a controllable "heat exchanger fouling" parameter
- Build the coupling logic: fouling → excess bleed air demand → artificially elevated *measured* engine sensor temperature
- Build the fusion/attribution layer: given a temperature anomaly, decide whether it originates in the engine or is induced by ECS — this is the single most important piece of engineering in the prototype, because it's the one feature that directly answers the report's central criticism
- This does not need to be a deep learning model — a clearly-reasoned rule-based or shallow statistical attribution model is *fine* and arguably preferable here, since it's explainable to mentors. Don't over-engineer this with a black box; the point is to demonstrate the architecture pattern, not win a Kaggle competition.

**Day 12: Fusion/orchestration layer**
- Single FastAPI service that routes to all 5 subsystem models
- Aggregates outputs into a unified per-aircraft health JSON: `{subsystem, health_score, RUL_estimate, confidence, anomaly_flag}`
- Implement the ACARS 220-character compiler against this JSON

### Phase C — Edge Export + Differentiators (Days 13–17)

**Day 13–14: ONNX export + real latency benchmarking**
- Export engine, hydraulics, landing gear models to ONNX
- Run actual inference timing (CPU is fine — be honest that GPU/Jetson numbers are projected, not measured, unless you actually have the hardware)
- Build the latency panel with real numbers

**Day 15: AOG cost scorer**
- `risk_score = P(failure_within_N_cycles) × $150,000/hr × expected_grounding_hours`
- Wire this to live model outputs, not static numbers

**Day 16: What-if fault injection simulator**
- Backend endpoint that accepts a synthetic fault parameter (e.g., "ECS fouling = 40%") and re-runs the relevant model(s) live
- This is the feature most likely to make the demo memorable — prioritize getting this working over polishing visuals

**Day 17: NLP stand-in (lightweight, honestly labeled)**
- TF-IDF + cosine similarity retrieval over a small curated sample of MaintNet-style problem/action pairs (even 200-500 hand-picked or scraped pairs is enough for a believable demo)
- Label this clearly in the UI as a retrieval-based placeholder for the planned fine-tuned LLaMA/Gemma model in Phase 2 — do not claim more than what's built

### Phase D — Frontend + Demo Readiness (Days 18–20)

**Day 18: 3D dashboard core**
- React Three Fiber aircraft model with clickable subsystem hotspots (a simplified/stylized aircraft mesh is fine — do not burn days on a hyper-detailed 3D model)
- Color-coded health overlay driven by live API data

**Day 19: Sensor panels + what-if UI + ACARS/cost panels**
- Wire all backend endpoints into the dashboard
- Live sensor streaming via WebSocket (replay real dataset rows at accelerated speed to simulate "live" flight)

**Day 20: Mentor-round rehearsal prep**
- Write a 1-page "known limitations and Phase 2 roadmap" sheet — proactively listing what's synthetic, what's a placeholder, and what's real. Mentors trust teams more when the team names its own gaps first.
- Rehearse the demo flow: Problem → Architecture → Live fault injection → ECS coupling demo → Cost impact → Phase 2 roadmap
- Freeze the build; no new features after Day 20

---

## 3. What "Functional" Means Here (and what it doesn't)

To avoid scope creep or, worse, building something that collapses under mentor questioning:

**Must be real:**
- Every model trained on real or explicitly-disclosed-synthetic data, with a real validation metric you can quote from memory
- The ONNX export and latency numbers
- The ACARS compiler logic
- The ECS-engine coupling attribution logic
- The what-if simulator actually re-running inference, not replaying a canned animation

**Allowed to be a clearly-labeled placeholder:**
- NLP repair recommendation (retrieval stand-in, not fine-tuned LLM)
- EMA, electrical, battery, CFRP subsystems (roadmap slots in the UI, not fake data)
- Jetson/edge hardware numbers (state CPU-measured numbers and label projected edge numbers as projected)

**Never do:**
- Hardcode a "live" metric that's actually a static number
- Claim a dataset you substituted with synthetic data is the real one
- Present a UI mockup as if it's backed by a trained model

---

## 4. Repository Structure (hand this to the coding agent)

```
aircraft-phm/
├── ml/
│   ├── data/                    # raw + processed datasets per subsystem
│   ├── engine/                  # C-MAPSS BiLSTM+Attention, SHAP, training scripts
│   ├── hydraulics/              # UCI autoencoder
│   ├── landing_gear/            # XGBoost classifier
│   ├── apu/                     # synthetic generator + RF model
│   ├── ecs/                     # Brayton-cycle simulator + coupling logic
│   ├── export/                  # ONNX export + latency benchmark scripts
│   └── notebooks/                # exploratory analysis, kept separate from production code
├── backend/
│   ├── app/
│   │   ├── routers/             # one router per subsystem + fusion + acars + cost
│   │   ├── models/               # Pydantic schemas
│   │   ├── services/             # ONNX runtime inference wrappers
│   │   └── main.py
│   └── tests/
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── aircraft/[id]/
│   │   └── simulator/
│   ├── components/
│   │   ├── 3d/
│   │   ├── charts/
│   │   └── ui/
│   └── lib/
└── docs/
    ├── architecture.md
    ├── known-limitations.md     # the Day 20 honesty sheet
    └── dataset-sources.md
```

---

## 5. Daily Checklist Summary (quick reference)

| Day | Deliverable |
|---|---|
| 1–2 | Repo + data pipeline + experiment tracking live |
| 3–4 | Engine BiLSTM+Attention trained, SHAP done, FD001 + FD004 metrics recorded |
| 5 | Hydraulics autoencoder trained + validated |
| 6–7 | Landing gear classifier trained |
| 8 | APU synthetic generator + RF model |
| 9–11 | ECS simulator + cross-domain coupling/attribution logic working |
| 12 | Fusion API + ACARS compiler |
| 13–14 | ONNX export + real latency benchmarks |
| 15 | AOG cost scorer wired to live outputs |
| 16 | What-if fault injection working end-to-end |
| 17 | NLP retrieval stand-in, clearly labeled |
| 18 | 3D dashboard core |
| 19 | Full frontend-backend wiring + live sensor replay |
| 20 | Limitations doc + rehearsal + freeze |
