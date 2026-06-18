"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { TimeChart } from "@/components/charts/TimeChart";
import { SlidersHorizontal, Activity, AlertTriangle, Info, CheckCircle2, Wifi, WifiOff } from "lucide-react";
import clsx from "clsx";

export default function SimulatorPage() {
  const { 
    simulator, setSimulatorParam, runSimulation, fetchHealth, checkBackend,
    aircraft, naiveEngineScore, fusionEngineScore, attribution,
    backendOnline, loading 
  } = useStore();

  useEffect(() => {
    checkBackend();
  }, []);

  // Debounced simulation trigger when slider changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (backendOnline) {
        runSimulation();
      } else {
        fetchHealth();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [simulator.ecsFoulingPercent, simulator.brakeWearPct, simulator.apuFouling]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl">
      <header className="pb-4 border-b border-white/10">
        <h1 className="text-3xl font-bold tracking-tight">Cross-Domain Simulator</h1>
        <p className="text-gray-400 mt-1">
          Inject faults into subsystems to observe thermodynamic coupling effects.
        </p>
        <div className={clsx(
          "mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium",
          backendOnline 
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
            : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
        )}>
          {backendOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {backendOnline ? "Live backend inference" : "Offline — local simulation"}
          {loading && <span className="opacity-50 ml-1">•••</span>}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Controls Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 border-t-4 border-t-emerald-500">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold">Fault Injection</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">ECS Heat Exchanger Fouling</label>
                  <span className="text-sm text-emerald-400 font-bold">{simulator.ecsFoulingPercent}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" 
                  value={simulator.ecsFoulingPercent}
                  onChange={(e) => setSimulatorParam("ecsFoulingPercent", parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-xs text-gray-500 mt-1">Particle buildup reducing heat transfer.</p>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">Brake Wear</label>
                  <span className="text-sm text-amber-400 font-bold">{simulator.brakeWearPct}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" 
                  value={simulator.brakeWearPct}
                  onChange={(e) => setSimulatorParam("brakeWearPct", parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">APU Fouling Factor</label>
                  <span className="text-sm text-primary-400 font-bold">{(simulator.apuFouling * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" 
                  value={simulator.apuFouling * 100}
                  onChange={(e) => setSimulatorParam("apuFouling", parseInt(e.target.value) / 100)}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 bg-white/5">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300 space-y-2">
                <p><strong className="text-white">The Naive Approach:</strong> Isolated models flag the engine as degrading when it requires more bleed air.</p>
                <p><strong className="text-white">AeroSentinal Fusion:</strong> Correlates the engine&apos;s bleed demand with the ECS&apos;s fouling state to correctly attribute the fault.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Diagnostics Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-400" /> Real-time Telemetry
            </h2>
            <div className="h-[350px]">
              <TimeChart />
            </div>
          </div>

          {/* Attribution explanation */}
          {attribution && (
            <div className="glass-panel p-4 border-l-4 border-l-primary-500 bg-primary-500/5">
              <p className="text-sm text-gray-300">
                <strong className="text-primary-400">Attribution: </strong>
                {attribution}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="glass-panel p-6 border border-rose-500/20 bg-rose-500/5">
                <h3 className="font-semibold text-rose-400 mb-3">Isolated Engine Model</h3>
                {naiveEngineScore !== null && (
                  <div className="text-3xl font-bold text-rose-400 mb-2">{naiveEngineScore.toFixed(0)}<span className="text-base text-gray-500">/100</span></div>
                )}
                <div className="text-sm text-gray-300">
                  {(naiveEngineScore !== null && naiveEngineScore < 80) ? (
                    <div className="flex gap-2 text-rose-300">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <p>False positive! Engine flagged for degradation due to anomalous compressor load.</p>
                    </div>
                  ) : (
                    <p className="text-gray-400">Engine operating normally.</p>
                  )}
                </div>
             </div>

             <div className="glass-panel p-6 border border-emerald-500/20 bg-emerald-500/5">
                <h3 className="font-semibold text-emerald-400 mb-3">AeroSentinal Fusion</h3>
                {fusionEngineScore !== null && (
                  <div className="text-3xl font-bold text-emerald-400 mb-2">{fusionEngineScore.toFixed(0)}<span className="text-base text-gray-500">/100</span></div>
                )}
                <div className="text-sm text-gray-300">
                  {simulator.ecsFoulingPercent > 20 ? (
                    <div className="flex gap-2 text-emerald-300">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <p>Root cause isolated: Engine load spike is a secondary effect of ECS fouling. Engine remains healthy.</p>
                    </div>
                  ) : (
                    <p className="text-gray-400">System operating nominally.</p>
                  )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
