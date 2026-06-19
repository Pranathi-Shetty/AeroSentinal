"use client";

import { useEffect, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { PresentationControls, Environment } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useStore, SubsystemHealth } from "@/lib/store";
import { Activity, Thermometer, Droplets, ArrowDownToLine, Zap, Wind, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import clsx from "clsx";
import dynamic from "next/dynamic";

const AircraftModel = dynamic(() => import("@/components/3d/AircraftModel"), {
  ssr: false,
});

export default function AircraftDetailPage({ params }: { params: { id: string } }) {
  const { 
    aircraft, fetchHealth, checkBackend, dissectAmount, setDissectAmount, 
    setFocusedZone, physicsInputs, datasetInputs, setPhysicsParam, setDatasetParam, runSimulation,
    naiveEngineScore, fusionEngineScore, attribution
  } = useStore();
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    checkBackend();
    fetchHealth();
    // Debounce the runSimulation so it feels live when dragging sliders
    const t = setTimeout(() => {
      runSimulation();
    }, 200);
    return () => clearTimeout(t);
  }, [physicsInputs, datasetInputs]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Healthy': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'Warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'Critical': return <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />;
      default: return null;
    }
  };

  const getStatusBorder = (status: string) => {
    switch (status) {
      case 'Healthy': return "border-emerald-500/30";
      case 'Warning': return "border-amber-500/50";
      case 'Critical': return "border-rose-500/50";
      default: return "border-white/10";
    }
  };

  const SubsystemCard = ({ 
    title, icon: Icon, data, zoneName, metricLabel, metricValue, metricUnit 
  }: { 
    title: string, icon: any, data: SubsystemHealth, zoneName: string, metricLabel: string, metricValue: any, metricUnit: string 
  }) => (
    <button 
      onClick={() => setFocusedZone(zoneName)}
      className={clsx(
        "w-full text-left glass-panel glass-panel-hover p-4 border-l-4 transition-all group",
        getStatusBorder(data.status),
        data.status === 'Warning' && "bg-amber-500/5",
        data.status === 'Critical' && "bg-rose-500/5"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-400 group-hover:text-primary-400 transition-colors" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {getStatusIcon(data.status)}
      </div>
      <div className="flex justify-between items-end">
        <div>
          <div className="text-2xl font-bold font-mono">{data.score}<span className="text-sm text-gray-500">/100</span></div>
          <div className="text-xs text-gray-400 mt-1">{metricLabel}: <span className="text-gray-200 font-mono">{metricValue}{metricUnit}</span></div>
        </div>
      </div>
      {data.is_synthetic_data && (
        <div className="mt-3 inline-block px-1.5 py-0.5 rounded border border-primary-500/20 bg-primary-500/10 text-[10px] text-primary-400 font-bold uppercase tracking-wider">
          Synthetic
        </div>
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-full relative -m-8">
      {/* 3D Viewer Area (Background) */}
      <div className="absolute inset-0 bg-background overflow-hidden">
        <Canvas camera={{ position: [15, 10, -15], fov: 40 }}>
          <ambientLight intensity={0.4} />
          <spotLight position={[10, 20, 10]} angle={0.2} penumbra={1} intensity={1.5} />
          <Environment preset="city" />
          <PresentationControls 
            global rotation={[0, 0, 0]} 
            polar={[-Math.PI / 4, Math.PI / 4]} 
            azimuth={[-Math.PI, Math.PI]}
          >
            <Suspense fallback={null}>
              <AircraftModel />
            </Suspense>
          </PresentationControls>
          <EffectComposer>
            <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
          </EffectComposer>
        </Canvas>
        {/* Loading overlay — OUTSIDE Canvas so it's valid HTML */}
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-xs text-gray-500 font-mono tracking-widest animate-pulse">LOADING 3D TWIN...</div>
          </div>
        }>
          <span className="hidden" />
        </Suspense>
        
        {/* 3D View Toolbar (Dissect) */}
        <div className="absolute top-6 left-6 glass-panel p-4 flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fuselage Dissection</label>
          <input 
            type="range" min="0" max="100" 
            value={dissectAmount}
            onChange={(e) => setDissectAmount(parseInt(e.target.value))}
            className="w-48 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
        </div>

        {/* Global Aircraft Status Overlay */}
        <div className="absolute top-6 right-[340px] glass-panel p-4 flex items-center gap-4">
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">Global Score</div>
            <div className="text-3xl font-bold font-mono text-white">{aircraft.globalHealthScore}%</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div>
            <div className="text-xs text-amber-400 font-bold uppercase tracking-widest">AOG Risk</div>
            <div className="text-xl font-bold font-mono text-amber-400">${(aircraft.aogRisk.totalRiskUsd / 1000).toFixed(0)}K</div>
          </div>
        </div>
      </div>

      {/* Side Rail (Subsystem Cards) */}
      <div className="absolute top-0 right-0 w-[320px] h-full border-l border-white/10 bg-background/60 backdrop-blur-md p-6 overflow-y-auto z-10 space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Diagnostics</h2>
        
        <SubsystemCard 
          title="Turbofan Engine" icon={Thermometer} data={aircraft.engine} zoneName="zone_engine"
          metricLabel="RUL" metricValue={aircraft.engine.metrics.rulCycles} metricUnit="cyc"
        />
        <SubsystemCard 
          title="ECS (Climate)" icon={Wind} data={aircraft.ecs} zoneName="zone_ecs"
          metricLabel="Fouling" metricValue={aircraft.ecs.metrics.foulingPct} metricUnit="%"
        />
        <SubsystemCard 
          title="Hydraulics" icon={Droplets} data={aircraft.hydraulics} zoneName="zone_hydraulics"
          metricLabel="Anomaly" metricValue={aircraft.hydraulics.metrics.pressureAnomaly} metricUnit=""
        />
        <SubsystemCard 
          title="Landing Gear" icon={ArrowDownToLine} data={aircraft.landingGear} zoneName="zone_landing_gear"
          metricLabel="Wear" metricValue={aircraft.landingGear.metrics.brakeWearPct} metricUnit="%"
        />
        <SubsystemCard 
          title="APU" icon={Zap} data={aircraft.apu} zoneName="zone_apu"
          metricLabel="EGT Margin" metricValue={aircraft.apu.metrics.egtMargin} metricUnit="°C"
        />

        {aircraft.acarsMessage && (
          <div className="mt-8 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">Generated ACARS</div>
            <div className="text-xs font-mono text-emerald-300 break-words">{aircraft.acarsMessage}</div>
          </div>
        )}
      </div>

      {/* Bottom Dock (What-If Simulator) */}
      <div className={clsx(
        "absolute bottom-0 left-0 right-[320px] glass-panel rounded-b-none border-x-0 border-b-0 transition-transform duration-500 z-10 flex flex-col",
        panelOpen ? "translate-y-0 h-72" : "translate-y-[calc(100%-3rem)] h-72"
      )}>
        {/* Dock Header (Toggle) */}
        <button 
          onClick={() => setPanelOpen(!panelOpen)}
          className="h-12 w-full flex items-center justify-between px-6 border-b border-white/5 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-400" />
            <span className="font-bold text-sm tracking-wide">What-If Fault Simulator</span>
          </div>
          <div className="text-xs text-gray-500">{panelOpen ? "▼ Collapse" : "▲ Expand"}</div>
        </button>

        {/* Dock Content */}
        <div className="flex-1 p-6 flex gap-8 overflow-x-auto">
          {/* Physics Simulators */}
          <div className="flex gap-6">
            <div className="w-64 space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">ECS Physics</h4>
              <div>
                <div className="flex justify-between mb-1"><span className="text-xs text-gray-400">Fouling %</span><span className="text-xs font-mono">{physicsInputs.ecs.foulingPct}%</span></div>
                <input type="range" min="0" max="100" value={physicsInputs.ecs.foulingPct} onChange={(e) => setPhysicsParam('ecs', 'foulingPct', parseInt(e.target.value))} className="w-full accent-primary-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div>
                <div className="flex justify-between mb-1"><span className="text-xs text-gray-400">Phase</span></div>
                <select value={physicsInputs.ecs.flightPhase} onChange={(e) => setPhysicsParam('ecs', 'flightPhase', e.target.value as any)} className="w-full bg-white/5 border border-white/10 text-xs p-1.5 rounded text-gray-300">
                  <option value="ground">Ground</option><option value="climb">Climb</option><option value="cruise">Cruise</option><option value="descent">Descent</option>
                </select>
              </div>
            </div>

            <div className="w-64 space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">APU Physics</h4>
              <div>
                <div className="flex justify-between mb-1"><span className="text-xs text-gray-400">Fouling</span><span className="text-xs font-mono">{physicsInputs.apu.foulingPct}%</span></div>
                <input type="range" min="0" max="100" value={physicsInputs.apu.foulingPct} onChange={(e) => setPhysicsParam('apu', 'foulingPct', parseInt(e.target.value))} className="w-full accent-purple-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
              </div>
            </div>

            <div className="w-64 space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Landing Gear Physics</h4>
              <div>
                <div className="flex justify-between mb-1"><span className="text-xs text-gray-400">Mass (kg)</span><span className="text-xs font-mono">{physicsInputs.landingGear.aircraftMassKg}</span></div>
                <input type="range" min="50000" max="90000" step="1000" value={physicsInputs.landingGear.aircraftMassKg} onChange={(e) => setPhysicsParam('landingGear', 'aircraftMassKg', parseInt(e.target.value))} className="w-full accent-amber-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
              </div>
            </div>
          </div>

          <div className="w-px h-full bg-white/10" />

          {/* Dataset Trajectories */}
          <div className="flex gap-6">
            <div className="w-64 space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">Engine Data <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px]">C-MAPSS</span></h4>
              <div>
                <div className="flex justify-between mb-1"><span className="text-xs text-gray-400">Test Unit ID</span></div>
                <select value={datasetInputs.engine.unitId} onChange={(e) => setDatasetParam('engine', 'unitId', e.target.value)} className="w-full bg-white/5 border border-white/10 text-xs p-1.5 rounded text-gray-300">
                  <option value="1">Unit 1 (FD001)</option><option value="2">Unit 2 (FD001)</option>
                </select>
              </div>
              <div>
                <div className="flex justify-between mb-1"><span className="text-xs text-gray-400">Cycle Scrubber</span><span className="text-xs font-mono">{datasetInputs.engine.cycle}</span></div>
                <input type="range" min="0" max="300" value={datasetInputs.engine.cycle} onChange={(e) => setDatasetParam('engine', 'cycle', parseInt(e.target.value))} className="w-full accent-rose-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" />
              </div>
            </div>

            <div className="w-64 space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">Hydraulics Data <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px]">UCI</span></h4>
              <div>
                <div className="flex justify-between mb-1"><span className="text-xs text-gray-400">Test Cycle ID</span></div>
                <select value={datasetInputs.hydraulics.unitId} onChange={(e) => setDatasetParam('hydraulics', 'unitId', e.target.value)} className="w-full bg-white/5 border border-white/10 text-xs p-1.5 rounded text-gray-300">
                  <option value="1">Cycle 1 (Nominal)</option><option value="2">Cycle 2 (Internal Leak)</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Coupling Analysis Output */}
          {attribution && (
             <div className="w-80 ml-auto p-4 rounded-xl border border-primary-500/30 bg-primary-500/10 h-fit">
                <div className="text-[10px] text-primary-400 font-bold uppercase tracking-widest mb-2">Fusion Analysis</div>
                <div className="text-xs text-gray-300 leading-relaxed">{attribution}</div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
