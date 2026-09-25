import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ExternalLink, Clock } from 'lucide-react';
import type { PaniniTeamData, PaniniPlayerLineup } from '../../../types/paniniReport';
import { MISSING_SPATIAL_DATA_MESSAGE, toSharedPitch } from './paniniPitch';

interface Props {
  homeTeam: PaniniTeamData;
  awayTeam: PaniniTeamData;
}

interface PlayerPin {
  dorsal?: number;
  name: string;
  role: 'P' | 'D' | 'C' | 'A';
  x: number;
  y: number;
  badgePos: 'above' | 'below';
}

const formatMeters = (n?: number) => (n ? n.toFixed(1).replace('.', ',') : '—');

export default function PaniniTacticalDensityView({ homeTeam, awayTeam }: Props) {
  const navigate = useNavigate();
  const [selectedHalf, setSelectedHalf] = useState<'1T' | '2T'>('1T');
  const [selectedTeamKey, setSelectedTeamKey] = useState<'home' | 'away'>('home');
  const [selectedPlayer, setSelectedPlayer] = useState<{
    player: PaniniPlayerLineup;
    teamName: string;
  } | null>(null);

  const isHome = selectedTeamKey === 'home';
  const is1T = selectedHalf === '1T';

  const team = isHome ? homeTeam : awayTeam;
  const block = is1T ? team.bloque_tactico_1t : team.bloque_tactico_2t;

  // Datos reales del informe: rejilla de densidad y posición de cada jugador en el periodo.
  // En el PDF el visitante se dibuja atacando hacia la izquierda: lo reproducimos igual.
  const density = is1T ? team.densidad_1t : team.densidad_2t;

  const playerPins: PlayerPin[] = useMemo(
    () =>
      (density?.jugadores ?? []).map((j) => {
        const pos = toSharedPitch(j, isHome);
        return { dorsal: j.dorsal, name: j.nombre, role: j.rol, x: pos.x, y: pos.y, badgePos: pos.y < 12 ? 'below' : 'above' };
      }),
    [density, isHome],
  );

  const densityCells = useMemo(
    () =>
      (density?.celdas ?? []).map((c) => ({
        ...c,
        // Giro de 180º para el visitante, como en el PDF
        fila: isHome ? c.fila : density!.filas - 1 - c.fila,
        columna: isHome ? c.columna : density!.columnas - 1 - c.columna,
      })),
    [density, isHome],
  );

  // Extensión del bloque (sin portero) para situar las cotas de longitud y amplitud
  const outfield = playerPins.filter((p) => p.role !== 'P');
  const blockBounds = outfield.length
    ? {
        x0: Math.min(...outfield.map((p) => p.x)),
        x1: Math.max(...outfield.map((p) => p.x)),
        y0: Math.min(...outfield.map((p) => p.y)),
        y1: Math.max(...outfield.map((p) => p.y)),
      }
    : null;

  const getRoleStyle = (role: 'P' | 'D' | 'C' | 'A') => {
    switch (role) {
      case 'P':
        return { bg: '#aaaaaa', text: '#000000', label: 'Portiere' };
      case 'D':
        return { bg: '#feff40', text: '#000000', label: 'Difensore' };
      case 'C':
        return { bg: '#ffb05f', text: '#000000', label: 'Centrocampista' };
      case 'A':
      default:
        return { bg: '#ff2020', text: '#ffffff', label: 'Attaccante' };
    }
  };

  const navigateToPlayerCard = (playerId?: string) => {
    if (playerId) {
      navigate(`/players/${playerId}?view=ficha`);
    } else {
      navigate(`/players?view=ficha`);
    }
  };

  const longitudMetros = formatMeters(density?.longitud_m ?? block.longitud_m);
  const amplitudMetros = formatMeters(density?.anchura_m ?? block.anchura_m);

  // % por tercios (de izquierda a derecha tal como se dibuja)
  const thirds = density?.zonas_pct ?? { defensa: block.densidad_defensa_pct, medio: block.densidad_medio_pct, ataque: block.densidad_ataque_pct };
  const fmtPct = (n?: number) => (n || n === 0 ? n.toFixed(1).replace('.', ',') : '—');
  const densX_left = fmtPct(isHome ? thirds.defensa : thirds.ataque);
  const densX_mid = fmtPct(thirds.medio);
  const densX_right = fmtPct(isHome ? thirds.ataque : thirds.defensa);

  return (
    <div className="space-y-5 animate-fade-in text-gray-800 dark:text-gray-100">
      
      {/* Controles de Vista: Selector de Parte y Selector de Equipo */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
        
        {/* Selector de Tiempo */}
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
          <span className="font-extrabold text-sm text-gray-800 dark:text-gray-200">Tiempo de Juego:</span>
          <div className="flex bg-gray-100 dark:bg-neutral-800 p-1.5 rounded-2xl border border-gray-200/60 dark:border-white/10 shadow-inner">
            <button
              onClick={() => { setSelectedHalf('1T'); setSelectedPlayer(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedHalf === '1T'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30 scale-[1.02]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
              }`}
            >
              1º Tiempo (Primo Tempo)
            </button>
            <button
              onClick={() => { setSelectedHalf('2T'); setSelectedPlayer(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedHalf === '2T'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30 scale-[1.02]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
              }`}
            >
              2º Tiempo (Secondo Tempo)
            </button>
          </div>
        </div>

        {/* Selector de Equipo */}
        <div className="flex bg-gray-100 dark:bg-neutral-800 p-1.5 rounded-2xl border border-gray-200/60 dark:border-white/10 shadow-inner">
          <button
            onClick={() => { setSelectedTeamKey('home'); setSelectedPlayer(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              selectedTeamKey === 'home'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-2 ring-red-500/30 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${selectedTeamKey === 'home' ? 'bg-white' : 'bg-red-500'}`} />
            {homeTeam.nombre} ({(is1T ? homeTeam.bloque_tactico_1t : homeTeam.bloque_tactico_2t).sistema})
          </button>
          <button
            onClick={() => { setSelectedTeamKey('away'); setSelectedPlayer(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              selectedTeamKey === 'away'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/30 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${selectedTeamKey === 'away' ? 'bg-white' : 'bg-blue-500'}`} />
            {awayTeam.nombre} ({(is1T ? awayTeam.bloque_tactico_1t : awayTeam.bloque_tactico_2t).sistema})
          </button>
        </div>
      </div>

      {!density && (
        <p className="max-w-4xl mx-auto text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">{MISSING_SPATIAL_DATA_MESSAGE}</p>
      )}

      {/* Tarjeta Campograma Oficial Panini Digital */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-neutral-900 p-4 sm:p-6 md:p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-lg space-y-4">
        
        {/* 1. Barra Superior Panini Oficial: 45' | primo tempo | 23':27'' */}
        <div className="bg-[#e2e2e4] dark:bg-neutral-800 rounded-lg px-4 py-1.5 flex items-center justify-between font-black text-sm text-black dark:text-white select-none border border-gray-300 dark:border-white/10">
          <span className="font-mono text-base">{density?.duracion || '—'}</span>
          <span className="uppercase tracking-widest text-xs font-extrabold text-gray-800 dark:text-gray-200">
            {is1T ? 'primo tempo' : 'secondo tempo'}
          </span>
          <span className="font-mono text-base">{density?.tiempo_efectivo || '—'}</span>
        </div>

        {/* 2. Sistema y Nombre del Equipo */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1">
          <span className="font-black text-2xl font-mono text-black dark:text-white">
            {density?.sistema || block.sistema}
          </span>
          <h2 className={`font-black text-2xl sm:text-3xl tracking-wider uppercase ${isHome ? 'text-[#e50914]' : 'text-[#001f7a] dark:text-blue-400'}`}>
            {team.nombre}
          </h2>
          <span className="w-12"></span>
        </div>

        {/* 3. Campograma Principal con Porcentajes Laterales y Matriz 9x7 */}
        <div className="flex items-stretch gap-2.5 sm:gap-4">
          
          {/* Terreno de Juego con Proporciones Oficiales y Líneas Sincronizadas */}
          <div className="relative flex-1 aspect-[100/62] rounded-xl overflow-hidden border-2 border-gray-400 dark:border-white/20 bg-[#def0d3] select-none shadow-inner">
            
            {/* 3.1 Fondo Rayado Diagonal Panini */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-40 z-0"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(80, 185, 80, 0.35) 0px, rgba(80, 185, 80, 0.35) 1px, transparent 1px, transparent 6px)'
              }}
            />

            {/* 3.2 Rejilla de densidad del PDF: tono exacto de cada celda (sólido o trama) */}
            {density && (
              <div
                className="absolute inset-0 grid pointer-events-none z-10"
                style={{ gridTemplateColumns: `repeat(${density.columnas}, 1fr)`, gridTemplateRows: `repeat(${density.filas}, 1fr)` }}
              >
                {densityCells.map((c) => (
                  <div
                    key={`${c.fila}-${c.columna}`}
                    title={`Densidad ${c.nivel}/15`}
                    style={{
                      gridRow: c.fila + 1,
                      gridColumn: c.columna + 1,
                      background: c.trama
                        ? `repeating-linear-gradient(45deg, ${c.color} 0px, ${c.color} 1.5px, #ffffff 1.5px, #ffffff 4px)`
                        : c.color,
                    }}
                    className="border border-white/40"
                  />
                ))}
              </div>
            )}

            {/* 3.3 SVG Pitch Markings Sincronizadas con las Áreas y Dimensiones Reales */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-15" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Contorno del campo */}
              <rect x="0" y="0" width="100" height="100" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="0.8" />
              
              {/* Línea de medio campo */}
              <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.95)" strokeWidth="0.8" />
              
              {/* Círculo Central y Punto Central */}
              <ellipse cx="50" cy="50" rx="8.7" ry="13.5" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="0.8" />
              <circle cx="50" cy="50" r="0.7" fill="white" />
              
              {/* Área Izquierda (Defensa Local / Ataque Visitante) */}
              <rect x="0" y="20.35" width="15.7" height="59.3" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="0.8" />
              <rect x="0" y="36.53" width="5.24" height="26.94" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="0.8" />
              <circle cx="10.5" cy="50" r="0.7" fill="white" />
              <path d="M 15.7 39.5 A 8.7 13.5 0 0 1 15.7 60.5" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="0.8" />
              <circle cx="10.5" cy="50" r="5.5" fill="none" stroke="rgba(120, 150, 130, 0.45)" strokeWidth="0.6" strokeDasharray="1.5 1" />

              {/* Área Derecha (Ataque Local / Defensa Visitante) */}
              <rect x="84.3" y="20.35" width="15.7" height="59.3" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="0.8" />
              <rect x="94.76" y="36.53" width="5.24" height="26.94" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="0.8" />
              <circle cx="89.5" cy="50" r="0.7" fill="white" />
              <path d="M 84.3 39.5 A 8.7 13.5 0 0 0 84.3 60.5" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="0.8" />
              <circle cx="89.5" cy="50" r="5.5" fill="none" stroke="rgba(120, 150, 130, 0.45)" strokeWidth="0.6" strokeDasharray="1.5 1" />
            </svg>

            {/* Trademark Panini Digital */}
            <div className="absolute top-2 right-3 text-[11px] font-bold text-black pointer-events-none z-20">
              ©Panini Digital
            </div>

            {/* Escudo del Club en Esquina */}
            <div className={`absolute ${isHome ? 'top-2 left-2' : 'bottom-2 right-2'} w-10 h-10 bg-white rounded-xl border border-gray-300 shadow-sm flex items-center justify-center pointer-events-none z-20`}>
              <span className={`text-[8px] font-black leading-tight text-center ${isHome ? 'text-red-600' : 'text-[#001f7a]'}`}>
                {team.nombre.substring(0, 3).toUpperCase()}
              </span>
            </div>

            {/* 3.4 Cotas Métricas: Brackets Oficiales de Longitud y Amplitud */}
            {/* Cotas del bloque (sin portero), situadas sobre la extensión real de los jugadores */}
            {blockBounds && (
              <>
                <div
                  className="absolute w-8 flex items-center justify-center pointer-events-none z-25"
                  style={{ top: `${blockBounds.y0}%`, bottom: `${100 - blockBounds.y1}%`, ...(isHome ? { right: '0.5rem' } : { left: '0.5rem' }) }}
                >
                  <div className={`w-2 h-full ${isHome ? 'border-r-2 border-y-2' : 'border-l-2 border-y-2'} border-black`} />
                  <span className={`absolute ${isHome ? '-right-2' : '-left-2'} top-1/2 -translate-y-1/2 bg-white/95 px-1 rounded text-[10px] font-black text-black font-mono shadow-xs whitespace-nowrap -rotate-90 border border-black/20`}>
                    mt {amplitudMetros}
                  </span>
                </div>
                <div
                  className="absolute bottom-2 h-6 flex items-center justify-center pointer-events-none z-25"
                  style={{ left: `${blockBounds.x0}%`, right: `${100 - blockBounds.x1}%` }}
                >
                  <div className="h-2 w-full border-b-2 border-x-2 border-black" />
                  <span className="absolute bottom-0.5 bg-white/95 px-1.5 rounded text-[10px] font-black text-black font-mono shadow-xs border border-black/20">
                    mt {longitudMetros}
                  </span>
                </div>
              </>
            )}

            {/* 3.5 Pines de Jugadores con Posicionamiento y Etiquetas de Rol */}
            {playerPins.map((pin) => {
              const roleStyle = getRoleStyle(pin.role);
              const isSelected = pin.dorsal !== undefined && selectedPlayer?.player.dorsal === pin.dorsal;
              const dbPlayer = team.alineacion.find(p => p.dorsal === pin.dorsal);

              return (
                <div
                  key={`${pin.dorsal}-${pin.name}`}
                  onClick={() =>
                    setSelectedPlayer({
                      player: dbPlayer || {
                        dorsal: pin.dorsal ?? 0,
                        nombre: pin.name,
                        posicion: pin.role,
                        posicion_desc: roleStyle.label,
                        minutos_jugados: 96,
                        es_titular: true,
                      },
                      teamName: team.nombre,
                    })
                  }
                  style={{
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute z-30 flex flex-col items-center cursor-pointer transition-all duration-200 ${
                    isSelected ? 'scale-125 z-40' : 'hover:scale-115'
                  }`}
                >
                  {/* Etiqueta de Rol/Nombre (Arriba) */}
                  {pin.badgePos === 'above' && (
                    <div
                      style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
                      className="px-2 py-0.2 rounded-xs border border-black text-[9px] sm:text-[9.5px] font-black tracking-tight leading-tight shadow-sm whitespace-nowrap mb-0.5"
                    >
                      {pin.name}
                    </div>
                  )}

                  {/* Círculo con Número Dorsal */}
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-[11px] sm:text-xs shadow-md transition-all ${
                      pin.role === 'P'
                        ? 'bg-[#9da3a8] text-black border border-black/80'
                        : isHome
                        ? 'bg-[#e50914] text-white border-2 border-white'
                        : 'bg-[#001f7a] text-white border-2 border-white'
                    } ${isSelected ? 'ring-4 ring-yellow-400 scale-110' : ''}`}
                  >
                    {pin.dorsal}
                  </div>

                  {/* Etiqueta de Rol/Nombre (Abajo) */}
                  {pin.badgePos === 'below' && (
                    <div
                      style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
                      className="px-2 py-0.2 rounded-xs border border-black text-[9px] sm:text-[9.5px] font-black tracking-tight leading-tight shadow-sm whitespace-nowrap mt-0.5"
                    >
                      {pin.name}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </div>

        {/* Eje X: Porcentajes de densidad longitudinal (3 zonas) con símbolo % */}
        <div className="flex justify-between items-center pl-10 pr-6 pt-1 text-xs sm:text-sm font-mono font-black text-black dark:text-white select-none">
          <div className="flex items-center gap-6">
            <span className="font-extrabold text-sm">%</span>
            <span>{densX_left}</span>
          </div>
          <div>
            <span>{densX_mid}</span>
          </div>
          <div>
            <span>{densX_right}</span>
          </div>
        </div>

        {/* 4. Leyenda de Roles Oficial Panini (Portiere | Difensore | Centrocampista | Attaccante) */}
        <div className="pt-2 flex items-center justify-center gap-3 sm:gap-5 flex-wrap border-t border-gray-100 dark:border-white/10">
          <span className="px-5 py-1 rounded-lg border border-black font-bold text-xs bg-[#9da3a8] text-black shadow-xs">
            Portiere
          </span>
          <span className="px-5 py-1 rounded-lg border border-black font-bold text-xs bg-[#ffea00] text-black shadow-xs">
            Difensore
          </span>
          <span className="px-5 py-1 rounded-lg border border-black font-bold text-xs bg-[#f99d42] text-black shadow-xs">
            Centrocampista
          </span>
          <span className="px-5 py-1 rounded-lg border border-black font-bold text-xs bg-[#e50914] text-white shadow-xs">
            Attaccante
          </span>
        </div>

      </div>

      {/* Panel Interactivo de Jugador Seleccionado */}
      {selectedPlayer && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4 max-w-2xl mx-auto shadow-lg border border-white/10 animate-scale-in">
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: getRoleStyle(selectedPlayer.player.posicion as any).bg,
                color: getRoleStyle(selectedPlayer.player.posicion as any).text,
              }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base border-2 border-black shadow-md"
            >
              {selectedPlayer.player.dorsal}
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white">{selectedPlayer.player.nombre}</h4>
              <span className="text-xs text-indigo-300">
                {selectedPlayer.teamName} • {selectedPlayer.player.posicion_desc || 'Titular'} • Minutos: {selectedPlayer.player.minutos_jugados}'
              </span>
            </div>
          </div>

          <button
            onClick={() => navigateToPlayerCard(selectedPlayer.player.player_id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all shadow-sm cursor-pointer"
          >
            <User size={14} />
            <span>Ver Ficha</span>
            <ExternalLink size={13} />
          </button>
        </div>
      )}

    </div>
  );
}

