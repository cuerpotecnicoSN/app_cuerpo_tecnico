import { useState } from 'react';
import { Activity } from 'lucide-react';
import type { PaniniTeamData } from '../../../types/paniniReport';

interface Props {
  homeTeam: PaniniTeamData;
  awayTeam: PaniniTeamData;
}

type CoverageAction =
  | 'recuperaciones'
  | 'faltas'
  | 'acciones_utiles'
  | 'pases_largos'
  | 'regates'
  | 'centros';

export default function TerritorialHeatmapPitch({ homeTeam, awayTeam }: Props) {
  const [selectedAction, setSelectedAction] = useState<CoverageAction>('recuperaciones');
  const [viewMode, setViewMode] = useState<'both' | 'away' | 'home'>('both');

  const getCoverageData = (team: PaniniTeamData, action: CoverageAction) => {
    switch (action) {
      case 'recuperaciones':
        return team.cobertura_recuperaciones;
      case 'faltas':
        return team.cobertura_faltas;
      case 'acciones_utiles':
        return team.cobertura_acciones_utiles;
      case 'pases_largos':
        return team.cobertura_pases_largos;
      case 'regates':
        return team.cobertura_regates;
      case 'centros':
        return team.cobertura_centros;
    }
  };

  const getHeatmapColor = (pct: number, isHomeTeam: boolean) => {
    const alpha = Math.min(Math.max((pct / 50) * 0.7, 0.1), 0.75);
    return isHomeTeam ? `rgba(239, 68, 68, ${alpha})` : `rgba(59, 130, 246, ${alpha})`;
  };

  const renderSinglePitchGrid = (team: PaniniTeamData, isHomeTeam: boolean) => {
    const cov = getCoverageData(team, selectedAction);

    const gridZones = [
      // Attacking Third (Top of pitch)
      { name: 'Atq. Izq', pct: Math.round((cov.ataque_pct * (cov.izquierda_pct / 100)) * 1.5) },
      { name: 'Atq. Centro', pct: Math.round((cov.ataque_pct * (cov.centro_pct / 100)) * 1.5) },
      { name: 'Atq. Dcha', pct: Math.round((cov.ataque_pct * (cov.derecha_pct / 100)) * 1.5) },

      // Middle Third
      { name: 'Medio Izq', pct: Math.round((cov.medio_pct * (cov.izquierda_pct / 100)) * 1.5) },
      { name: 'Medio Centro', pct: Math.round((cov.medio_pct * (cov.centro_pct / 100)) * 1.5) },
      { name: 'Medio Dcho', pct: Math.round((cov.medio_pct * (cov.derecha_pct / 100)) * 1.5) },

      // Defensive Third (Bottom of pitch)
      { name: 'Def. Izq', pct: Math.round((cov.defensa_pct * (cov.izquierda_pct / 100)) * 1.5) },
      { name: 'Def. Centro', pct: Math.round((cov.defensa_pct * (cov.centro_pct / 100)) * 1.5) },
      { name: 'Def. Dcha', pct: Math.round((cov.defensa_pct * (cov.derecha_pct / 100)) * 1.5) },
    ];

    return (
      <div className="flex flex-col items-center space-y-3 w-full">
        {/* Team Header */}
        <div className="flex items-center justify-between w-full px-2">
          <span className={`font-black text-sm flex items-center gap-2 ${isHomeTeam ? 'text-red-500' : 'text-blue-500'}`}>
            <span className={`w-3 h-3 rounded-full ${isHomeTeam ? 'bg-red-500' : 'bg-blue-500'}`} />
            {team.nombre} ({isHomeTeam ? 'Casa' : 'Fuera'})
          </span>
          <span className="text-xs font-bold bg-gray-100 dark:bg-neutral-800 px-2.5 py-1 rounded-full text-gray-600 dark:text-gray-300">
            {team.bloque_tactico_1t.sistema}
          </span>
        </div>

        {/* 3x3 Heatmap Pitch */}
        <div className="relative w-full max-w-[420px] aspect-[68/105] rounded-3xl overflow-hidden shadow-xl border-4 border-emerald-900/40 bg-gradient-to-b from-emerald-800 via-emerald-700 to-emerald-800 select-none">
          
          {/* Pitch lines background */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 150" preserveAspectRatio="none">
            <rect x="5" y="5" width="90" height="140" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" rx="2" />
            <line x1="5" y1="75" x2="95" y2="75" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
            <circle cx="50" cy="75" r="14" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
            <rect x="25" y="5" width="50" height="22" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
            <rect x="25" y="123" width="50" height="22" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
          </svg>

          {/* 3x3 Grid Zones Overlay */}
          <div className="absolute inset-2 grid grid-cols-3 grid-rows-3 gap-1 z-20">
            {gridZones.map((zone, idx) => (
              <div
                key={idx}
                style={{ backgroundColor: getHeatmapColor(zone.pct, isHomeTeam) }}
                className="rounded-xl border border-white/20 backdrop-blur-[1px] flex flex-col items-center justify-center p-1 text-center shadow-inner transition-colors duration-300 hover:border-white/60"
              >
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-tight">
                  {zone.name}
                </span>
                <span className="font-mono font-black text-sm md:text-base text-white drop-shadow-md">
                  {zone.pct}%
                </span>
              </div>
            ))}
          </div>

          {/* Directional Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[9px] font-bold">
            Dirección Ataque ⬆
          </div>
        </div>

        {/* Breakdown Stats Below Pitch */}
        <div className="w-full max-w-[420px] bg-gray-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-2 text-xs">
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-white dark:bg-neutral-800 p-2 rounded-xl shadow-sm">
              <span className="text-gray-400 block text-[9px] font-bold">Defensa</span>
              <span className="font-mono font-black text-gray-800 dark:text-gray-200 text-sm">{cov.defensa_pct}%</span>
            </div>
            <div className="bg-white dark:bg-neutral-800 p-2 rounded-xl shadow-sm">
              <span className="text-gray-400 block text-[9px] font-bold">Medio</span>
              <span className="font-mono font-black text-gray-800 dark:text-gray-200 text-sm">{cov.medio_pct}%</span>
            </div>
            <div className="bg-white dark:bg-neutral-800 p-2 rounded-xl shadow-sm">
              <span className="text-gray-400 block text-[9px] font-bold">Ataque</span>
              <span className="font-mono font-black text-gray-800 dark:text-gray-200 text-sm">{cov.ataque_pct}%</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-white dark:bg-neutral-800 p-2 rounded-xl shadow-sm">
              <span className="text-gray-400 block text-[9px] font-bold">Banda Izq.</span>
              <span className="font-mono font-black text-gray-800 dark:text-gray-200 text-sm">{cov.izquierda_pct}%</span>
            </div>
            <div className="bg-white dark:bg-neutral-800 p-2 rounded-xl shadow-sm">
              <span className="text-gray-400 block text-[9px] font-bold">Centro</span>
              <span className="font-mono font-black text-gray-800 dark:text-gray-200 text-sm">{cov.centro_pct}%</span>
            </div>
            <div className="bg-white dark:bg-neutral-800 p-2 rounded-xl shadow-sm">
              <span className="text-gray-400 block text-[9px] font-bold">Banda Dcha.</span>
              <span className="font-mono font-black text-gray-800 dark:text-gray-200 text-sm">{cov.derecha_pct}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/10">
        <div>
          <h3 className="font-extrabold text-gray-900 dark:text-white text-base flex items-center gap-2">
            <Activity className="text-indigo-600 dark:text-indigo-400" size={20} />
            Campograma: Mapa de Cobertura Territorial y Ocupación Espacial
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Distribución 3x3 por sectores y zonas de influencia según el gesto técnico seleccionado
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 dark:bg-neutral-800 p-1.5 rounded-2xl text-xs font-black border border-gray-200/60 dark:border-white/10 shadow-inner">
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              viewMode === 'both'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            Ambos Equipos
          </button>
          <button
            onClick={() => setViewMode('away')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              viewMode === 'away'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/30 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            {awayTeam.nombre}
          </button>
          <button
            onClick={() => setViewMode('home')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              viewMode === 'home'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-2 ring-red-500/30 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            {homeTeam.nombre}
          </button>
        </div>
      </div>

      {/* Action Selector Pills */}
      <div className="flex bg-gray-100 dark:bg-neutral-800 p-1.5 rounded-2xl gap-1 overflow-x-auto text-xs font-black border border-gray-200/60 dark:border-white/10 shadow-inner">
        {(
          [
            'recuperaciones',
            'acciones_utiles',
            'pases_largos',
            'regates',
            'centros',
            'faltas',
          ] as const
        ).map((act) => (
          <button
            key={act}
            onClick={() => setSelectedAction(act)}
            className={`px-4 py-2 rounded-xl capitalize transition-all whitespace-nowrap cursor-pointer ${
              selectedAction === act
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            {act.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Pitches Display */}
      <div
        className={`grid gap-8 ${
          viewMode === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-lg mx-auto'
        }`}
      >
        {(viewMode === 'both' || viewMode === 'home') && renderSinglePitchGrid(homeTeam, true)}
        {(viewMode === 'both' || viewMode === 'away') && renderSinglePitchGrid(awayTeam, false)}
      </div>
    </div>
  );
}
