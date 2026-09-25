import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ExternalLink, Shield, Swords } from 'lucide-react';
import type { PaniniTeamData, PaniniPlayerLineup } from '../../../types/paniniReport';

interface Props {
  homeTeam: PaniniTeamData;
  awayTeam: PaniniTeamData;
}

interface PlayerBadgeConfig {
  dorsal: number;
  name: string;
  x: number;
  y: number;
  role: 'P' | 'D' | 'C' | 'A';
  badgePosition: 'above' | 'below';
}

// Configuración visual exacta extraída del campograma Panini de Milan Futuro (Image 1)
const MILAN_FUTURO_PANINI_PLAYERS: PlayerBadgeConfig[] = [
  { dorsal: 1, name: 'Pittarella', x: 85.8, y: 48.0, role: 'P', badgePosition: 'above' },
  { dorsal: 2, name: 'Cappelletti', x: 65.5, y: 22.5, role: 'D', badgePosition: 'above' },
  { dorsal: 4, name: 'Zukic', x: 71.8, y: 39.0, role: 'D', badgePosition: 'above' },
  { dorsal: 5, name: 'Vladimirov', x: 77.8, y: 69.5, role: 'D', badgePosition: 'below' },
  { dorsal: 3, name: 'Borsani', x: 57.5, y: 74.5, role: 'D', badgePosition: 'below' },
  { dorsal: 6, name: 'Cissé', x: 59.8, y: 57.5, role: 'C', badgePosition: 'below' },
  { dorsal: 8, name: 'Pandolfi', x: 63.8, y: 47.5, role: 'C', badgePosition: 'above' },
  { dorsal: 11, name: 'Ossola', x: 50.5, y: 26.0, role: 'C', badgePosition: 'above' },
  { dorsal: 7, name: 'Sala', x: 38.2, y: 29.5, role: 'A', badgePosition: 'above' },
  { dorsal: 9, name: 'Asanji', x: 39.0, y: 47.8, role: 'A', badgePosition: 'above' },
  { dorsal: 10, name: 'Vos', x: 42.5, y: 62.0, role: 'A', badgePosition: 'below' },
];

// Configuración visual exacta para Villa Valle
const VILLA_VALLE_PANINI_PLAYERS: PlayerBadgeConfig[] = [
  { dorsal: 35, name: 'Offredi', x: 13.8, y: 59.0, role: 'P', badgePosition: 'above' },
  { dorsal: 4, name: 'Lancini', x: 42.0, y: 43.0, role: 'D', badgePosition: 'above' },
  { dorsal: 24, name: 'Crotti', x: 40.0, y: 67.0, role: 'D', badgePosition: 'below' },
  { dorsal: 25, name: 'Marocco', x: 55.0, y: 83.0, role: 'D', badgePosition: 'below' },
  { dorsal: 8, name: 'Serena', x: 50.5, y: 56.0, role: 'C', badgePosition: 'above' },
  { dorsal: 30, name: 'Perrotti', x: 57.0, y: 30.0, role: 'C', badgePosition: 'above' },
  { dorsal: 21, name: 'Danieli', x: 59.0, y: 39.0, role: 'C', badgePosition: 'above' },
  { dorsal: 28, name: 'Rinaldi', x: 59.0, y: 69.0, role: 'C', badgePosition: 'below' },
  { dorsal: 20, name: 'Strechie', x: 63.5, y: 63.0, role: 'C', badgePosition: 'below' },
  { dorsal: 14, name: "D'Amuri", x: 68.0, y: 53.0, role: 'A', badgePosition: 'above' },
  { dorsal: 7, name: 'Ravasi', x: 68.0, y: 60.0, role: 'A', badgePosition: 'below' },
];

// Coordenadas exactas para el campograma de Confronto (Image 2)
const CONFRONTO_COORDS_VILLA_VALLE: Record<number, { x: number; y: number }> = {
  35: { x: 13.8, y: 59.0 },
  4: { x: 42.0, y: 43.0 },
  24: { x: 40.0, y: 67.0 },
  8: { x: 50.5, y: 56.0 },
  30: { x: 57.0, y: 30.0 },
  21: { x: 59.0, y: 39.0 },
  28: { x: 59.0, y: 69.0 },
  20: { x: 63.5, y: 63.0 },
  14: { x: 68.0, y: 53.0 },
  7: { x: 68.0, y: 60.0 },
  25: { x: 55.0, y: 83.0 },
};

const CONFRONTO_COORDS_MILAN_FUTURO: Record<number, { x: number; y: number }> = {
  1: { x: 89.0, y: 53.0 },
  4: { x: 77.0, y: 43.0 },
  5: { x: 77.0, y: 73.0 },
  2: { x: 53.0, y: 27.0 },
  7: { x: 63.5, y: 36.0 },
  6: { x: 62.5, y: 56.0 },
  8: { x: 57.5, y: 59.0 },
  9: { x: 46.5, y: 46.0 },
  11: { x: 44.5, y: 53.0 },
  10: { x: 48.5, y: 66.0 },
  3: { x: 53.0, y: 73.0 },
};

export default function TacticalFormationPitch({ homeTeam, awayTeam }: Props) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'away_detail' | 'home_detail' | 'confronto'>('away_detail');
  const [selectedPlayer, setSelectedPlayer] = useState<{
    player: PaniniPlayerLineup;
    teamName: string;
    isHome: boolean;
  } | null>(null);

  const getRoleColors = (role: 'P' | 'D' | 'C' | 'A') => {
    switch (role) {
      case 'P':
        return { bg: '#9da3a8', text: '#000000', label: 'Portiere' };
      case 'D':
        return { bg: '#ffea00', text: '#000000', label: 'Difensore' };
      case 'C':
        return { bg: '#f99d42', text: '#000000', label: 'Centrocampista' };
      case 'A':
      default:
        return { bg: '#e50914', text: '#ffffff', label: 'Attaccante' };
    }
  };

  const navigateToPlayerCard = (playerId?: string) => {
    if (playerId) {
      navigate(`/players/${playerId}?view=ficha`);
    } else {
      navigate(`/players?view=ficha`);
    }
  };

  const isAway = viewMode === 'away_detail';
  const currentTeam = isAway ? awayTeam : homeTeam;
  const currentBlock = currentTeam.bloque_tactico_1t;
  const playerConfigs = isAway ? MILAN_FUTURO_PANINI_PLAYERS : VILLA_VALLE_PANINI_PLAYERS;

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-6">
      
      {/* Top View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/10">
        <div>
          <h3 className="font-extrabold text-gray-900 dark:text-white text-base flex items-center gap-2">
            <Shield className="text-indigo-600 dark:text-indigo-400" size={20} />
            Campograma Panini: Posicionamiento Medio Oficial
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Réplica exacta de los campogramas de posicionamiento medio y duelo táctico de Panini Digital
          </p>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex bg-gray-100 dark:bg-neutral-800 p-1.5 rounded-2xl text-xs font-black border border-gray-200/60 dark:border-white/10 shadow-inner">
          <button
            onClick={() => { setViewMode('away_detail'); setSelectedPlayer(null); }}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'away_detail'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/30 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${viewMode === 'away_detail' ? 'bg-white' : 'bg-blue-400'}`} />
            {awayTeam.nombre} ({awayTeam.bloque_tactico_1t.sistema})
          </button>
          <button
            onClick={() => { setViewMode('home_detail'); setSelectedPlayer(null); }}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'home_detail'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-2 ring-red-500/30 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${viewMode === 'home_detail' ? 'bg-white' : 'bg-red-400'}`} />
            {homeTeam.nombre} ({homeTeam.bloque_tactico_1t.sistema})
          </button>
          <button
            onClick={() => { setViewMode('confronto'); setSelectedPlayer(null); }}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'confronto'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            <Swords size={14} />
            Duelo Táctico (Ambos Equipos)
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VISTA 1: POSICIONAMIENTO MEDIO INDIVIDUAL (Image 1)      */}
      {/* ======================================================== */}
      {viewMode !== 'confronto' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          
          {/* 1. Header Oficial Panini: Leyenda + Sistema + Nombre Equipo */}
          <div className="space-y-3">
            {/* Role Legend Pills */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <span className="px-5 py-1 rounded-xl border border-black font-bold text-xs bg-[#9da3a8] text-black shadow-sm">
                Portiere
              </span>
              <span className="px-5 py-1 rounded-xl border border-black font-bold text-xs bg-[#ffea00] text-black shadow-sm">
                Difensore
              </span>
              <span className="px-5 py-1 rounded-xl border border-black font-bold text-xs bg-[#f99d42] text-black shadow-sm">
                Centrocampista
              </span>
              <span className="px-5 py-1 rounded-xl border border-black font-bold text-xs bg-[#e50914] text-white shadow-sm">
                Attaccante
              </span>
            </div>

            {/* Sistema & Team Title */}
            <div className="flex items-center justify-between px-6 pt-2">
              <span className="font-extrabold text-2xl text-black dark:text-white font-mono">
                {currentBlock.sistema}
              </span>
              <h2 className="font-black text-2xl md:text-3xl text-[#001f7a] dark:text-blue-400 tracking-wider uppercase">
                {currentTeam.nombre}
              </h2>
              <span className="w-12"></span>
            </div>
          </div>

          {/* 2. El Campograma Panini (Horizontal con Cotas y Sectores) */}
          <div className="relative bg-white dark:bg-neutral-900 p-2 md:p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-lg">
            
            <div className="relative w-full aspect-[100/62] rounded-xl overflow-hidden border-2 border-gray-400 bg-[#e2f2d5] select-none">
              
              {/* Pitch Texture & Diagonal Hatches Background */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.25) 2px, transparent 2px, transparent 8px)'
                }}
              />

              {/* Shaded Heatmap Sectors (Exact Green Overlays from Image 1) */}
              {isAway && (
                <>
                  {/* Top-right block (Cappelletti area) */}
                  <div className="absolute left-[56.5%] top-[3%] w-[20%] h-[26%] bg-[#00a800] opacity-95 pointer-events-none" />
                  {/* Center-right block (Zukic & Pandolfi area) */}
                  <div className="absolute left-[66.5%] top-[29%] w-[10%] h-[27%] bg-[#00a800] opacity-95 pointer-events-none" />
                  {/* Bottom-right block (Vladimirov area) */}
                  <div className="absolute left-[66.5%] top-[56%] w-[14%] h-[24%] bg-[#007500] opacity-95 pointer-events-none" />
                  {/* Goalmouth deep right block (Pittarella area) */}
                  <div className="absolute left-[81.5%] top-[41%] w-[13%] h-[16%] bg-[#004800] opacity-95 pointer-events-none" />
                </>
              )}

              {/* SVG Pitch Markings */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 62" preserveAspectRatio="none">
                {/* Center Halfway Line */}
                <line x1="50" y1="3" x2="50" y2="59" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                
                {/* Center Circle & Spot */}
                <circle cx="50" cy="31" r="9" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                <circle cx="50" cy="31" r="0.7" fill="rgba(255,255,255,0.9)" />

                {/* Left Penalty Area */}
                <rect x="3" y="16" width="14.5" height="30" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                <rect x="3" y="23" width="5" height="16" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                <circle cx="12" cy="31" r="0.7" fill="rgba(255,255,255,0.9)" />
                <path d="M 17.5 25 A 9 9 0 0 1 17.5 37" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />

                {/* Right Penalty Area */}
                <rect x="82.5" y="16" width="14.5" height="30" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                <rect x="92" y="23" width="5" height="16" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                <circle cx="88" cy="31" r="0.7" fill="rgba(255,255,255,0.9)" />
                <path d="M 82.5 25 A 9 9 0 0 0 82.5 37" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              </svg>

              {/* Trademark Top Right */}
              <div className="absolute top-2 right-4 text-[11px] font-bold text-black pointer-events-none">
                ©Panini Digital
              </div>

              {/* Team Crest Bottom Right */}
              <div className="absolute bottom-2 right-3 w-12 h-12 pointer-events-none z-20">
                {isAway ? (
                  <div className="w-11 h-11 rounded-full bg-white border-2 border-black p-0.5 shadow-md flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-black flex flex-col items-center justify-center text-[7px] text-white font-black leading-tight border border-red-600">
                      <span>ACM</span>
                      <span className="text-[6px] text-red-500">1899</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-full bg-white border-2 border-red-600 shadow-md flex items-center justify-center font-black text-red-700 text-xs">
                    VV
                  </div>
                )}
              </div>

              {/* Left Vertical Dimension Bracket (mt 39,2) */}
              <div className="absolute left-2 top-[24%] bottom-[26%] w-8 flex items-center justify-center pointer-events-none z-20">
                <div className="w-2 h-full border-l-2 border-y-2 border-black" />
                <span className="absolute -left-2 top-1/2 -translate-y-1/2 bg-white/95 px-1 py-0.2 rounded text-[10px] font-black text-black font-mono shadow-sm whitespace-nowrap -rotate-90 border border-black/20">
                  mt {currentBlock.anchura_m || '39,2'}
                </span>
              </div>

              {/* Bottom Horizontal Dimension Bracket (mt 41,6) */}
              <div className="absolute bottom-1.5 left-[42%] right-[22%] h-6 flex items-center justify-center pointer-events-none z-20">
                <div className="h-2 w-full border-b-2 border-x-2 border-black" />
                <span className="absolute bottom-1 bg-white/95 px-1.5 py-0.2 rounded text-[10px] font-black text-black font-mono shadow-sm border border-black/20">
                  mt {currentBlock.longitud_m || '41,6'}
                </span>
              </div>

              {/* Plotted Players (Horizontal Coordinates) */}
              {playerConfigs.map((cfg) => {
                const colors = getRoleColors(cfg.role);
                const isSelected = selectedPlayer?.player.dorsal === cfg.dorsal;
                const dbPlayer = currentTeam.alineacion.find(p => p.dorsal === cfg.dorsal);

                return (
                  <div
                    key={cfg.dorsal}
                    onClick={() =>
                      setSelectedPlayer({
                        player: dbPlayer || {
                          dorsal: cfg.dorsal,
                          nombre: cfg.name,
                          posicion: cfg.role,
                          posicion_desc: colors.label,
                          minutos_jugados: 96,
                          es_titular: true,
                        },
                        teamName: currentTeam.nombre,
                        isHome: !isAway,
                      })
                    }
                    style={{
                      left: `${cfg.x}%`,
                      top: `${cfg.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute z-30 flex flex-col items-center cursor-pointer transition-all duration-200 ${
                      isSelected ? 'scale-125 z-40' : 'hover:scale-110'
                    }`}
                  >
                    {/* Name Pill (Above circle if badgePosition === 'above') */}
                    {cfg.badgePosition === 'above' && (
                      <div
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                        }}
                        className="px-2.5 py-0.5 rounded-md border border-black text-[10px] font-black tracking-tight shadow-md whitespace-nowrap mb-0.5"
                      >
                        {cfg.name}
                      </div>
                    )}

                    {/* Number Circle */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-md transition-all ${
                        cfg.role === 'P'
                          ? 'bg-[#9da3a8] text-black border-2 border-black'
                          : isAway
                          ? 'bg-[#001f7a] text-white border-2 border-white'
                          : 'bg-red-700 text-white border-2 border-white'
                      } ${isSelected ? 'ring-4 ring-yellow-400' : ''}`}
                    >
                      {cfg.dorsal}
                    </div>

                    {/* Name Pill (Below circle if badgePosition === 'below') */}
                    {cfg.badgePosition === 'below' && (
                      <div
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                        }}
                        className="px-2.5 py-0.5 rounded-md border border-black text-[10px] font-black tracking-tight shadow-md whitespace-nowrap mt-0.5"
                      >
                        {cfg.name}
                      </div>
                    )}
                  </div>
                );
              })}

            </div>

            {/* Outer Axes Values (Outside the pitch border) */}
            <div className="flex justify-between items-center px-4 pt-2 text-xs font-black font-mono text-black dark:text-white">
              <div className="flex items-center gap-12">
                <span>%</span>
                <span>{currentBlock.densidad_ataque_pct || '12,3'}</span>
              </div>
              <div>
                <span>{currentBlock.densidad_medio_pct || '37,7'}</span>
              </div>
              <div className="pr-12">
                <span>{currentBlock.densidad_defensa_pct || '50,0'}</span>
              </div>
            </div>

          </div>

          {/* Selected Player Interactive Card */}
          {selectedPlayer && (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4 shadow-xl border border-indigo-500/30 animate-scale-in">
              <div className="flex items-center gap-4">
                <div
                  style={{
                    backgroundColor: getRoleColors(selectedPlayer.player.posicion as any).bg,
                    color: getRoleColors(selectedPlayer.player.posicion as any).text,
                  }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border-2 border-black shadow-md"
                >
                  {selectedPlayer.player.dorsal}
                </div>
                <div>
                  <h4 className="font-extrabold text-lg text-white">{selectedPlayer.player.nombre}</h4>
                  <span className="text-xs text-indigo-300 font-medium">
                    {selectedPlayer.teamName} • {selectedPlayer.player.posicion_desc || 'Titular'} • Minutos: {selectedPlayer.player.minutos_jugados}'
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigateToPlayerCard(selectedPlayer.player.player_id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg transition-all"
              >
                <User size={15} />
                <span>Ver Tarjeta de Jugador en Datos</span>
                <ExternalLink size={14} />
              </button>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 2: DUELO TÁCTICO / AMBOS EQUIPOS (Image 2)         */}
      {/* ======================================================== */}
      {viewMode === 'confronto' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          
          {/* Header con Entrenadores */}
          <div className="grid grid-cols-2 gap-4 px-4 text-center">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-bold block">Allenatore</span>
              <h3 className="font-black text-xl text-black dark:text-white">Marco Sgrò</h3>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-bold block">Allenatore</span>
              <h3 className="font-black text-xl text-black dark:text-white">Sergio Navarro</h3>
            </div>
          </div>

          {/* Duelo Táctico Pitch */}
          <div className="relative bg-white dark:bg-neutral-900 p-2 md:p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-lg">
            <div className="relative w-full aspect-[100/62] rounded-xl overflow-hidden border-2 border-gray-400 bg-[#a7d7a9] select-none">
              
              {/* SVG Markings */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 62" preserveAspectRatio="none">
                <line x1="50" y1="3" x2="50" y2="59" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                <circle cx="50" cy="31" r="9" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                <circle cx="50" cy="31" r="0.7" fill="rgba(255,255,255,0.9)" />
                <rect x="3" y="16" width="14.5" height="30" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                <rect x="82.5" y="16" width="14.5" height="30" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              </svg>

              {/* Trademark */}
              <div className="absolute top-2 right-4 text-[11px] font-bold text-black pointer-events-none">
                ©Panini Digital
              </div>

              {/* Crests */}
              <div className="absolute top-3 left-3 w-12 h-12 bg-white/95 rounded-lg border border-gray-300 p-1 shadow-md flex items-center justify-center pointer-events-none z-20">
                <div className="w-full h-full bg-red-600 text-white font-black text-[9px] flex items-center justify-center rounded">
                  VV
                </div>
              </div>
              <div className="absolute bottom-3 right-3 w-12 h-12 bg-white/95 rounded-lg border border-gray-300 p-1 shadow-md flex items-center justify-center pointer-events-none z-20">
                <div className="w-full h-full bg-black text-white font-black text-[9px] flex items-center justify-center rounded border border-red-600">
                  ACM
                </div>
              </div>

              {/* Villa Valle Players (Red Circles with White Numbers) */}
              {Object.entries(CONFRONTO_COORDS_VILLA_VALLE).map(([dorsalStr, coords]) => {
                const dorsal = Number(dorsalStr);
                const isGK = dorsal === 35;
                const dbPlayer = homeTeam.alineacion.find(p => p.dorsal === dorsal);

                return (
                  <div
                    key={`vv-${dorsal}`}
                    onClick={() =>
                      setSelectedPlayer({
                        player: dbPlayer || {
                          dorsal,
                          nombre: `Jugador #${dorsal}`,
                          posicion: isGK ? 'P' : 'C',
                          posicion_desc: isGK ? 'Portero' : 'Titular',
                          minutos_jugados: 96,
                          es_titular: true,
                        },
                        teamName: homeTeam.nombre,
                        isHome: true,
                      })
                    }
                    style={{
                      left: `${coords.x}%`,
                      top: `${coords.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="absolute z-30 cursor-pointer hover:scale-125 transition-transform"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-lg ${
                        isGK
                          ? 'bg-[#9da3a8] text-black border-2 border-red-600'
                          : 'bg-red-600 text-white border-2 border-white'
                      }`}
                    >
                      {dorsal}
                    </div>
                  </div>
                );
              })}

              {/* Milan Futuro Players (Blue Circles with White Numbers) */}
              {Object.entries(CONFRONTO_COORDS_MILAN_FUTURO).map(([dorsalStr, coords]) => {
                const dorsal = Number(dorsalStr);
                const isGK = dorsal === 1;
                const dbPlayer = awayTeam.alineacion.find(p => p.dorsal === dorsal);

                return (
                  <div
                    key={`mf-${dorsal}`}
                    onClick={() =>
                      setSelectedPlayer({
                        player: dbPlayer || {
                          dorsal,
                          nombre: `Jugador #${dorsal}`,
                          posicion: isGK ? 'P' : 'C',
                          posicion_desc: isGK ? 'Portero' : 'Titular',
                          minutos_jugados: 96,
                          es_titular: true,
                        },
                        teamName: awayTeam.nombre,
                        isHome: false,
                      })
                    }
                    style={{
                      left: `${coords.x}%`,
                      top: `${coords.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="absolute z-30 cursor-pointer hover:scale-125 transition-transform"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-lg ${
                        isGK
                          ? 'bg-[#9da3a8] text-black border-2 border-blue-900'
                          : 'bg-[#001f7a] text-white border-2 border-white'
                      }`}
                    >
                      {dorsal}
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          {/* Selected Player Interactive Card in Confronto */}
          {selectedPlayer && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-4 max-w-xl mx-auto shadow-lg border border-white/10 animate-fade-in">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-base shadow-inner ${
                    selectedPlayer.isHome ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                  }`}
                >
                  {selectedPlayer.player.dorsal}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">{selectedPlayer.player.nombre}</h4>
                  <span className="text-xs text-gray-400">
                    {selectedPlayer.teamName} • {selectedPlayer.player.posicion_desc || 'Titular'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigateToPlayerCard(selectedPlayer.player.player_id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all"
              >
                <User size={14} /> Ver Ficha
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
