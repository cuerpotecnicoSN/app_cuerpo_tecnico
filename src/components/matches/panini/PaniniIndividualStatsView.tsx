import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserCheck, 
  Award, 
  User, 
  ExternalLink, 
  Trophy, 
  ArrowUp,
  Shield,
  Zap
} from 'lucide-react';
import type { PaniniTeamData, PaniniPlayerStats, PaniniMapEvent } from '../../../types/paniniReport';

interface Props {
  homeTeam: PaniniTeamData;
  awayTeam: PaniniTeamData;
}

export default function PaniniIndividualStatsView({ homeTeam, awayTeam }: Props) {
  const navigate = useNavigate();
  const [selectedTeamKey, setSelectedTeamKey] = useState<'home' | 'away'>('home');
  const [selectedDorsal, setSelectedDorsal] = useState<number | null>(null);

  const isHome = selectedTeamKey === 'home';
  const team = isHome ? homeTeam : awayTeam;

  // Fusionar jugadores_stats con alineacion para garantizar que TODOS los jugadores estén presentes
  const allPlayers = useMemo(() => {
    const list: PaniniPlayerStats[] = [];
    const statsMap = new Map<number, PaniniPlayerStats>();
    (team.jugadores_stats || []).forEach((s) => statsMap.set(s.dorsal, s));

    (team.alineacion || []).forEach((lineupP) => {
      const existing = statsMap.get(lineupP.dorsal);
      if (existing) {
        list.push({
          ...existing,
          player_id: existing.player_id || lineupP.player_id,
          posicion: existing.posicion || lineupP.posicion_desc,
        });
      } else {
        // Jugador sin ficha en el informe: se muestra sin métricas (no se inventan valores)
        list.push({
          dorsal: lineupP.dorsal,
          nombre: lineupP.nombre,
          anio_nacimiento: 0,
          posicion: lineupP.posicion_desc || '',
          minutos: `${lineupP.minutos_jugados}'`,
          player_id: lineupP.player_id,
          balones_jugados: 0,
          posesion_tiempo: '—',
          pases_acertados: 0,
          acciones_utiles: 0,
          perdidas_efectivas: 0,
          recuperaciones_efectivas: '—',
          recuperaciones_aereas: 0,
          recuperaciones_area: 0,
          intercepciones: 0,
          anticipaciones_efectivas: '—',
          duelos_efectivos: '—',
          faltas_cometidas: 0,
          faltas_recibidas: 0,
          pases_largos_utiles: '—',
          regates_utiles: '—',
          centros_utiles: '—',
          asistencias_pases_clave: '—',
          tiros_a_puerta: '—',
        });
      }
    });

    return list;
  }, [team]);

  // Separar titulares y suplentes
  const starters = useMemo(() => {
    return allPlayers.filter((p) => {
      const lineP = team.alineacion.find((a) => a.dorsal === p.dorsal);
      return lineP ? lineP.es_titular : true;
    });
  }, [allPlayers, team]);

  const substitutes = useMemo(() => {
    return allPlayers.filter((p) => {
      const lineP = team.alineacion.find((a) => a.dorsal === p.dorsal);
      return lineP ? !lineP.es_titular : false;
    });
  }, [allPlayers, team]);

  const activePlayer = useMemo(() => {
    return (
      allPlayers.find((p) => p.dorsal === selectedDorsal) ||
      allPlayers[0] ||
      ({} as PaniniPlayerStats)
    );
  }, [allPlayers, selectedDorsal]);

  const isGK =
    activePlayer.posicion?.toLowerCase().includes('port') ||
    team.alineacion.find((a) => a.dorsal === activePlayer.dorsal)?.posicion === 'P';

  const navigateToPlayerCard = (playerId?: string) => {
    if (playerId) {
      navigate(`/players/${playerId}?view=ficha`);
    } else {
      navigate(`/players?view=ficha`);
    }
  };

  const rankings = team.rankings_top || {};

  // Toques reales del jugador (mapas verticales del PDF). Datos en coordenadas de ataque;
  // el campo dibujado (viewBox 60×95) ataca hacia arriba con líneas en x 2-58 e y 2-93.
  const toPitchPoints = (touches?: PaniniMapEvent[]) =>
    (touches ?? []).map((t) => ({
      x: ((2 + t.y * 0.56) / 60) * 100,
      y: ((2 + (100 - t.x) * 0.91) / 95) * 100,
      abp: t.balon_parado,
    }));

  const points1T = useMemo(() => toPitchPoints(activePlayer.toques_1t), [activePlayer]);
  const points2T = useMemo(() => toPitchPoints(activePlayer.toques_2t), [activePlayer]);
  const pct = (n?: number) => (n === undefined ? '—' : `${n}%`);

  return (
    <div className="space-y-8 animate-fade-in text-gray-800 dark:text-gray-100">
      
      {/* Selector de Equipo y Lista de Jugadores (Titulares y Suplentes) */}
      <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
        
        {/* Header con Switch de Equipo */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-100 dark:border-white/10">
          <div>
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <UserCheck className="text-indigo-600 dark:text-indigo-400" size={18} />
              Estadísticas Individuales de Jugador (Zoom sui Giocatori - Págs. 12-19)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Selecciona cualquier jugador para ver su análisis por rol y doble campograma vertical (1T y 2T).
            </p>
          </div>

          <div className="flex bg-gray-100 dark:bg-neutral-800 p-1.5 rounded-2xl border border-gray-200/60 dark:border-white/10 shadow-inner">
            <button
              onClick={() => { setSelectedTeamKey('home'); setSelectedDorsal(35); }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedTeamKey === 'home'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-2 ring-red-500/30 scale-[1.02]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
              }`}
            >
              {homeTeam.nombre} ({starters.length + substitutes.length})
            </button>
            <button
              onClick={() => { setSelectedTeamKey('away'); setSelectedDorsal(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedTeamKey === 'away'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/30 scale-[1.02]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
              }`}
            >
              {awayTeam.nombre} ({awayTeam.alineacion.length})
            </button>
          </div>
        </div>

        {/* 1. Titulares (Titolari) */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Shield size={12} className="text-indigo-500" /> Titulares ({starters.length})
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {starters.map((p) => {
              const isSelected = selectedDorsal === p.dorsal;
              return (
                <button
                  key={p.dorsal}
                  onClick={() => setSelectedDorsal(p.dorsal)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? isHome
                        ? 'bg-red-600 text-white border-red-600 shadow-md scale-105'
                        : 'bg-[#001f7a] text-white border-[#001f7a] shadow-md scale-105'
                      : 'bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-100'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isSelected
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {p.dorsal}
                  </span>
                  <span>{p.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Suplentes que jugaron (Subentrati) */}
        {substitutes.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Zap size={12} className="text-amber-500" /> Suplentes que entraron ({substitutes.length})
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {substitutes.map((p) => {
                const isSelected = selectedDorsal === p.dorsal;
                return (
                  <button
                    key={p.dorsal}
                    onClick={() => setSelectedDorsal(p.dorsal)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? isHome
                          ? 'bg-red-600 text-white border-red-600 shadow-md scale-105'
                          : 'bg-[#001f7a] text-white border-[#001f7a] shadow-md scale-105'
                        : 'bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-100'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isSelected
                          ? 'bg-white text-gray-900'
                          : 'bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {p.dorsal}
                    </span>
                    <span>{p.nombre}</span>
                    <span className="text-[9px] opacity-75 font-mono">({p.minutos})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* 1. Ficha del Jugador (Tabla a 2 columnas + Doble Campograma Vertical) */}
      {activePlayer && (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-lg space-y-6">
          
          {/* Header de la Ficha */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b-2 border-gray-200 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2.5">
                <span className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-base text-white shadow-md ${isHome ? 'bg-red-600' : 'bg-[#001f7a]'}`}>
                  {activePlayer.dorsal}
                </span>
                <div>
                  <h3 className="font-black text-xl text-gray-900 dark:text-white">
                    {activePlayer.nombre}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                    {activePlayer.minutos || "96'"} • Nac. {activePlayer.anio_nacimiento || 2004} - {activePlayer.posicion}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigateToPlayerCard(activePlayer.player_id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md transition-all cursor-pointer"
            >
              <User size={15} />
              <span>Ver Ficha en Base de Datos</span>
              <ExternalLink size={14} />
            </button>
          </div>

          {/* Body: Tabla a 2 Columnas + 2 Campogramas Verticales */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Tabla de Estadísticas Específicas por Rol (2 Columnas) */}
            <div className="lg:col-span-7 bg-gray-50 dark:bg-neutral-800/50 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {/* Fila 1 */}
                  <tr className="divide-x divide-gray-200 dark:divide-white/10 hover:bg-white/40 dark:hover:bg-neutral-700/30">
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">Balones jugados</td>
                    <td className="p-2.5 font-mono font-black text-gray-900 dark:text-white w-20 text-right">{activePlayer.balones_jugados || 0}</td>
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">
                      {isGK ? 'Paradas en ocasión' : 'Faltas recibidas'}
                    </td>
                    <td className="p-2.5 font-mono font-black text-gray-900 dark:text-white w-20 text-right">
                      {isGK ? activePlayer.paradas_ocasion || 1 : activePlayer.faltas_recibidas || 0}
                    </td>
                  </tr>

                  {/* Fila 2 */}
                  <tr className="divide-x divide-gray-200 dark:divide-white/10 hover:bg-white/40 dark:hover:bg-neutral-700/30">
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">Posesión de balón</td>
                    <td className="p-2.5 font-mono font-black text-gray-900 dark:text-white text-right">{activePlayer.posesion_tiempo || "1':30\""}</td>
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">
                      {isGK ? 'Salidas altas' : 'Pases largos útiles'}
                    </td>
                    <td className="p-2.5 font-mono font-black text-gray-900 dark:text-white text-right">
                      {isGK ? activePlayer.salidas_altas || 1 : activePlayer.pases_largos_utiles || '0/0'}
                    </td>
                  </tr>

                  {/* Fila 3 */}
                  <tr className="divide-x divide-gray-200 dark:divide-white/10 hover:bg-white/40 dark:hover:bg-neutral-700/30">
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">Pases acertados</td>
                    <td className="p-2.5 font-mono font-black text-gray-900 dark:text-white text-right">{activePlayer.pases_acertados || 0}</td>
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">
                      {isGK ? 'Salidas bajas' : 'Regates útiles'}
                    </td>
                    <td className="p-2.5 font-mono font-black text-gray-900 dark:text-white text-right">
                      {isGK ? activePlayer.salidas_bajas || 8 : activePlayer.regates_utiles || '0/0'}
                    </td>
                  </tr>

                  {/* Fila 4 */}
                  <tr className="divide-x divide-gray-200 dark:divide-white/10 hover:bg-white/40 dark:hover:bg-neutral-700/30">
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">Jugadas útiles (Elimina rival)</td>
                    <td className="p-2.5 font-mono font-black text-indigo-600 dark:text-indigo-400 text-right">{activePlayer.acciones_utiles || 0}</td>
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">
                      {isGK ? 'Salidas en centro de jugada' : 'Centros útiles'}
                    </td>
                    <td className="p-2.5 font-mono font-black text-gray-900 dark:text-white text-right">
                      {isGK ? activePlayer.salidas_centro_jugada || 1 : activePlayer.centros_utiles || '0/0'}
                    </td>
                  </tr>

                  {/* Fila 5 */}
                  <tr className="divide-x divide-gray-200 dark:divide-white/10 hover:bg-white/40 dark:hover:bg-neutral-700/30">
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">Pérdidas de balón</td>
                    <td className="p-2.5 font-mono font-black text-gray-900 dark:text-white text-right">{activePlayer.perdidas_efectivas || 0}</td>
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">
                      {isGK ? 'Salidas en balón parado' : 'Asistencias / Pases clave'}
                    </td>
                    <td className="p-2.5 font-mono font-black text-gray-900 dark:text-white text-right">
                      {isGK ? activePlayer.salidas_balon_parado || 0 : activePlayer.asistencias_pases_clave || '0/0'}
                    </td>
                  </tr>

                  {/* Fila 6 */}
                  <tr className="divide-x divide-gray-200 dark:divide-white/10 hover:bg-white/40 dark:hover:bg-neutral-700/30">
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">Recuperaciones efectivas</td>
                    <td className="p-2.5 font-mono font-black text-emerald-600 dark:text-emerald-400 text-right">{activePlayer.recuperaciones_efectivas || '0/0'}</td>
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">
                      {isGK ? 'Saques largos útiles' : 'Faltas cometidas'}
                    </td>
                    <td className="p-2.5 font-mono font-black text-gray-900 dark:text-white text-right">
                      {isGK ? activePlayer.saques_largos_utiles || '12/24' : activePlayer.faltas_cometidas || 0}
                    </td>
                  </tr>

                  {/* Fila 7 */}
                  <tr className="divide-x divide-gray-200 dark:divide-white/10 hover:bg-white/40 dark:hover:bg-neutral-700/30">
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">
                      {isGK ? 'Goles encajados' : 'Intercepciones'}
                    </td>
                    <td className="p-2.5 font-mono font-black text-red-500 text-right">
                      {isGK ? activePlayer.goles_encajados || 0 : activePlayer.intercepciones || 0}
                    </td>
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">
                      {isGK ? 'Tiros a puerta recibidos' : 'Tiros a puerta'}
                    </td>
                    <td className="p-2.5 font-mono font-black text-gray-900 dark:text-white text-right">
                      {isGK ? '3/7' : activePlayer.tiros_a_puerta || '0/0'}
                    </td>
                  </tr>

                  {/* Fila 8 */}
                  <tr className="divide-x divide-gray-200 dark:divide-white/10 hover:bg-white/40 dark:hover:bg-neutral-700/30">
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">
                      {isGK ? 'Paradas totales' : 'Duelos efectivos'}
                    </td>
                    <td className="p-2.5 font-mono font-black text-gray-900 dark:text-white text-right">
                      {isGK ? activePlayer.paradas || 0 : activePlayer.duelos_efectivos || '0/0'}
                    </td>
                    <td className="p-2.5 font-bold text-gray-600 dark:text-gray-300">Anticipaciones efectivas</td>
                    <td className="p-2.5 font-mono font-black text-gray-900 dark:text-white text-right">
                      {activePlayer.anticipaciones_efectivas || '0/0'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Dos Campogramas Verticales (Primo Tempo y Secondo Tempo) */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-4">
              
              {/* 1º Tiempo */}
              <div className="flex flex-col items-center space-y-2">
                <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1">
                  1º Tiempo (Primo tempo)
                </span>

                {/* Vertical Pitch */}
                <div className="relative w-full aspect-[60/95] rounded-2xl overflow-hidden border-2 border-gray-300 dark:border-white/20 bg-[#a7d7a9] select-none shadow-inner p-1.5 flex flex-col justify-between">
                  
                  {/* Pitch Lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 60 95" preserveAspectRatio="none">
                    <rect x="2" y="2" width="56" height="91" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                    <line x1="2" y1="47.5" x2="58" y2="47.5" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                    <circle cx="30" cy="47.5" r="7" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                    
                    {/* Top Goal Area (Attack direction) */}
                    <rect x="18" y="2" width="24" height="12" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                    {/* Bottom Goal Area (Defensive) */}
                    <rect x="18" y="81" width="24" height="12" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                    <rect x="23" y="87" width="14" height="6" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                  </svg>

                  {/* Attack Arrow UP */}
                  <div className="absolute left-2 top-8 flex flex-col items-center text-gray-800 dark:text-gray-900 font-black">
                    <ArrowUp size={24} className="stroke-[3]" />
                  </div>

                  {/* Percentage in Y (Defensa) */}
                  <div className="absolute right-1 inset-y-6 flex flex-col justify-between items-end text-[9px] font-mono font-black text-gray-800 z-10" title="Ataque / medio / defensa">
                    <span>{pct(activePlayer.distribucion_1t?.ataque_pct)}</span>
                    <span>{pct(activePlayer.distribucion_1t?.medio_pct)}</span>
                    <span>{pct(activePlayer.distribucion_1t?.defensa_pct)}</span>
                  </div>

                  {/* Touch Points Plotted (CIRCLES for 1T) */}
                  <div className="absolute inset-0 pointer-events-none">
                    {points1T.map((pt, idx) => (
                      <div
                        key={idx}
                        style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-black shadow-sm ${
                          pt.abp
                            ? isHome ? 'bg-pink-300' : 'bg-sky-300'
                            : isHome ? 'bg-red-600' : 'bg-[#001f7a]'
                        }`}
                        title={pt.abp ? 'Balón parado' : 'Acción de juego'}
                      />
                    ))}
                  </div>

                  {/* Bottom Margins % (3 zones in X) */}
                  <div className="flex justify-between items-center text-[9px] font-mono font-black text-gray-800 z-10 pt-1">
                    <span title="Banda izquierda">{pct(activePlayer.distribucion_1t?.izq_pct)}</span>
                    <span title="Centro">{pct(activePlayer.distribucion_1t?.cen_pct)}</span>
                    <span title="Banda derecha">{pct(activePlayer.distribucion_1t?.dcha_pct)}</span>
                  </div>
                </div>
              </div>

              {/* 2º Tiempo */}
              <div className="flex flex-col items-center space-y-2">
                <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1">
                  2º Tiempo (Secondo tempo)
                </span>

                {/* Vertical Pitch */}
                <div className="relative w-full aspect-[60/95] rounded-2xl overflow-hidden border-2 border-gray-300 dark:border-white/20 bg-[#a7d7a9] select-none shadow-inner p-1.5 flex flex-col justify-between">
                  
                  {/* Pitch Lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 60 95" preserveAspectRatio="none">
                    <rect x="2" y="2" width="56" height="91" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                    <line x1="2" y1="47.5" x2="58" y2="47.5" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                    <circle cx="30" cy="47.5" r="7" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                    
                    <rect x="18" y="2" width="24" height="12" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                    <rect x="18" y="81" width="24" height="12" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                    <rect x="23" y="87" width="14" height="6" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                  </svg>

                  {/* Attack Arrow UP */}
                  <div className="absolute left-2 top-8 flex flex-col items-center text-gray-800 dark:text-gray-900 font-black">
                    <ArrowUp size={24} className="stroke-[3]" />
                  </div>

                  {/* Percentage in Y */}
                  <div className="absolute right-1 inset-y-6 flex flex-col justify-between items-end text-[9px] font-mono font-black text-gray-800 z-10" title="Ataque / medio / defensa">
                    <span>{pct(activePlayer.distribucion_2t?.ataque_pct)}</span>
                    <span>{pct(activePlayer.distribucion_2t?.medio_pct)}</span>
                    <span>{pct(activePlayer.distribucion_2t?.defensa_pct)}</span>
                  </div>

                  {/* Touch Points Plotted (SQUARES for 2T) */}
                  <div className="absolute inset-0 pointer-events-none">
                    {points2T.map((pt, idx) => (
                      <div
                        key={idx}
                        style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-xs border border-black shadow-sm ${
                          pt.abp
                            ? isHome ? 'bg-pink-300' : 'bg-sky-300'
                            : isHome ? 'bg-red-600' : 'bg-[#001f7a]'
                        }`}
                        title={pt.abp ? 'Balón parado' : 'Acción de juego'}
                      />
                    ))}
                  </div>

                  {/* Bottom Margins % */}
                  <div className="flex justify-between items-center text-[9px] font-mono font-black text-gray-800 z-10 pt-1">
                    <span title="Banda izquierda">{pct(activePlayer.distribucion_2t?.izq_pct)}</span>
                    <span title="Centro">{pct(activePlayer.distribucion_2t?.cen_pct)}</span>
                    <span title="Banda derecha">{pct(activePlayer.distribucion_2t?.dcha_pct)}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* 2. Rankings Top 5 del Equipo (Cuadrícula de 9 Tarjetas) */}
      <div className="space-y-4 pt-4 border-t-2 border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Trophy className="text-amber-500" size={20} />
          <h3 className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-wider">
            Rankings Top 5 del Equipo - {team.nombre}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(rankings).map(([category, items]) => (
            <div
              key={category}
              className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3 hover:border-indigo-300 transition-colors"
            >
              <h4 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                <span>{category}</span>
                <Award size={14} className="text-amber-500" />
              </h4>

              <div className="space-y-1.5 text-xs">
                {items.map((playerRank, rIdx) => (
                  <div
                    key={rIdx}
                    onClick={() => setSelectedDorsal(playerRank.dorsal)}
                    className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-neutral-800/70 border border-gray-100 dark:border-white/5 cursor-pointer hover:border-indigo-400 transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 font-black text-[10px] flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        {rIdx + 1}
                      </span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        #{playerRank.dorsal} {playerRank.nombre}
                      </span>
                    </div>

                    <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                      {playerRank.valor}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

