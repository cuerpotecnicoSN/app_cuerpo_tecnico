import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, User, ExternalLink, Flame } from 'lucide-react';
import type { PaniniFinishingStats, PaniniShotEvent } from '../../../types/paniniReport';

interface Props {
  homeFinishing: PaniniFinishingStats;
  awayFinishing: PaniniFinishingStats;
  homeTeamName: string;
  awayTeamName: string;
}

export default function ShotMapPitch({
  homeFinishing,
  awayFinishing,
  homeTeamName,
  awayTeamName,
}: Props) {
  const navigate = useNavigate();
  const [selectedTeamKey, setSelectedTeamKey] = useState<'away' | 'home'>('away');
  const [filterResult, setFilterResult] = useState<'todos' | 'gol' | 'a_puerta' | 'otros'>('todos');
  const [selectedShot, setSelectedShot] = useState<PaniniShotEvent | null>(null);

  const isHome = selectedTeamKey === 'home';
  const finishing = isHome ? homeFinishing : awayFinishing;
  const teamName = isHome ? homeTeamName : awayTeamName;

  const rawShots: PaniniShotEvent[] = finishing.remates_detalle || [];
  const shots = rawShots.filter((s: PaniniShotEvent) => {
    if (filterResult === 'todos') return true;
    if (filterResult === 'gol') return s.resultado === 'gol';
    if (filterResult === 'a_puerta') return s.resultado === 'a_puerta';
    if (filterResult === 'otros') return s.resultado === 'fuera' || s.resultado === 'bloqueado';
    return true;
  });

  const totalXg = rawShots.reduce((acc: number, s: PaniniShotEvent) => acc + (s.xg || 0.08), 0).toFixed(2);
  const totalGoals = rawShots.filter((s: PaniniShotEvent) => s.resultado === 'gol').length;

  const navigateToPlayerCard = (playerId?: string) => {
    if (playerId) {
      navigate(`/players/${playerId}?view=ficha`);
    } else {
      navigate(`/players?view=ficha`);
    }
  };

  const getOutcomeStyle = (res: PaniniShotEvent['resultado']) => {
    switch (res) {
      case 'gol':
        return {
          bg: 'bg-amber-400',
          border: 'border-yellow-200',
          text: 'text-black',
          label: 'Gol',
          icon: '⚽',
          ring: 'ring-4 ring-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.8)]',
        };
      case 'a_puerta':
        return {
          bg: 'bg-emerald-500',
          border: 'border-white',
          text: 'text-white',
          label: 'A puerta / Parada',
          icon: '🎯',
          ring: 'ring-2 ring-emerald-300',
        };
      case 'bloqueado':
        return {
          bg: 'bg-amber-600',
          border: 'border-white',
          text: 'text-white',
          label: 'Bloqueado',
          icon: '🛡️',
          ring: 'ring-1 ring-amber-400',
        };
      case 'fuera':
      default:
        return {
          bg: 'bg-rose-500',
          border: 'border-white',
          text: 'text-white',
          label: 'Fuera',
          icon: '❌',
          ring: 'ring-1 ring-rose-300',
        };
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/10">
        <div>
          <h3 className="font-extrabold text-gray-900 dark:text-white text-base flex items-center gap-2">
            <Crosshair className="text-red-500" size={20} />
            Campograma: Mapa de Remates, xG y Finalización
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Ubicación espacial de cada remate, probabilidad de gol esperada (xG) y efectividad ofensiva
          </p>
        </div>

        {/* Team Selector */}
        <div className="flex bg-gray-100 dark:bg-neutral-800 p-1.5 rounded-2xl border border-gray-200/60 dark:border-white/10 shadow-inner">
          <button
            onClick={() => { setSelectedTeamKey('away'); setSelectedShot(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              selectedTeamKey === 'away'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/30 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${selectedTeamKey === 'away' ? 'bg-white' : 'bg-blue-400'}`} />
            {awayTeamName} ({awayFinishing.tiros_totales} tiros)
          </button>
          <button
            onClick={() => { setSelectedTeamKey('home'); setSelectedShot(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              selectedTeamKey === 'home'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-2 ring-red-500/30 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${selectedTeamKey === 'home' ? 'bg-white' : 'bg-red-400'}`} />
            {homeTeamName} ({homeFinishing.tiros_totales} tiros)
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex bg-gray-100 dark:bg-neutral-800 p-1.5 rounded-xl gap-1 text-xs border border-gray-200/60 dark:border-white/10 shadow-inner">
          <button
            onClick={() => setFilterResult('todos')}
            className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
              filterResult === 'todos' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30 scale-[1.02]' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            Todos ({rawShots.length})
          </button>
          <button
            onClick={() => setFilterResult('gol')}
            className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
              filterResult === 'gol' 
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 ring-2 ring-amber-400/30 scale-[1.02]' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            ⚽ Goles ({rawShots.filter((s: PaniniShotEvent) => s.resultado === 'gol').length})
          </button>
          <button
            onClick={() => setFilterResult('a_puerta')}
            className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
              filterResult === 'a_puerta' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/30 scale-[1.02]' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            🎯 A puerta ({rawShots.filter((s: PaniniShotEvent) => s.resultado === 'a_puerta').length})
          </button>
          <button
            onClick={() => setFilterResult('otros')}
            className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
              filterResult === 'otros' 
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500/30 scale-[1.02]' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            Fuera / Bloqueados ({rawShots.filter((s: PaniniShotEvent) => s.resultado === 'fuera' || s.resultado === 'bloqueado').length})
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-bold text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Gol</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> A puerta</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Fuera</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-600" /> Bloqueado</span>
        </div>
      </div>

      {/* Main Grid: Campograma of Attacking Half + Details Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Attacking Half Campograma */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="relative w-full max-w-[580px] aspect-[68/60] rounded-3xl overflow-hidden shadow-2xl border-4 border-emerald-900/40 bg-gradient-to-b from-emerald-700 via-emerald-800 to-emerald-900 select-none">
            
            {/* SVG Markings for Attacking Half */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 80" preserveAspectRatio="none">
              {/* Outer border */}
              <rect x="5" y="5" width="90" height="70" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" rx="2" />
              
              {/* Grass stripes */}
              {[...Array(5)].map((_, i) => (
                <rect
                  key={i}
                  x="5"
                  y={5 + i * (70 / 5)}
                  width="90"
                  height={70 / 5}
                  fill={i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'}
                />
              ))}

              {/* Goal line & Goal Net at Top */}
              <rect x="38" y="2" width="24" height="3" fill="rgba(255,255,255,0.8)" stroke="#ffffff" strokeWidth="0.5" />
              <line x1="38" y1="5" x2="62" y2="5" stroke="#ffffff" strokeWidth="1.2" />

              {/* Penalty Box (Area Grande) */}
              <rect x="22" y="5" width="56" height="32" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />

              {/* 6-Yard Box (Area Pequeña) */}
              <rect x="36" y="5" width="28" height="11" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />

              {/* Penalty Spot */}
              <circle cx="50" cy="22" r="0.9" fill="rgba(255,255,255,0.8)" />

              {/* Penalty Arc */}
              <path d="M 38 37 A 12 12 0 0 0 62 37" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />

              {/* Halfway Line at Bottom */}
              <line x1="5" y1="75" x2="95" y2="75" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
              <path d="M 36 75 A 14 14 0 0 1 64 75" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
            </svg>

            {/* Top HUD */}
            <div className="absolute top-2 left-3 right-3 flex justify-between items-center text-[10px] font-bold text-white/90 z-20 pointer-events-none">
              <span className="bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                Portería Rival 🥅
              </span>
              <span className="bg-red-500/80 text-white px-2.5 py-1 rounded-full font-black">
                Total xG: {totalXg} ({totalGoals} goles)
              </span>
            </div>

            {/* Shots Plotted on Pitch */}
            {shots.map((shot: PaniniShotEvent) => {
              const xPos = shot.x ?? 50;
              const yVal = shot.y ?? 75;
              const yPos = 10 + (100 - yVal) * 1.3;
              const style = getOutcomeStyle(shot.resultado);
              const isSelected = selectedShot?.id === shot.id;
              const xgSize = shot.xg ? Math.min(Math.max(shot.xg * 36, 22), 40) : 26;

              return (
                <div
                  key={shot.id}
                  onClick={() => setSelectedShot(shot)}
                  style={{
                    left: `${xPos}%`,
                    top: `${yPos}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute z-30 flex flex-col items-center cursor-pointer transition-all duration-200 ${
                    isSelected ? 'scale-125 z-40' : 'hover:scale-110'
                  }`}
                >
                  {/* Shot Marker */}
                  <div
                    style={{ width: `${xgSize}px`, height: `${xgSize}px` }}
                    className={`rounded-full flex items-center justify-center font-black text-xs shadow-2xl border-2 transition-all ${
                      style.bg
                    } ${style.border} ${style.text} ${style.ring} ${
                      isSelected ? 'ring-4 ring-yellow-400' : ''
                    }`}
                  >
                    {style.icon}
                  </div>

                  {/* Shooter Tag */}
                  <div className="mt-1 px-1.5 py-0.5 bg-black/80 backdrop-blur-sm text-white rounded text-[9px] font-extrabold whitespace-nowrap shadow-md border border-white/10 flex items-center gap-1">
                    <span>{shot.minuto}</span>
                    <span className="text-amber-300 font-bold">{shot.jugador.split(' ').pop()}</span>
                    {shot.xg && <span className="text-gray-400 text-[8px]">({shot.xg})</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            💡 El tamaño del círculo representa el valor xG (probabilidad de gol). Haz clic en un remate para ver su ficha.
          </span>
        </div>

        {/* Selected Shot Info Card */}
        <div className="lg:col-span-4 space-y-4">
          {selectedShot ? (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl border border-indigo-500/30 space-y-4 animate-scale-in">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-amber-400 text-black rounded-full text-[10px] font-black uppercase tracking-wider">
                      Minuto {selectedShot.minuto}
                    </span>
                    <span className="px-2 py-0.5 bg-white/10 text-xs font-bold rounded-full">
                      Dorsal #{selectedShot.dorsal}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xl text-white mt-2">
                    {selectedShot.jugador}
                  </h4>
                  <span className="text-xs text-indigo-200 capitalize font-medium">
                    Resultado: {getOutcomeStyle(selectedShot.resultado).label}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-2xl">
                  {getOutcomeStyle(selectedShot.resultado).icon}
                </div>
              </div>

              {/* Shot Details Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-white/5 p-3 rounded-2xl border border-white/10">
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">xG (Gol Esperado):</span>
                  <span className="font-mono font-black text-lg text-amber-300">
                    {selectedShot.xg ?? 0.12}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Tipo de Remate:</span>
                  <span className="font-bold text-white capitalize">
                    {selectedShot.tipo.replace('_', ' ')}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-white/10">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Origen de la Jugada:</span>
                  <span className="font-bold text-indigo-200 capitalize">
                    {selectedShot.origen.replace('_', ' ')} ({selectedShot.zona.replace('_', ' ')})
                  </span>
                </div>
              </div>

              {/* Direct Profile Link */}
              <button
                onClick={() => navigateToPlayerCard(selectedShot.player_id)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs py-3 px-4 rounded-xl shadow-lg transition-all"
              >
                <User size={15} />
                <span>Ver Tarjeta de {selectedShot.jugador}</span>
                <ExternalLink size={14} />
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-3xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 space-y-3">
              <h4 className="font-black text-sm uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                <Flame size={16} className="text-red-500" /> Rendimiento en Finalización
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Selecciona cualquier remate sobre el campograma para revisar el contexto táctico, xG y acceder a la ficha del rematador.
              </p>
            </div>
          )}

          {/* Finishing Summary KPI Box */}
          <div className="bg-gray-50 dark:bg-neutral-800/40 p-5 rounded-3xl border border-gray-200 dark:border-white/10 space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 pb-2 border-b border-gray-200 dark:border-white/10">
              Desglose de Remates ({teamName})
            </h4>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white dark:bg-neutral-800 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
                <span className="text-gray-400 text-[10px] block font-bold">En Jugada</span>
                <span className="font-mono font-black text-gray-900 dark:text-white text-base">
                  {finishing.llegada_jugada}
                </span>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
                <span className="text-gray-400 text-[10px] block font-bold">ABP Ind.</span>
                <span className="font-mono font-black text-gray-900 dark:text-white text-base">
                  {finishing.llegada_abp_indirecto}
                </span>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
                <span className="text-gray-400 text-[10px] block font-bold">ABP Dir.</span>
                <span className="font-mono font-black text-gray-900 dark:text-white text-base">
                  {finishing.llegada_abp_directo}
                </span>
              </div>
            </div>

            {/* ABP Details */}
            <div className="p-3 bg-white dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-white/5 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Córners Izq / Dcha:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {finishing.abp_corners_izquierda} / {finishing.abp_corners_derecha}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Faltas Laterales:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {finishing.abp_faltas_izquierda + finishing.abp_faltas_derecha}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
