import { create } from 'zustand';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export type SubsystemHealth = {
  score: number;
  status: 'Healthy' | 'Warning' | 'Critical';
  metrics: Record<string, number | string>;
  is_synthetic_data: boolean;
};

export type AircraftState = {
  aircraftId: string;
  globalHealthScore: number;
  globalStatus: string;
  engine: SubsystemHealth;
  landingGear: SubsystemHealth;
  apu: SubsystemHealth;
  hydraulics: SubsystemHealth;
  ecs: SubsystemHealth;
  crossDomainAlerts: string[];
  acarsMessage: string;
  aogRisk: {
    probability: number;
    totalRiskUsd: number;
    riskLevel: string;
    recommendation: string;
  };
};

interface AppState {
  aircraft: AircraftState;
  loading: boolean;
  backendOnline: boolean;
  error: string | null;

  // Simulator Controls
  simulator: {
    ecsFoulingPercent: number;
    brakeWearPct: number;
    apuFouling: number;
    engineCycle: number;
  };

  // Simulator comparison results
  naiveEngineScore: number | null;
  fusionEngineScore: number | null;
  attribution: string;

  // Historical data for charts
  history: Array<{ time: number; engineScore: number; ecsFouling: number }>;

  // Actions
  setSimulatorParam: (key: string, val: number) => void;
  fetchHealth: () => Promise<void>;
  runSimulation: () => Promise<void>;
  checkBackend: () => Promise<void>;
}

// Initial state
const initialAircraft: AircraftState = {
  aircraftId: "N1234A",
  globalHealthScore: 92,
  globalStatus: "Healthy",
  engine: { score: 95, status: 'Healthy', metrics: { rulCycles: 142 }, is_synthetic_data: true },
  landingGear: { score: 88, status: 'Healthy', metrics: { brakeWearPct: 12 }, is_synthetic_data: true },
  apu: { score: 98, status: 'Healthy', metrics: { egtMargin: 45 }, is_synthetic_data: true },
  hydraulics: { score: 100, status: 'Healthy', metrics: { pressureAnomaly: 0.01 }, is_synthetic_data: true },
  ecs: { score: 100, status: 'Healthy', metrics: { foulingPct: 0 }, is_synthetic_data: true },
  crossDomainAlerts: [],
  acarsMessage: "",
  aogRisk: { probability: 0, totalRiskUsd: 0, riskLevel: "LOW", recommendation: "" },
};

const initialHistory = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  engineScore: 95 + Math.random() * 2 - 1,
  ecsFouling: 0,
}));

/**
 * Parse a FusionResponse from the backend API into our frontend AircraftState.
 */
function parseFusionResponse(data: any): Partial<AircraftState> {
  const findSub = (name: string) => data.subsystems?.find((s: any) => s.name === name);

  const engine = findSub("engine");
  const hydraulics = findSub("hydraulics");
  const landing_gear = findSub("landing_gear");
  const apu = findSub("apu");
  const ecs = findSub("ecs");

  return {
    aircraftId: data.aircraft_id,
    globalHealthScore: data.global_health_score,
    globalStatus: data.global_status,
    engine: engine ? {
      score: engine.health_score,
      status: engine.status,
      metrics: { rulCycles: engine.rul_estimate ?? 0 },
      is_synthetic_data: engine.is_synthetic_data,
    } : initialAircraft.engine,
    hydraulics: hydraulics ? {
      score: hydraulics.health_score,
      status: hydraulics.status,
      metrics: { pressureAnomaly: 0 },
      is_synthetic_data: hydraulics.is_synthetic_data,
    } : initialAircraft.hydraulics,
    landingGear: landing_gear ? {
      score: landing_gear.health_score,
      status: landing_gear.status,
      metrics: { brakeWearPct: 0, remainingLandings: landing_gear.rul_estimate ?? 0 },
      is_synthetic_data: landing_gear.is_synthetic_data,
    } : initialAircraft.landingGear,
    apu: apu ? {
      score: apu.health_score,
      status: apu.status,
      metrics: { egtMargin: 0 },
      is_synthetic_data: apu.is_synthetic_data,
    } : initialAircraft.apu,
    ecs: ecs ? {
      score: ecs.health_score,
      status: ecs.status,
      metrics: { foulingPct: 0 },
      is_synthetic_data: ecs.is_synthetic_data,
    } : initialAircraft.ecs,
    crossDomainAlerts: data.cross_domain_alerts || [],
    acarsMessage: data.acars_message || "",
    aogRisk: data.aog_risk ? {
      probability: data.aog_risk.probability_of_failure,
      totalRiskUsd: data.aog_risk.total_risk_usd,
      riskLevel: data.aog_risk.risk_level,
      recommendation: data.aog_risk.recommendation,
    } : initialAircraft.aogRisk,
  };
}

export const useStore = create<AppState>((set, get) => ({
  aircraft: initialAircraft,
  loading: false,
  backendOnline: false,
  error: null,
  simulator: {
    ecsFoulingPercent: 0,
    brakeWearPct: 10,
    apuFouling: 0,
    engineCycle: 100,
  },
  naiveEngineScore: null,
  fusionEngineScore: null,
  attribution: "",
  history: initialHistory,

  checkBackend: async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        set({ backendOnline: true });
      } else {
        set({ backendOnline: false });
      }
    } catch {
      set({ backendOnline: false });
    }
  },

  setSimulatorParam: (key: string, val: number) =>
    set((state) => ({
      simulator: { ...state.simulator, [key]: val },
    })),

  fetchHealth: async () => {
    const state = get();
    set({ loading: true, error: null });

    try {
      const params = new URLSearchParams({
        aircraft_id: state.aircraft.aircraftId,
        engine_cycle: String(state.simulator.engineCycle),
        brake_wear_pct: String(state.simulator.brakeWearPct),
        apu_fouling: String(state.simulator.apuFouling),
        ecs_fouling: String(state.simulator.ecsFoulingPercent),
      });

      const res = await fetch(`${API_BASE}/fusion/health?${params}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const data = await res.json();
      const parsed = parseFusionResponse(data);

      // Update history
      const newEntry = {
        time: state.history[state.history.length - 1].time + 1,
        engineScore: parsed.engine?.score ?? state.aircraft.engine.score,
        ecsFouling: state.simulator.ecsFoulingPercent,
      };

      set({
        aircraft: { ...state.aircraft, ...parsed } as AircraftState,
        history: [...state.history.slice(1), newEntry],
        loading: false,
        backendOnline: true,
      });
    } catch (err: any) {
      // Fallback to local simulation when backend is offline
      const val = state.simulator.ecsFoulingPercent;
      const baseEngineScore = 95;
      const couplingEffect = (val / 100) * 15;
      const newEngineScore = Math.max(0, baseEngineScore - couplingEffect);
      const newEcsScore = Math.max(0, 100 - val);
      const newEngineStatus: 'Healthy' | 'Warning' | 'Critical' = 
        newEngineScore < 50 ? 'Critical' : newEngineScore < 75 ? 'Warning' : 'Healthy';
      const newEcsStatus: 'Healthy' | 'Warning' | 'Critical' =
        newEcsScore < 50 ? 'Critical' : newEcsScore < 75 ? 'Warning' : 'Healthy';
      const newGlobalScore = Math.floor(
        (newEngineScore + newEcsScore + state.aircraft.landingGear.score +
         state.aircraft.apu.score + state.aircraft.hydraulics.score) / 5
      );
      const newEntry = {
        time: state.history[state.history.length - 1].time + 1,
        engineScore: newEngineScore,
        ecsFouling: val,
      };

      set({
        aircraft: {
          ...state.aircraft,
          globalHealthScore: newGlobalScore,
          engine: { ...state.aircraft.engine, score: Math.floor(newEngineScore), status: newEngineStatus },
          ecs: { ...state.aircraft.ecs, score: Math.floor(newEcsScore), status: newEcsStatus, metrics: { foulingPct: val } },
        },
        history: [...state.history.slice(1), newEntry],
        loading: false,
        backendOnline: false,
        error: `Offline mode: ${err.message}`,
      });
    }
  },

  runSimulation: async () => {
    const state = get();
    set({ loading: true, error: null });

    try {
      const res = await fetch(`${API_BASE}/simulate/what-if`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ecs_fouling_pct: state.simulator.ecsFoulingPercent,
          engine_degradation_cycles: 0,
          hydraulic_leak_severity: 0,
          brake_wear_pct: state.simulator.brakeWearPct,
          apu_fouling_factor: state.simulator.apuFouling,
        }),
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();

      // Extract naive vs fusion engine scores
      const naiveEngine = data.naive_assessment?.subsystems?.find((s: any) => s.name === "engine");
      const fusionEngine = data.fusion_assessment?.subsystems?.find((s: any) => s.name === "engine");

      // Update aircraft state from fusion assessment
      const parsed = parseFusionResponse(data.fusion_assessment);

      const newEntry = {
        time: state.history[state.history.length - 1].time + 1,
        engineScore: parsed.engine?.score ?? state.aircraft.engine.score,
        ecsFouling: state.simulator.ecsFoulingPercent,
      };

      set({
        aircraft: { ...state.aircraft, ...parsed } as AircraftState,
        naiveEngineScore: naiveEngine?.health_score ?? null,
        fusionEngineScore: fusionEngine?.health_score ?? null,
        attribution: data.attribution_explanation || "",
        history: [...state.history.slice(1), newEntry],
        loading: false,
        backendOnline: true,
      });
    } catch (err: any) {
      // Fallback to local simulation
      const ecsFouling = state.simulator.ecsFoulingPercent;
      const naiveScore = Math.max(0, 95 - (ecsFouling / 100) * 15);
      const fusionScore = Math.min(100, naiveScore + (ecsFouling / 100) * 15);

      set({
        naiveEngineScore: Math.floor(naiveScore),
        fusionEngineScore: Math.floor(fusionScore),
        attribution: ecsFouling > 10
          ? `[Offline] ECS fouling at ${ecsFouling}% would cause false engine depression. Fusion corrects this.`
          : "[Offline] All subsystems nominal.",
        loading: false,
        backendOnline: false,
        error: `Offline mode: ${err.message}`,
      });
    }
  },
}));
