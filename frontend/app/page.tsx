"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Activity, Thermometer, Wind, Droplets, ArrowDownToLine, Zap, ShieldAlert, CheckCircle2, AlertTriangle, Wifi, WifiOff, DollarSign } from "lucide-react";
import clsx from "clsx";

export default function DashboardPage() {
  const { aircraft, backendOnline, loading, error, fetchHealth, checkBackend } = useStore();

  useEffect(() => {
    checkBackend();
    fetchHealth();
    const interval = setInterval(() => fetchHealth(), 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Healthy': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'Warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'Critical': return <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy': return "text-emerald-400";
      case 'Warning': return "text-amber-400";
      case 'Critical': return "text-rose-500";
      default: return "text-gray-400";
    }
  };

  const SubsystemCard = ({ 
    title, icon: Icon, data, description 
  }: { 
    title: string, icon: any, data: any, description: string 
  }) => (
    <div className="glass-panel glass-panel-hover p-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-24 h-24" />
      </div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg border border-white/10">
            <Icon className="w-5 h-5 text-primary-400" />
          </div>
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>
        {getStatusIcon(data.status)}
      </div>

      <div className="relative z-10">
        <div className="flex items-end gap-2">
          <span className={clsx("text-4xl font-bold tracking-tighter", getStatusColor(data.status))}>
            {data.score}
          </span>
          <span className="text-sm text-gray-400 mb-1 font-medium">/ 100</span>
        </div>
        <p className="text-sm text-gray-400 mt-2">{description}</p>
        
        {data.is_synthetic_data && (
          <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-500/10 border border-primary-500/20 text-xs text-primary-300 font-medium">
            <Activity className="w-3 h-3" />
            Physics-Informed Synthetic Data
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Connection status bar */}
      <div className={clsx(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
        backendOnline 
          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
          : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
      )}>
        {backendOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        {backendOnline ? "Connected to FastAPI backend (live inference)" : "Backend offline — using local simulation fallback"}
        {loading && <span className="ml-auto text-xs opacity-50">Updating...</span>}
      </div>

      <header className="flex justify-between items-end pb-4 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Overview</h1>
          <p className="text-gray-400 mt-1">Real-time health monitoring for {aircraft.aircraftId}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-1">Global Health Index</div>
          <div className={clsx("text-5xl font-bold tracking-tighter", getStatusColor(aircraft.globalHealthScore >= 75 ? 'Healthy' : aircraft.globalHealthScore >= 50 ? 'Warning' : 'Critical'))}>
            {aircraft.globalHealthScore}%
          </div>
        </div>
      </header>

      {/* Cross-domain alerts */}
      {aircraft.crossDomainAlerts.length > 0 && (
        <section className="space-y-2">
          {aircraft.crossDomainAlerts.map((alert, i) => (
            <div key={i} className="glass-panel p-4 border-l-4 border-l-amber-500 bg-amber-500/5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-300">{alert}</p>
            </div>
          ))}
        </section>
      )}

      {/* AOG Risk Panel */}
      {aircraft.aogRisk.totalRiskUsd > 0 && (
        <div className={clsx("glass-panel p-6 border-l-4", {
          "border-l-emerald-500 bg-emerald-500/5": aircraft.aogRisk.riskLevel === "LOW",
          "border-l-amber-500 bg-amber-500/5": aircraft.aogRisk.riskLevel === "MEDIUM",
          "border-l-rose-500 bg-rose-500/5": aircraft.aogRisk.riskLevel === "HIGH" || aircraft.aogRisk.riskLevel === "CRITICAL",
        })}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-amber-400" />
              <div>
                <h3 className="font-semibold">AOG Risk Assessment</h3>
                <p className="text-sm text-gray-400">{aircraft.aogRisk.recommendation}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-400">
                ${(aircraft.aogRisk.totalRiskUsd / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-gray-400">P(failure): {(aircraft.aogRisk.probability * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* ACARS message */}
      {aircraft.acarsMessage && (
        <div className="glass-panel p-4 font-mono text-xs text-emerald-300 bg-emerald-500/5 border border-emerald-500/20 overflow-x-auto">
          <span className="text-gray-500 mr-2">ACARS 220-char:</span>
          {aircraft.acarsMessage}
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-400" /> Active ML Subsystems
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <SubsystemCard 
            title="Turbofan Engine" 
            icon={Thermometer} 
            data={aircraft.engine} 
            description={`BiLSTM+Attention prediction. RUL: ${aircraft.engine.metrics.rulCycles} cycles`} 
          />
          <SubsystemCard 
            title="ECS (Climate)" 
            icon={Wind} 
            data={aircraft.ecs} 
            description={`Thermodynamic simulation. Fouling: ${aircraft.ecs.metrics.foulingPct}%`} 
          />
          <SubsystemCard 
            title="Hydraulics" 
            icon={Droplets} 
            data={aircraft.hydraulics} 
            description="1D Conv Autoencoder anomaly detection" 
          />
          <SubsystemCard 
            title="Landing Gear" 
            icon={ArrowDownToLine} 
            data={aircraft.landingGear} 
            description={`XGBoost Brake Wear: ${aircraft.landingGear.metrics.brakeWearPct}%`} 
          />
          <SubsystemCard 
            title="APU" 
            icon={Zap} 
            data={aircraft.apu} 
            description={`Random Forest EGT Margin: ${aircraft.apu.metrics.egtMargin}°C`} 
          />
        </div>
      </section>

      <section className="pt-8">
        <h2 className="text-xl font-semibold mb-6 text-gray-500 flex items-center gap-2">
          <Activity className="w-5 h-5" /> Phase 2 Integrations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          {['EMA', 'Electrical', 'Battery', 'Structural'].map(sys => (
            <div key={sys} className="glass-panel p-6 border-dashed border-white/20">
              <h3 className="font-semibold text-lg mb-2">{sys}</h3>
              <p className="text-xs text-primary-400 border border-primary-500/30 bg-primary-500/10 inline-block px-2 py-1 rounded">Coming Soon</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
