import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  User, 
  ExternalLink,
  Layers,
  Activity,
  Compass,
  TrendingUp,
  Sliders
} from 'lucide-react';
import type { PaniniTeamData, PaniniPlayerLineup, PaniniPlayerStats } from '../../../types/paniniReport';

interface Props {
  homeTeam: PaniniTeamData;
  awayTeam: PaniniTeamData;
  homeLogo?: string;
  awayLogo?: string;
}

// Coordenadas del posicionamiento medio de los dos equipos
const AVERAGE_POSITIONS_HOME: Record<number, { x: number; y: number; label: string; line: 'def' | 'med' | 'att' | 'gk' }> = {
  35: { x: 10.5, y: 50.0, label: 'Offredi', line: 'gk' },
  4:  { x: 34.0, y: 35.5, label: 'Nava', line: 'def' },
  24: { x: 34.0, y: 64.5, label: 'Piacentini', line: 'def' },
  30: { x: 56.5, y: 20.0, label: 'Caccia', line: 'def' },
  25: { x: 56.5, y: 78.5, label: 'Martinelli', line: 'def' },
  8:  { x: 50.0, y: 44.5, label: 'Serena', line: 'med' },
  28: { x: 50.5, y: 62.5, label: 'Rinaldi', line: 'med' },
  21: { x: 68.0, y: 29.5, label: 'Danieli', line: 'med' },
  20: { x: 68.0, y: 75.0, label: 'Strechie', line: 'med' },
  14: { x: 68.0, y: 47.0, label: "D'Amuri", line: 'att' },
  7:  { x: 68.0, y: 61.5, label: 'Ravasi', line: 'att' },
};

const AVERAGE_POSITIONS_AWAY: Record<number, { x: number; y: number; label: string; line: 'def' | 'med' | 'att' | 'gk' }> = {
  1:  { x: 89.0, y: 50.0, label: 'Pittarella', line: 'gk' },
  2:  { x: 54.0, y: 20.0, label: 'Cappelletti', line: 'def' },
  4:  { x: 68.0, y: 36.0, label: 'Zukic', line: 'def' },
  5:  { x: 72.0, y: 67.0, label: 'Vladimirov', line: 'def' },
  3:  { x: 54.0, y: 77.0, label: 'Borsani', line: 'def' },
  8:  { x: 59.0, y: 46.0, label: 'Pandolfi', line: 'med' },
  6:  { x: 57.0, y: 58.0, label: 'Cissé', line: 'med' },
  11: { x: 46.0, y: 26.0, label: 'Ossola', line: 'med' },
  7:  { x: 37.0, y: 29.0, label: 'Sala', line: 'att' },
  9:  { x: 37.0, y: 48.0, label: 'Asanji', line: 'att' },
  10: { x: 42.0, y: 63.0, label: 'Vos', line: 'att' },
};

export default function PaniniLineupsView({ homeTeam, awayTeam, homeLogo, awayLogo }: Props) {
  const navigate = useNavigate();
  const [selectedPlayer, setSelectedPlayer] = useState<{
    player: PaniniPlayerLineup;
    stats?: PaniniPlayerStats;
    teamName: string;
    isHome: boolean;
  } | null>(null);

  const [filterTeam, setFilterTeam] = useState<'both' | 'home' | 'away'>('both');
  const [showTacticalLines, setShowTacticalLines] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  const navigateToPlayerCard = (playerId?: string) => {
    if (playerId) {
      navigate(`/players/${playerId}?view=ficha`);
    } else {
      navigate(`/players?view=ficha`);
    }
  };

  // Helper para buscar estadísticas detalladas de un jugador
  const getPlayerDetailedStats = (dorsal: number, isHome: boolean): PaniniPlayerStats | undefined => {
    const list = isHome ? homeTeam.jugadores_stats : awayTeam.jugadores_stats;
    return list?.find(s => s.dorsal === dorsal);
  };

  const handleSelectPlayer = (player: PaniniPlayerLineup, isHome: boolean, teamName: string) => {
    const stats = getPlayerDetailedStats(player.dorsal, isHome);
    setSelectedPlayer({
      player,
      stats,
      teamName,
      isHome
    });
  };

  // Métricas tácticas de los bloques
  const homeBlock = homeTeam.bloque_tactico_1t || { longitud_m: 31.2, anchura_m: 42.5, densidad_defensa_pct: 38, densidad_medio_pct: 42, densidad_ataque_pct: 20 };
  const awayBlock = awayTeam.bloque_tactico_1t || { longitud_m: 28.4, anchura_m: 46.1, densidad_defensa_pct: 28, densidad_medio_pct: 46, densidad_ataque_pct: 26 };
  
  const homeBaricentro = homeTeam.estadisticas?.total_partido?.baricentro_altura_m || 48.2;
  const awayBaricentro = awayTeam.estadisticas?.total_partido?.baricentro_altura_m || 54.8;

  const homePoss = homeTeam.estadisticas?.total_partido?.posesion_pct || 38;
  const awayPoss = awayTeam.estadisticas?.total_partido?.posesion_pct || 62;

  // Helper para renderizar líneas tácticas discontinuas dinamicas conectadas a los jugadores
  const renderTacticalLines = (
    positions: Record<number, { x: number; y: number; label: string; line: 'def' | 'med' | 'att' | 'gk' }>,
    strokeColor: string
  ) => {
    const lineGroups: Record<'def' | 'med' | 'att', Array<{ x: number; y: number }>> = {
      def: [],
      med: [],
      att: [],
    };

    Object.values(positions).forEach((p) => {
      if (p.line !== 'gk') {
        lineGroups[p.line].push({ x: p.x, y: p.y });
      }
    });

    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    (['def', 'med', 'att'] as const).forEach((groupKey) => {
      const group = lineGroups[groupKey].sort((a, b) => a.y - b.y);
      for (let i = 0; i < group.length - 1; i++) {
        segments.push({
          x1: group[i].x,
          y1: group[i].y,
          x2: group[i + 1].x,
          y2: group[i + 1].y,
        });
      }
    });

    return (
      <g stroke={strokeColor} strokeWidth="0.8" strokeDasharray="2,1.5" strokeLinecap="round">
        {segments.map((s, idx) => (
          <line key={idx} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
        ))}
      </g>
    );
  };

  return (
    <div className="w-full space-y-3 animate-fade-in text-gray-800 dark:text-gray-100">
      
      {/* 1. Barra de Control Táctico Superior Compacta */}
      <div className="bg-white dark:bg-[#121317] px-4 py-3 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-sm flex flex-wrap items-center justify-between gap-3">
        
        {/* Título y Subtítulo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-500/20">
            <Compass size={19} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base text-gray-900 dark:text-white leading-tight tracking-tight">
                Campograma de Posicionamiento Medio y Alineaciones
              </h3>
              <span className="hidden sm:inline-flex text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                Panini Digital Pro
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              Estructura táctica horizontal 105×68m, baricentro de líneas y puntos de contacto promedio
            </p>
          </div>
        </div>

        {/* Controles Interactivos de Vista */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de Equipos */}
          <div className="flex items-center bg-gray-100 dark:bg-neutral-900 p-1.5 rounded-xl border border-gray-200/80 dark:border-white/10 text-xs font-black shadow-inner">
            <button
              onClick={() => setFilterTeam('both')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterTeam === 'both' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30 scale-[1.02]' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
              }`}
            >
              Ambos Equipos
            </button>
            <button
              onClick={() => setFilterTeam('home')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTeam === 'home' 
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-2 ring-red-500/30 scale-[1.02]' 
                  : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${filterTeam === 'home' ? 'bg-white' : 'bg-red-400'}`} />
              {homeTeam.nombre.split(' ')[0]}
            </button>
            <button
              onClick={() => setFilterTeam('away')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTeam === 'away' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/30 scale-[1.02]' 
                  : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${filterTeam === 'away' ? 'bg-white' : 'bg-blue-400'}`} />
              {awayTeam.nombre.split(' ')[0]}
            </button>
          </div>

          {/* Toggle de Líneas Tácticas */}
          <button
            onClick={() => setShowTacticalLines(v => !v)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              showTacticalLines
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-gray-500 border-gray-200 dark:border-white/10 hover:text-gray-800'
            }`}
            title="Mostrar u ocultar conexiones de líneas tácticas"
          >
            <Layers size={13} />
            <span className="hidden md:inline">Líneas</span>
          </button>

          {/* Toggle de Etiquetas de Nombre */}
          <button
            onClick={() => setShowLabels(v => !v)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              showLabels
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-gray-500 border-gray-200 dark:border-white/10 hover:text-gray-800'
            }`}
            title="Mostrar u ocultar nombres en el campo"
          >
            <Sliders size={13} />
            <span className="hidden md:inline">Nombres</span>
          </button>
        </div>

      </div>

      {/* 2. Unified 3-Column Layout Guaranteed Single Row: Home (3 cols) | Pitch & Focus (6 cols) | Away (3 cols) */}
      <div className="grid grid-cols-12 gap-2.5 sm:gap-3 xl:gap-4 items-stretch">
        
        {/* ======================================================== */}
        {/* COLUMNA 1: ALINEACIÓN LOCAL (Villa Valle - 3 cols)        */}
        {/* ======================================================== */}
        <div className="col-span-3 order-1 flex flex-col justify-between bg-white dark:bg-[#121317] p-2.5 sm:p-3.5 rounded-2xl border border-red-100 dark:border-red-950/40 shadow-sm space-y-3">
          
          <div className="space-y-3">
            {/* Header Equipo Local */}
            <div className="flex items-center justify-between pb-2.5 border-b border-red-100 dark:border-red-900/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-800 border border-red-200 dark:border-red-900/50 p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                  {homeLogo ? (
                    <img src={homeLogo} alt={homeTeam.nombre} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-red-600 text-white font-black text-[9px] flex items-center justify-center rounded">
                      {homeTeam.nombre.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-black text-sm text-red-600 dark:text-red-400 tracking-wide uppercase truncate">
                      {homeTeam.nombre}
                    </h4>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 shrink-0">
                      4-4-2
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block truncate">
                    Entrenador: {homeTeam.entrenador || 'M. Sgrò'} • Ataque ➡
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-black uppercase text-gray-400 block">IVS</span>
                <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                  {homeTeam.ims ? homeTeam.ims.toFixed(2) : '0.58'}
                </span>
              </div>
            </div>

            {/* Lista Titulares y Cambios */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9.5px] font-black uppercase tracking-wider text-gray-400 px-2 py-0.5">
                <span>Min / Jugador</span>
                <span>Pases / Balones</span>
              </div>

              {homeTeam.alineacion.map((p) => {
                const hasYellow = p.tarjetas_amarillas && p.tarjetas_amarillas.length > 0;
                const isSubIn = !p.es_titular;
                const isSubOut = p.minuto_salida !== undefined;
                const isSelected = selectedPlayer?.player.dorsal === p.dorsal && selectedPlayer.isHome;
                const pStats = getPlayerDetailedStats(p.dorsal, true);

                return (
                  <div
                    key={p.dorsal}
                    onClick={() => handleSelectPlayer(p, true, homeTeam.nombre)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer group text-[11px] ${
                      isSelected
                        ? 'bg-red-500 text-white border-red-600 shadow-md ring-2 ring-red-400 font-bold'
                        : isSubIn
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40 hover:border-red-300'
                        : 'bg-gray-50/80 dark:bg-neutral-800/60 border-gray-100 dark:border-white/5 hover:bg-red-50/40 dark:hover:bg-red-950/20 hover:border-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Dorsal */}
                      <span className={`w-5 h-5 rounded-full font-black text-[9.5px] flex items-center justify-center shrink-0 shadow-xs ${
                        isSelected 
                          ? 'bg-white text-red-600' 
                          : 'bg-red-600 text-white'
                      }`}>
                        {p.dorsal}
                      </span>

                      {/* Posición */}
                      <span className={`w-4 h-4 rounded text-[8.5px] font-black flex items-center justify-center shrink-0 ${
                        isSelected 
                          ? 'bg-red-700 text-white' 
                          : 'bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {p.posicion}
                      </span>

                      {/* Minutos jugados */}
                      <span className={`font-mono text-[10px] w-6 shrink-0 ${isSelected ? 'text-red-100' : 'text-gray-400'}`}>
                        {p.minutos_jugados}'
                      </span>

                      {/* Nombre Jugador */}
                      <span className={`font-bold truncate transition-colors ${
                        isSelected ? 'text-white' : 'text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400'
                      }`}>
                        {p.nombre}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {/* Tarjeta amarilla */}
                      {hasYellow && (
                        <span className="w-2.5 h-3.5 bg-amber-400 rounded-xs flex items-center justify-center text-[7.5px] font-black text-black shadow-xs shrink-0" title={`Tarjeta Amarilla (${p.tarjetas_amarillas?.[0]}')`}>
                          {p.tarjetas_amarillas?.[0]}
                        </span>
                      )}

                      {/* Indicadores de sustitución */}
                      {isSubOut && (
                        <span className={`flex items-center font-bold text-[9.5px] ${isSelected ? 'text-white' : 'text-red-500'}`} title={`Sustituido en el min ${p.minuto_salida}'`}>
                          <ArrowUpRight size={10} className="stroke-[3]" /> {p.minuto_salida}'
                        </span>
                      )}
                      {isSubIn && (
                        <span className={`flex items-center font-bold text-[9.5px] ${isSelected ? 'text-white' : 'text-emerald-500'}`} title={`Entró en el min ${p.minuto_entrada}'`}>
                          <ArrowDownLeft size={10} className="stroke-[3]" /> {p.minuto_entrada}'
                        </span>
                      )}

                      {/* Pases / Balones jugados */}
                      {pStats && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-red-700 text-white' : 'bg-gray-100 dark:bg-neutral-700/80 text-gray-600 dark:text-gray-300'
                        }`}>
                          {pStats.pases_acertados}/{pStats.balones_jugados}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Banquillo / Suplentes */}
            {homeTeam.suplentes_no_utilizados && homeTeam.suplentes_no_utilizados.length > 0 && (
              <div className="pt-2 border-t border-red-100 dark:border-white/5 space-y-1">
                <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider block">
                  Banquillo (Sin Minutos):
                </span>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  {homeTeam.suplentes_no_utilizados.map((p) => (
                    <div key={p.dorsal} className="px-2 py-1 rounded-lg bg-gray-50 dark:bg-neutral-800/80 border border-gray-100 dark:border-white/5 flex items-center justify-between text-gray-500 dark:text-gray-400 truncate">
                      <span className="truncate">#{p.dorsal} {p.nombre}</span>
                      <span className="font-bold text-[8.5px] ml-1 bg-gray-200 dark:bg-neutral-700 px-1 rounded">{p.posicion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta de Métricas Tácticas de Bloque (Rellena el espacio inferior con datos de alto valor) */}
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-red-50/60 to-rose-50/30 dark:from-red-950/20 dark:to-neutral-900 border border-red-100 dark:border-red-900/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-red-700 dark:text-red-400">
              <span className="flex items-center gap-1.5">
                <TrendingUp size={13} /> Perfil Táctico {homeTeam.nombre}
              </span>
              <span className="text-[10px] bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
                Bloque 1T
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="bg-white dark:bg-neutral-800 p-1.5 rounded-lg border border-red-100/80 dark:border-white/5 shadow-xs">
                <span className="text-gray-400 text-[8.5px] font-bold block uppercase">Baricentro</span>
                <span className="font-black text-red-600 dark:text-red-400 text-xs">{homeBaricentro.toFixed(1)} m</span>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-1.5 rounded-lg border border-red-100/80 dark:border-white/5 shadow-xs">
                <span className="text-gray-400 text-[8.5px] font-bold block uppercase">Longitud</span>
                <span className="font-black text-gray-800 dark:text-gray-200 text-xs">{homeBlock.longitud_m.toFixed(1)} m</span>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-1.5 rounded-lg border border-red-100/80 dark:border-white/5 shadow-xs">
                <span className="text-gray-400 text-[8.5px] font-bold block uppercase">Anchura</span>
                <span className="font-black text-gray-800 dark:text-gray-200 text-xs">{homeBlock.anchura_m.toFixed(1)} m</span>
              </div>
            </div>

            {/* Densidades de Líneas */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-gray-500">
                <span>Def: {homeBlock.densidad_defensa_pct}%</span>
                <span>Med: {homeBlock.densidad_medio_pct}%</span>
                <span>Att: {homeBlock.densidad_ataque_pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full flex overflow-hidden">
                <div style={{ width: `${homeBlock.densidad_defensa_pct}%` }} className="bg-red-400 h-full" />
                <div style={{ width: `${homeBlock.densidad_medio_pct}%` }} className="bg-amber-400 h-full" />
                <div style={{ width: `${homeBlock.densidad_ataque_pct}%` }} className="bg-emerald-400 h-full" />
              </div>
            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* COLUMNA 2: CAMPOGRAMA HORIZONTAL CENTRAL (6 cols)         */}
        {/* ======================================================== */}
        <div className="col-span-6 order-2 flex flex-col justify-between bg-white dark:bg-[#121317] p-2.5 sm:p-3.5 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-sm space-y-3">
          
          {/* Cabecera del Campograma: Indicadores de Dirección */}
          <div className="flex items-center justify-between px-2 text-xs font-bold">
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              <span>{homeTeam.nombre}</span>
              <span className="text-[10px] text-gray-400">(Ataque hacia la derecha ➡)</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <span className="text-[10px] text-gray-400">(⬅ Ataque hacia la izquierda)</span>
              <span>{awayTeam.nombre}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#001f7a]" />
            </div>
          </div>

          {/* El Campo de Fútbol Horizontal HD */}
          <div className="relative w-full aspect-[105/68] max-h-[520px] rounded-2xl overflow-hidden border-2 border-emerald-900/30 bg-[#255f30] shadow-xl select-none mx-auto">
            
            {/* Césped con Franjas Alternadas */}
            <div className="absolute inset-0 flex flex-row pointer-events-none opacity-30">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-black/15' : 'bg-white/10'}`} />
              ))}
            </div>

            {/* SVG Markings (viewBox 0 0 100 100) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Contorno del Campo */}
              <rect x="2" y="2" width="96" height="96" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.45" />
              
              {/* Línea de Medio Campo (Continua) */}
              <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(255,255,255,0.9)" strokeWidth="0.45" />
              
              {/* Círculo Central y Punto de Saque */}
              <ellipse cx="50" cy="50" rx="6" ry="14" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.45" />
              <circle cx="50" cy="50" r="0.6" fill="rgba(255,255,255,0.95)" />

              {/* Área Izquierda (Defiende Local) */}
              <rect x="2" y="20" width="16" height="60" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.45" />
              <rect x="2" y="33" width="5.5" height="34" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.45" />
              <circle cx="11" cy="50" r="0.6" fill="rgba(255,255,255,0.95)" />
              <path d="M 18 36 A 6.5 14 0 0 1 18 64" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.45" />

              {/* Área Derecha (Defiende Visitante) */}
              <rect x="82" y="20" width="16" height="60" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.45" />
              <rect x="92.5" y="33" width="5.5" height="34" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.45" />
              <circle cx="89" cy="50" r="0.6" fill="rgba(255,255,255,0.95)" />
              <path d="M 82 36 A 6.5 14 0 0 0 82 64" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.45" />

              {/* Córners */}
              <path d="M 5 2 A 3 3 0 0 0 2 5" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.45" />
              <path d="M 95 2 A 3 3 0 0 1 98 5" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.45" />
              <path d="M 2 95 A 3 3 0 0 0 5 98" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.45" />
              <path d="M 98 95 A 3 3 0 0 1 95 98" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.45" />

              {/* Conexiones Tácticas / Redes entre Jugadores si está activado */}
              {showTacticalLines && (filterTeam === 'both' || filterTeam === 'home') && 
                renderTacticalLines(AVERAGE_POSITIONS_HOME, 'rgba(239, 68, 68, 0.7)')
              }

              {showTacticalLines && (filterTeam === 'both' || filterTeam === 'away') && 
                renderTacticalLines(AVERAGE_POSITIONS_AWAY, 'rgba(59, 130, 246, 0.7)')
              }
            </svg>

            {/* Trademark Panini Digital */}
            <div className="absolute top-2 right-3 text-[9px] font-extrabold text-white/50 pointer-events-none z-10">
              ©Panini Digital
            </div>

            {/* Escudos en las esquinas */}
            {/* Top Left: Villa Valle */}
            <div className="absolute top-2 left-2 w-8 h-8 bg-white/95 rounded-xl border border-white/30 p-1 shadow-md flex items-center justify-center pointer-events-none z-10 overflow-hidden">
              {homeLogo ? (
                <img src={homeLogo} alt={homeTeam.nombre} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-red-600 text-white font-black text-[8px] flex items-center justify-center rounded">
                  {homeTeam.nombre.substring(0, 3).toUpperCase()}
                </div>
              )}
            </div>

            {/* Top Right: Milan Futuro */}
            <div className="absolute top-2 right-2 w-8 h-8 bg-white/95 rounded-xl border border-white/30 p-1 shadow-md flex items-center justify-center pointer-events-none z-10 overflow-hidden">
              {awayLogo ? (
                <img src={awayLogo} alt={awayTeam.nombre} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-[#001f7a] text-white font-black text-[8px] flex items-center justify-center rounded">
                  {awayTeam.nombre.substring(0, 3).toUpperCase()}
                </div>
              )}
            </div>

            {/* Jugadores Equipo Local (Rojo - Atacan hacia la Derecha ➡) */}
            {(filterTeam === 'both' || filterTeam === 'home') &&
              Object.entries(AVERAGE_POSITIONS_HOME).map(([dorsalStr, coords]) => {
                const dorsal = Number(dorsalStr);
                const isGK = dorsal === 35;
                const playerObj = homeTeam.alineacion.find(p => p.dorsal === dorsal);
                const isSelected = selectedPlayer?.player.dorsal === dorsal && selectedPlayer.isHome;

                // Transformación Horizontal Directa
                const posX = coords.x;
                const posY = coords.y;

                return (
                  <div
                    key={`vv-${dorsal}`}
                    onClick={() =>
                      handleSelectPlayer(
                        playerObj || {
                          dorsal,
                          nombre: coords.label,
                          posicion: isGK ? 'P' : 'C',
                          posicion_desc: isGK ? 'Portero' : 'Titular',
                          minutos_jugados: 96,
                          es_titular: true,
                        },
                        true,
                        homeTeam.nombre
                      )
                    }
                    style={{
                      left: `${posX}%`,
                      top: `${posY}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute z-30 cursor-pointer transition-all duration-200 flex flex-col items-center ${
                      isSelected ? 'scale-130 z-50' : 'hover:scale-120'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-[10px] sm:text-xs shadow-md transition-all ${
                        isGK
                          ? 'bg-[#9da3a8] text-black border-2 border-red-600'
                          : 'bg-red-600 text-white border-2 border-white'
                      } ${isSelected ? 'ring-4 ring-amber-300 shadow-[0_0_15px_rgba(251,191,36,1)] scale-110' : ''}`}
                    >
                      {dorsal}
                    </div>
                    {showLabels && (
                      <span className={`text-[8px] sm:text-[8.5px] font-black px-1 rounded mt-0.5 pointer-events-none whitespace-nowrap shadow-xs ${
                        isSelected ? 'bg-amber-400 text-black font-extrabold' : 'bg-black/80 text-white'
                      }`}>
                        {coords.label}
                      </span>
                    )}
                  </div>
                );
              })}

            {/* Jugadores Milan Futuro (Azul - Atacan hacia la Izquierda ⬅) */}
            {(filterTeam === 'both' || filterTeam === 'away') &&
              Object.entries(AVERAGE_POSITIONS_AWAY).map(([dorsalStr, coords]) => {
                const dorsal = Number(dorsalStr);
                const isGK = dorsal === 1;
                const playerObj = awayTeam.alineacion.find(p => p.dorsal === dorsal);
                const isSelected = selectedPlayer?.player.dorsal === dorsal && !selectedPlayer.isHome;

                // Transformación Horizontal Directa
                const posX = coords.x;
                const posY = coords.y;

                return (
                  <div
                    key={`mf-${dorsal}`}
                    onClick={() =>
                      handleSelectPlayer(
                        playerObj || {
                          dorsal,
                          nombre: coords.label,
                          posicion: isGK ? 'P' : 'C',
                          posicion_desc: isGK ? 'Portero' : 'Titular',
                          minutos_jugados: 96,
                          es_titular: true,
                        },
                        false,
                        awayTeam.nombre
                      )
                    }
                    style={{
                      left: `${posX}%`,
                      top: `${posY}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute z-30 cursor-pointer transition-all duration-200 flex flex-col items-center ${
                      isSelected ? 'scale-130 z-50' : 'hover:scale-120'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-[10px] sm:text-xs shadow-md transition-all ${
                        isGK
                          ? 'bg-[#9da3a8] text-black border-2 border-blue-900'
                          : 'bg-[#001f7a] text-white border-2 border-white'
                      } ${isSelected ? 'ring-4 ring-amber-300 shadow-[0_0_15px_rgba(251,191,36,1)] scale-110' : ''}`}
                    >
                      {dorsal}
                    </div>
                    {showLabels && (
                      <span className={`text-[8px] sm:text-[8.5px] font-black px-1 rounded mt-0.5 pointer-events-none whitespace-nowrap shadow-xs ${
                        isSelected ? 'bg-amber-400 text-black font-extrabold' : 'bg-black/80 text-white'
                      }`}>
                        {coords.label}
                      </span>
                    )}
                  </div>
                );
              })}

          </div>

          {/* 3. Panel Inferior Central Dinámico: Inspección de Jugador O Comparativa Táctica */}
          {selectedPlayer ? (
            <div className="w-full p-3 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-white/10 space-y-2 animate-scale-in">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-md shrink-0 ${
                      selectedPlayer.isHome ? 'bg-red-600 text-white' : 'bg-[#001f7a] text-white'
                    }`}
                  >
                    {selectedPlayer.player.dorsal}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-xs sm:text-sm text-white truncate">{selectedPlayer.player.nombre}</h4>
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">
                        {selectedPlayer.player.posicion}
                      </span>
                    </div>
                    <span className="text-[10.5px] text-indigo-200 block truncate">
                      {selectedPlayer.teamName} • {selectedPlayer.player.minutos_jugados} minutos jugados
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigateToPlayerCard(selectedPlayer.player.player_id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black transition-all shadow-xs cursor-pointer shrink-0"
                >
                  <User size={12} />
                  <span>Ficha</span>
                  <ExternalLink size={11} />
                </button>
              </div>

              {/* Estadísticas Clave del Jugador Seleccionado */}
              {selectedPlayer.stats && (
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/10 text-center text-[10px]">
                  <div className="bg-white/5 p-1 rounded-lg">
                    <span className="text-gray-400 text-[8.5px] block">Pases</span>
                    <span className="font-bold text-white">{selectedPlayer.stats.pases_acertados}</span>
                  </div>
                  <div className="bg-white/5 p-1 rounded-lg">
                    <span className="text-gray-400 text-[8.5px] block">Balones</span>
                    <span className="font-bold text-white">{selectedPlayer.stats.balones_jugados}</span>
                  </div>
                  <div className="bg-white/5 p-1 rounded-lg">
                    <span className="text-gray-400 text-[8.5px] block">Duelos</span>
                    <span className="font-bold text-white">{selectedPlayer.stats.duelos_efectivos || '-'}</span>
                  </div>
                  <div className="bg-white/5 p-1 rounded-lg">
                    <span className="text-gray-400 text-[8.5px] block">Recuperac.</span>
                    <span className="font-bold text-white">{selectedPlayer.stats.recuperaciones_efectivas || '-'}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-neutral-900 border border-gray-200/80 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-black text-gray-700 dark:text-gray-300">
                <span className="flex items-center gap-1">
                  <Activity size={12} className="text-indigo-500" /> Comparativa de Baricentros y Posesión
                </span>
                <span className="text-[10px] text-gray-400">90' Completo</span>
              </div>

              {/* Slider de Baricentro Comparativo */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-red-600">{homeTeam.nombre}: {homeBaricentro.toFixed(1)}m</span>
                  <span className="text-blue-600">{awayTeam.nombre}: {awayBaricentro.toFixed(1)}m</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-neutral-700 rounded-full flex overflow-hidden">
                  <div style={{ width: `${(homeBaricentro / (homeBaricentro + awayBaricentro)) * 100}%` }} className="bg-red-500 h-full" />
                  <div style={{ width: `${(awayBaricentro / (homeBaricentro + awayBaricentro)) * 100}%` }} className="bg-[#001f7a] h-full" />
                </div>
              </div>

              {/* Slider de Posesión */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-red-600">Posesión {homePoss}%</span>
                  <span className="text-blue-600">Posesión {awayPoss}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full flex overflow-hidden">
                  <div style={{ width: `${homePoss}%` }} className="bg-red-500 h-full" />
                  <div style={{ width: `${awayPoss}%` }} className="bg-[#001f7a] h-full" />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ======================================================== */}
        {/* COLUMNA 3: ALINEACIÓN VISITANTE (Milan Futuro - 3 cols)   */}
        {/* ======================================================== */}
        <div className="col-span-3 order-3 flex flex-col justify-between bg-white dark:bg-[#121317] p-2.5 sm:p-3.5 rounded-2xl border border-blue-100 dark:border-blue-950/40 shadow-sm space-y-3">
          
          <div className="space-y-3">
            {/* Header Equipo Visitante */}
            <div className="flex items-center justify-between pb-2.5 border-b border-blue-100 dark:border-blue-900/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-800 border border-blue-200 dark:border-blue-900/50 p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                  {awayLogo ? (
                    <img src={awayLogo} alt={awayTeam.nombre} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-[#001f7a] text-white font-black text-[9px] flex items-center justify-center rounded">
                      {awayTeam.nombre.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-black text-sm text-blue-600 dark:text-blue-400 tracking-wide uppercase truncate">
                      {awayTeam.nombre}
                    </h4>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 shrink-0">
                      4-3-3
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block truncate">
                    Entrenador: {awayTeam.entrenador || 'D. Bonera'} • ⬇ Ataque
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-black uppercase text-gray-400 block">IVS</span>
                <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                  {awayTeam.ims ? awayTeam.ims.toFixed(2) : '0.64'}
                </span>
              </div>
            </div>

            {/* Lista Titulares y Cambios */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9.5px] font-black uppercase tracking-wider text-gray-400 px-2 py-0.5">
                <span>Min / Jugador</span>
                <span>Pases / Balones</span>
              </div>

              {awayTeam.alineacion.map((p) => {
                const hasYellow = p.tarjetas_amarillas && p.tarjetas_amarillas.length > 0;
                const isSubIn = !p.es_titular;
                const isSubOut = p.minuto_salida !== undefined;
                const isSelected = selectedPlayer?.player.dorsal === p.dorsal && !selectedPlayer.isHome;
                const pStats = getPlayerDetailedStats(p.dorsal, false);

                return (
                  <div
                    key={p.dorsal}
                    onClick={() => handleSelectPlayer(p, false, awayTeam.nombre)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer group text-[11px] ${
                      isSelected
                        ? 'bg-[#001f7a] text-white border-blue-600 shadow-md ring-2 ring-blue-400 font-bold'
                        : isSubIn
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40 hover:border-blue-300'
                        : 'bg-gray-50/80 dark:bg-neutral-800/60 border-gray-100 dark:border-white/5 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Dorsal */}
                      <span className={`w-5 h-5 rounded-full font-black text-[9.5px] flex items-center justify-center shrink-0 shadow-xs ${
                        isSelected 
                          ? 'bg-white text-[#001f7a]' 
                          : 'bg-[#001f7a] text-white'
                      }`}>
                        {p.dorsal}
                      </span>

                      {/* Posición */}
                      <span className={`w-4 h-4 rounded text-[8.5px] font-black flex items-center justify-center shrink-0 ${
                        isSelected 
                          ? 'bg-blue-900 text-white' 
                          : 'bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {p.posicion}
                      </span>

                      {/* Minutos jugados */}
                      <span className={`font-mono text-[10px] w-6 shrink-0 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                        {p.minutos_jugados}'
                      </span>

                      {/* Nombre Jugador */}
                      <span className={`font-bold truncate transition-colors ${
                        isSelected ? 'text-white' : 'text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      }`}>
                        {p.nombre}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {/* Tarjeta amarilla */}
                      {hasYellow && (
                        <span className="w-2.5 h-3.5 bg-amber-400 rounded-xs flex items-center justify-center text-[7.5px] font-black text-black shadow-xs shrink-0" title={`Tarjeta Amarilla (${p.tarjetas_amarillas?.[0]}')`}>
                          {p.tarjetas_amarillas?.[0]}
                        </span>
                      )}

                      {/* Indicadores de sustitución */}
                      {isSubIn && (
                        <span className={`flex items-center font-bold text-[9.5px] ${isSelected ? 'text-white' : 'text-emerald-500'}`} title={`Entró en el min ${p.minuto_entrada}'`}>
                          <ArrowDownLeft size={10} className="stroke-[3]" /> {p.minuto_entrada}'
                        </span>
                      )}
                      {isSubOut && (
                        <span className={`flex items-center font-bold text-[9.5px] ${isSelected ? 'text-white' : 'text-red-500'}`} title={`Sustituido en el min ${p.minuto_salida}'`}>
                          <ArrowUpRight size={10} className="stroke-[3]" /> {p.minuto_salida}'
                        </span>
                      )}

                      {/* Pases / Balones jugados */}
                      {pStats && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-blue-900 text-white' : 'bg-gray-100 dark:bg-neutral-700/80 text-gray-600 dark:text-gray-300'
                        }`}>
                          {pStats.pases_acertados}/{pStats.balones_jugados}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Banquillo / Suplentes */}
            {awayTeam.suplentes_no_utilizados && awayTeam.suplentes_no_utilizados.length > 0 && (
              <div className="pt-2 border-t border-blue-100 dark:border-white/5 space-y-1">
                <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider block">
                  Banquillo (Sin Minutos):
                </span>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  {awayTeam.suplentes_no_utilizados.map((p) => (
                    <div key={p.dorsal} className="px-2 py-1 rounded-lg bg-gray-50 dark:bg-neutral-800/80 border border-gray-100 dark:border-white/5 flex items-center justify-between text-gray-500 dark:text-gray-400 truncate">
                      <span className="truncate">#{p.dorsal} {p.nombre}</span>
                      <span className="font-bold text-[8.5px] ml-1 bg-gray-200 dark:bg-neutral-700 px-1 rounded">{p.posicion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta de Métricas Tácticas de Bloque (Rellena el espacio inferior con datos de alto valor) */}
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-blue-50/60 to-indigo-50/30 dark:from-blue-950/20 dark:to-neutral-900 border border-blue-100 dark:border-blue-900/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-blue-700 dark:text-blue-400">
              <span className="flex items-center gap-1.5">
                <TrendingUp size={13} /> Perfil Táctico {awayTeam.nombre}
              </span>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">
                Bloque 1T
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="bg-white dark:bg-neutral-800 p-1.5 rounded-lg border border-blue-100/80 dark:border-white/5 shadow-xs">
                <span className="text-gray-400 text-[8.5px] font-bold block uppercase">Baricentro</span>
                <span className="font-black text-blue-600 dark:text-blue-400 text-xs">{awayBaricentro.toFixed(1)} m</span>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-1.5 rounded-lg border border-blue-100/80 dark:border-white/5 shadow-xs">
                <span className="text-gray-400 text-[8.5px] font-bold block uppercase">Longitud</span>
                <span className="font-black text-gray-800 dark:text-gray-200 text-xs">{awayBlock.longitud_m.toFixed(1)} m</span>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-1.5 rounded-lg border border-blue-100/80 dark:border-white/5 shadow-xs">
                <span className="text-gray-400 text-[8.5px] font-bold block uppercase">Anchura</span>
                <span className="font-black text-gray-800 dark:text-gray-200 text-xs">{awayBlock.anchura_m.toFixed(1)} m</span>
              </div>
            </div>

            {/* Densidades de Líneas */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-gray-500">
                <span>Def: {awayBlock.densidad_defensa_pct}%</span>
                <span>Med: {awayBlock.densidad_medio_pct}%</span>
                <span>Att: {awayBlock.densidad_ataque_pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full flex overflow-hidden">
                <div style={{ width: `${awayBlock.densidad_defensa_pct}%` }} className="bg-blue-400 h-full" />
                <div style={{ width: `${awayBlock.densidad_medio_pct}%` }} className="bg-indigo-400 h-full" />
                <div style={{ width: `${awayBlock.densidad_ataque_pct}%` }} className="bg-emerald-400 h-full" />
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
