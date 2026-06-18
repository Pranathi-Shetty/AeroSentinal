"""
AeroSentinal — FastAPI Backend Entry Point
===========================================
Main application with CORS, health check, and subsystem routers.

Start with:
  uvicorn backend.app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AeroSentinal",
    description=(
        "Holistic Aircraft Predictive Maintenance API. "
        "Provides per-subsystem predictions, fusion scoring, "
        "what-if simulation, and ACARS alert compilation."
    ),
    version="0.1.0-prototype",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "service": "AeroSentinal Backend",
        "version": "0.1.0-prototype",
        "subsystems": {
            "engine": "pending",
            "hydraulics": "pending",
            "landing_gear": "pending",
            "apu": "pending",
            "ecs": "pending",
        },
    }


# ============================================================
# Routers will be added as subsystem models are built:
#
# from .routers import engine, hydraulics, landing_gear, apu, ecs
# from .routers import fusion, simulator, nlp
#
# app.include_router(engine.router, prefix="/predict", tags=["Engine"])
# app.include_router(hydraulics.router, prefix="/predict", tags=["Hydraulics"])
# app.include_router(landing_gear.router, prefix="/predict", tags=["Landing Gear"])
# app.include_router(apu.router, prefix="/predict", tags=["APU"])
# app.include_router(ecs.router, prefix="/predict", tags=["ECS"])
# app.include_router(fusion.router, prefix="/fusion", tags=["Fusion"])
# app.include_router(simulator.router, prefix="/simulate", tags=["Simulator"])
# app.include_router(nlp.router, prefix="/nlp", tags=["NLP"])
# ============================================================
