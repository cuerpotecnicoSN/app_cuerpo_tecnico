import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  User, 
  ExternalLink,
  Shield
} from 'lucide-react';
import type { PaniniTeamData, PaniniPlayerLineup } from '../../../types/paniniReport';

interface Props {
  homeTeam: PaniniTeamData;
  awayTeam: PaniniTeamData;
}

// Coordenadas exactas del posicionamiento medio de los dos equipos
const AVERAGE_POSITIONS_HOME: Record<number, { x: number; y: number; label: string }> = {
  35: { x: 13.8, y: 53.0, label: 'Offredi' },
  4:  { x: 40.0, y: 35.0, label: 'Nava' },
  24: { x: 38.0, y: 62.0, label: 'Piacentini' },
  25: { x: 52.5, y: 81.0, label: 'Martinelli' },
  30: { x: 54.5, y: 19.0, label: 'Caccia' },
  8:  { x: 48.0, y: 50.0, label: 'Serena' },
  20: { x: 60.5, y: 57.0, label: 'Strechie' },
  21: { x: 56.5, y: 31.0, label: 'Danieli' },
  28: { x: 56.5, y: 65.0, label: 'Rinaldi' },
  7:  { x: 64.5, y: 53.5, label: 'Ravasi' },
  14: { x: 64.5, y: 46.5, label: "D'Amuri" },
};

const AVERAGE_POSITIONS_AWAY: Record<number, { x: number; y: number; label: string }> = {
  1:  { x: 85.5, y: 47.0, label: 'Pittarella' },
  2:  { x: 50.5, y: 16.0, label: 'Cappelletti' },
  4:  { x: 73.0, y: 35.0, label: 'Zukic' },
  5:  { x: 73.0, y: 69.0, label: 'Vladimirov' },
  3:  { x: 50.5, y: 70.0, label: 'Borsani' },
  6:  { x: 59.5, y: 50.0, label: 'Cissé' },
  8:  { x: 54.5, y: 53.5, label: 'Pandolfi' },
  11: { x: 42.5, y: 46.5, label: 'Ossola' },
  7:  { x: 60.5, y: 27.0, label: 'Sala' },
  9:  { x: 44.5, y: 38.0, label: 'Asanji' },
  10: { x: 46.0, y: 62.0, label: 'Vos' },
};

export default function PaniniLineupsView({ homeTeam, awayTeam }: Props) {
  const navigate = useNavigate();
  const [selectedPlayer, setSelectedPlayer] = useState<{
    player: PaniniPlayerLineup;
    teamName: string;
    isHome: boolean;
  } | null>(null);

  const navigateToPlayerCard = (playerId?: string) => {
    if (playerId) {
      navigate(`/players/${playerId}?view=ficha`);
    } else {
      navigate(`/players?view=ficha`);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-gray-800 dark:text-gray-100">
      
      {/* 1. Campograma de Posicionamiento Medio Oficial */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-100 dark:border-white/10">
          <div>
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="text-indigo-600 dark:text-indigo-400" size={18} />
              Campograma de Posicionamiento Medio
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Posición promedio en el campo donde cada jugador entró en contacto con el balón.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-black">●</span>
              {homeTeam.nombre} (Ataque hacia la derecha ➔)
            </span>
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <span className="w-3.5 h-3.5 rounded-full bg-[#001f7a] text-white flex items-center justify-center text-[9px] font-black">●</span>
              {awayTeam.nombre} (⬅ Ataque hacia la izquierda)
            </span>
          </div>
        </div>

        {/* The Pitch Container */}
        <div className="relative w-full max-w-4xl mx-auto aspect-[100/60] rounded-2xl overflow-hidden border-2 border-gray-300 dark:border-white/20 bg-[#a7d7a9] select-none shadow-xl">
          
          {/* SVG Pitch Markings */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 60" preserveAspectRatio="none">
            {/* Outer line */}
            <rect x="2" y="2" width="96" height="56" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.75" />
            
            {/* Halfway line */}
            <line x1="50" y1="2" x2="50" y2="58" stroke="rgba(255,255,255,0.9)" strokeWidth="0.75" />
            
            {/* Center Circle & Spot */}
            <circle cx="50" cy="30" r="9" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.75" />
            <circle cx="50" cy="30" r="0.6" fill="rgba(255,255,255,0.9)" />

            {/* Left Box (Home Area) */}
            <rect x="2" y="14" width="14" height="32" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.75" />
            <rect x="2" y="21" width="5" height="18" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.75" />
            <circle cx="10" cy="30" r="0.6" fill="rgba(255,255,255,0.9)" />
            <path d="M 16 23 A 8.5 8.5 0 0 1 16 37" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.75" />

            {/* Right Box (Away Area) */}
            <rect x="84" y="14" width="14" height="32" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.75" />
            <rect x="93" y="21" width="5" height="18" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.75" />
            <circle cx="90" cy="30" r="0.6" fill="rgba(255,255,255,0.9)" />
            <path d="M 84 23 A 8.5 8.5 0 0 0 84 37" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.75" />
          </svg>

          {/* Trademark Top Right */}
          <div className="absolute top-2 right-4 text-[11px] font-bold text-black pointer-events-none">
            ©Panini Digital
          </div>

          {/* Villa Valle Crest (Top Left) */}
          <div className="absolute top-2.5 left-2.5 w-12 h-12 bg-white/95 rounded-lg border border-gray-300 p-1 shadow-md flex items-center justify-center pointer-events-none z-10">
            <div className="w-full h-full bg-gradient-to-b from-red-600 via-yellow-400 to-green-600 text-white font-black text-[9px] flex items-center justify-center rounded">
              VV
            </div>
          </div>

          {/* Milan Futuro Crest (Bottom Right) */}
          <div className="absolute bottom-2.5 right-2.5 w-12 h-12 bg-white/95 rounded-lg border border-gray-300 p-1 shadow-md flex items-center justify-center pointer-events-none z-10">
            <div className="w-full h-full bg-black text-white font-black text-[9px] flex items-center justify-center rounded border border-red-600">
              ACM
            </div>
          </div>

          {/* Villa Valle Players (Red Circles with White Numbers) */}
          {Object.entries(AVERAGE_POSITIONS_HOME).map(([dorsalStr, coords]) => {
            const dorsal = Number(dorsalStr);
            const isGK = dorsal === 35;
            const playerObj = homeTeam.alineacion.find(p => p.dorsal === dorsal);
            const isSelected = selectedPlayer?.player.dorsal === dorsal && selectedPlayer.isHome;

            return (
              <div
                key={`vv-${dorsal}`}
                onClick={() =>
                  setSelectedPlayer({
                    player: playerObj || {
                      dorsal,
                      nombre: coords.label,
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
                className={`absolute z-30 cursor-pointer transition-all duration-200 flex flex-col items-center ${
                  isSelected ? 'scale-125 z-40' : 'hover:scale-115'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-lg transition-all ${
                    isGK
                      ? 'bg-[#9da3a8] text-black border-2 border-red-600'
                      : 'bg-red-600 text-white border-2 border-white'
                  } ${isSelected ? 'ring-4 ring-yellow-400' : ''}`}
                >
                  {dorsal}
                </div>
              </div>
            );
          })}

          {/* Milan Futuro Players (Blue Circles with White Numbers) */}
          {Object.entries(AVERAGE_POSITIONS_AWAY).map(([dorsalStr, coords]) => {
            const dorsal = Number(dorsalStr);
            const isGK = dorsal === 1;
            const playerObj = awayTeam.alineacion.find(p => p.dorsal === dorsal);
            const isSelected = selectedPlayer?.player.dorsal === dorsal && !selectedPlayer.isHome;

            return (
              <div
                key={`mf-${dorsal}`}
                onClick={() =>
                  setSelectedPlayer({
                    player: playerObj || {
                      dorsal,
                      nombre: coords.label,
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
                className={`absolute z-30 cursor-pointer transition-all duration-200 flex flex-col items-center ${
                  isSelected ? 'scale-125 z-40' : 'hover:scale-115'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-lg transition-all ${
                    isGK
                      ? 'bg-[#9da3a8] text-black border-2 border-blue-900'
                      : 'bg-[#001f7a] text-white border-2 border-white'
                  } ${isSelected ? 'ring-4 ring-yellow-400' : ''}`}
                >
                  {dorsal}
                </div>
              </div>
            );
          })}

        </div>

        {/* Selected Player Interactive Card */}
        {selectedPlayer && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4 max-w-2xl mx-auto shadow-lg border border-white/10 animate-scale-in">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base shadow-md ${
                  selectedPlayer.isHome ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                }`}
              >
                {selectedPlayer.player.dorsal}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white">{selectedPlayer.player.nombre}</h4>
                <span className="text-xs text-indigo-300">
                  {selectedPlayer.teamName} • Posición: {selectedPlayer.player.posicion_desc || selectedPlayer.player.posicion} • Minutos: {selectedPlayer.player.minutos_jugados}'
                </span>
              </div>
            </div>

            <button
              onClick={() => navigateToPlayerCard(selectedPlayer.player.player_id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all shadow-sm"
            >
              <User size={14} />
              <span>Ver Ficha Completa</span>
              <ExternalLink size={13} />
            </button>
          </div>
        )}
      </div>

      {/* 2. Listado Detallado de Alineaciones (Dos Columnas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Columna 1: VILLA VALLE (Rojo) */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-red-200 dark:border-red-900/40 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-red-100 dark:border-red-900/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center font-black text-xs">
                VV
              </div>
              <h3 className="font-black text-lg text-red-600 dark:text-red-400 tracking-wide uppercase">
                {homeTeam.nombre}
              </h3>
            </div>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Sistema: 4-4-2
            </span>
          </div>

          {/* Tabla Titulares y Cambios */}
          <div className="space-y-1.5 text-xs">
            {homeTeam.alineacion.map((p) => {
              const hasYellow = p.tarjetas_amarillas && p.tarjetas_amarillas.length > 0;
              const isSubIn = !p.es_titular;
              const isSubOut = p.minuto_salida !== undefined;

              return (
                <div
                  key={p.dorsal}
                  onClick={() => navigateToPlayerCard(p.player_id)}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-colors cursor-pointer group ${
                    isSubIn
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
                      : 'bg-gray-50/70 dark:bg-neutral-800/60 border-gray-100 dark:border-white/5 hover:border-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* Tarjeta amarilla */}
                    {hasYellow && (
                      <span className="w-3 h-4 bg-amber-400 rounded-xs flex items-center justify-center text-[8px] font-black text-black shadow-xs" title={`Tarjeta Amarilla: ${p.tarjetas_amarillas?.join(', ')}`}>
                        {p.tarjetas_amarillas?.[0]}
                      </span>
                    )}

                    {/* Minutos jugados */}
                    <span className="font-mono font-bold text-gray-500 dark:text-gray-400 w-7 text-right">
                      {p.minutos_jugados}'
                    </span>

                    {/* Rol Posición */}
                    <span className="w-5 h-5 rounded-md bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 font-black text-[10px] flex items-center justify-center">
                      {p.posicion}
                    </span>

                    {/* Nombre Jugador */}
                    <span className="font-bold text-gray-900 dark:text-white group-hover:text-red-600 transition-colors">
                      {p.nombre}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Indicadores de sustitución */}
                    {isSubOut && (
                      <span className="flex items-center text-red-500 font-bold text-[11px] gap-0.5" title="Sustituido">
                        <ArrowUpRight size={13} className="stroke-[3]" /> {p.minuto_salida}'
                      </span>
                    )}
                    {isSubIn && (
                      <span className="flex items-center text-emerald-600 font-bold text-[11px] gap-0.5" title="Entró de cambio">
                        <ArrowDownLeft size={13} className="stroke-[3]" /> {p.minuto_entrada}'
                      </span>
                    )}

                    {/* Dorsal */}
                    <span className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-[11px] flex items-center justify-center shadow-sm">
                      {p.dorsal}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Banquillo / Suplentes no utilizados */}
          {homeTeam.suplentes_no_utilizados && homeTeam.suplentes_no_utilizados.length > 0 && (
            <div className="pt-3 border-t border-gray-100 dark:border-white/10 space-y-2">
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block">
                Banquillo (Sin minutos):
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {homeTeam.suplentes_no_utilizados.map((p) => (
                  <div key={p.dorsal} className="p-2 rounded-xl bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-white/5 flex items-center justify-between text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-mono text-[10px] text-gray-400">#{p.dorsal}</span>
                      <span className="italic truncate">{p.nombre}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">{p.posicion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna 2: MILAN FUTURO (Azul) */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-blue-200 dark:border-blue-900/40 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-blue-900/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs">
                MF
              </div>
              <h3 className="font-black text-lg text-blue-600 dark:text-blue-400 tracking-wide uppercase">
                {awayTeam.nombre}
              </h3>
            </div>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Sistema: 4-3-3
            </span>
          </div>

          {/* Tabla Titulares y Cambios */}
          <div className="space-y-1.5 text-xs">
            {awayTeam.alineacion.map((p) => {
              const hasYellow = p.tarjetas_amarillas && p.tarjetas_amarillas.length > 0;
              const isSubIn = !p.es_titular;
              const isSubOut = p.minuto_salida !== undefined;

              return (
                <div
                  key={p.dorsal}
                  onClick={() => navigateToPlayerCard(p.player_id)}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-colors cursor-pointer group ${
                    isSubIn
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
                      : 'bg-gray-50/70 dark:bg-neutral-800/60 border-gray-100 dark:border-white/5 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* Dorsal */}
                    <span className="w-6 h-6 rounded-full bg-[#001f7a] text-white font-black text-[11px] flex items-center justify-center shadow-sm">
                      {p.dorsal}
                    </span>

                    {/* Indicadores de sustitución entrada */}
                    {isSubIn && (
                      <span className="flex items-center text-emerald-600 font-bold text-[11px] gap-0.5" title="Entró de cambio">
                        <ArrowDownLeft size={13} className="stroke-[3]" /> {p.minuto_entrada}'
                      </span>
                    )}

                    {/* Indicadores de sustitución salida */}
                    {isSubOut && (
                      <span className="flex items-center text-red-500 font-bold text-[11px] gap-0.5" title="Sustituido">
                        <ArrowUpRight size={13} className="stroke-[3]" /> {p.minuto_salida}'
                      </span>
                    )}

                    {/* Nombre Jugador */}
                    <span className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      {p.nombre}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Tarjeta amarilla */}
                    {hasYellow && (
                      <span className="w-3 h-4 bg-amber-400 rounded-xs flex items-center justify-center text-[8px] font-black text-black shadow-xs" title={`Tarjeta Amarilla: ${p.tarjetas_amarillas?.join(', ')}`}>
                        {p.tarjetas_amarillas?.[0]}
                      </span>
                    )}

                    {/* Rol Posición */}
                    <span className="w-5 h-5 rounded-md bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 font-black text-[10px] flex items-center justify-center">
                      {p.posicion}
                    </span>

                    {/* Minutos jugados */}
                    <span className="font-mono font-bold text-gray-500 dark:text-gray-400 w-7 text-right">
                      {p.minutos_jugados}'
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Banquillo / Suplentes no utilizados */}
          {awayTeam.suplentes_no_utilizados && awayTeam.suplentes_no_utilizados.length > 0 && (
            <div className="pt-3 border-t border-gray-100 dark:border-white/10 space-y-2">
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block">
                Banquillo (Sin minutos):
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {awayTeam.suplentes_no_utilizados.map((p) => (
                  <div key={p.dorsal} className="p-2 rounded-xl bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-white/5 flex items-center justify-between text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-mono text-[10px] text-gray-400">#{p.dorsal}</span>
                      <span className="italic truncate">{p.nombre}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">{p.posicion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
