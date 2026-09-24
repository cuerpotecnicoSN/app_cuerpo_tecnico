import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Activity, 
  Layers, 
  Crosshair, 
  Share2, 
  UserCheck, 
  Clock, 
  Award, 
  Zap, 
  Upload, 
  ExternalLink,
  User
} from 'lucide-react';
import type { PaniniMatchReport } from '../../types/paniniReport';
import SubNavTabs from '../common/SubNavTabs';
import TacticalFormationPitch from './panini/TacticalFormationPitch';
import PassNetworkPitch from './panini/PassNetworkPitch';
import ShotMapPitch from './panini/ShotMapPitch';
import TerritorialHeatmapPitch from './panini/TerritorialHeatmapPitch';
import PaniniImportModal from './panini/PaniniImportModal';

interface Props {
  matchId: string;
  report: PaniniMatchReport;
  onRefresh?: () => void;
}

export default function PaniniReportView({ matchId, report, onRefresh }: Props) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'score' | 'tactica' | 'cobertura' | 'finalizacion' | 'pases' | 'jugadores'>('score');
  const [period, setPeriod] = useState<'total_partido' | 'primer_tiempo' | 'segundo_tiempo'>('total_partido');
  const [selectedTeam, setSelectedTeam] = useState<'away' | 'home'>('away'); // Milan Futuro por defecto
  const [selectedPlayerDorsal, setSelectedPlayerDorsal] = useState<number>(8); // Pandolfi por defecto
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const home = report.equipo_local;
  const away = report.equipo_visitante;
  const currentTeamObj = selectedTeam === 'away' ? away : home;

  // Jugador seleccionado para Zoom
  const selectedPlayerStats =
    currentTeamObj.jugadores_stats.find((p) => p.dorsal === selectedPlayerDorsal) ||
    currentTeamObj.jugadores_stats[0];

  const navigateToPlayerCard = (playerId?: string) => {
    if (playerId) {
      navigate(`/players/${playerId}?view=ficha`);
    } else {
      navigate(`/players?view=ficha`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-gray-800 dark:text-gray-100">
      
      {/* 1. Header Card / Resumen del Partido Panini */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
              <Award size={14} /> PANINI DIGITAL MATCH ANALYSIS
            </span>
            <span className="text-xs text-gray-300 font-bold bg-white/10 px-3 py-1 rounded-full">
              {report.competicion} • {report.jornada}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-gray-300">
            <span>📅 {report.fecha}</span>
            <span>📍 {report.estadio}</span>
            <span>👨‍⚖️ {report.arbitro}</span>
          </div>
        </div>

        {/* Score & Main Match Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Equipos y Marcador */}
          <div className="lg:col-span-6 flex items-center justify-between gap-4 bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
            {/* Local */}
            <div className="flex flex-col items-center flex-1 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-600/30 border-2 border-red-500 flex items-center justify-center font-black text-xl text-red-200 shadow-lg mb-2">
                VV
              </div>
              <span className="font-extrabold text-base text-red-300 leading-tight">{home.nombre}</span>
              <span className="text-xs text-gray-400 mt-0.5">Dir: {home.entrenador}</span>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center px-4">
              <div className="flex items-center gap-3 font-black text-4xl md:text-5xl tracking-tight">
                <span className="text-red-400">{home.goles}</span>
                <span className="text-gray-500 text-3xl font-light">-</span>
                <span className="text-blue-400">{away.goles}</span>
              </div>
              <span className="text-[11px] font-black uppercase text-emerald-400 tracking-widest bg-emerald-500/20 px-2.5 py-0.5 rounded-full mt-2">
                Finalizado
              </span>
            </div>

            {/* Visitante */}
            <div className="flex flex-col items-center flex-1 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border-2 border-blue-500 flex items-center justify-center font-black text-xl text-blue-200 shadow-lg mb-2">
                MF
              </div>
              <span className="font-extrabold text-base text-blue-300 leading-tight">{away.nombre}</span>
              <span className="text-xs text-gray-400 mt-0.5">Dir: {away.entrenador}</span>
            </div>
          </div>

          {/* KPI Advanced Badges */}
          <div className="lg:col-span-6 grid grid-cols-3 gap-3">
            {/* xG */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center flex flex-col justify-center">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">xG (Goles Esperados)</span>
              <div className="flex items-center justify-center gap-2 mt-1 font-black text-xl">
                <span className="text-red-400">{home.xg}</span>
                <span className="text-gray-500 text-sm">vs</span>
                <span className="text-blue-400">{away.xg}</span>
              </div>
              <div className="w-full bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden flex">
                <div className="bg-red-500 h-full" style={{ width: `${(home.xg / (home.xg + away.xg || 1)) * 100}%` }} />
                <div className="bg-blue-500 h-full" style={{ width: `${(away.xg / (home.xg + away.xg || 1)) * 100}%` }} />
              </div>
            </div>

            {/* IMS / FMS */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center flex flex-col justify-center">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Índice Match (IMS)</span>
              <div className="flex items-center justify-center gap-2 mt-1 font-black text-xl">
                <span className="text-red-400">{home.ims}</span>
                <span className="text-gray-500 text-sm">vs</span>
                <span className="text-blue-400">{away.ims}</span>
              </div>
              <span className="text-[10px] text-gray-400 mt-1">Potencial e impacto</span>
            </div>

            {/* Tiempo Efectivo */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center flex flex-col justify-center">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tiempo Efectivo</span>
              <div className="font-mono font-black text-lg text-emerald-300 mt-1">
                {report.tiempo_efectivo}
              </div>
              <span className="text-[10px] text-gray-400 mt-1">Total: {report.duracion_total}</span>
            </div>
          </div>
        </div>

        {/* Timeline Events Pill */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="font-black text-gray-400 shrink-0 uppercase tracking-wider flex items-center gap-1">
            <Clock size={13} /> Goles & Eventos:
          </span>
          {report.goleadores.map((g, idx) => (
            <span
              key={idx}
              className={`shrink-0 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm ${
                g.equipo === 'home'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              }`}
            >
              ⚽ {g.minuto} {g.jugador} ({g.equipo === 'home' ? home.nombre : away.nombre})
            </span>
          ))}
        </div>
      </div>

      {/* 2. Navigation Sub-Tabs */}
      <SubNavTabs
        tabs={[
          { id: 'score', label: 'SCORE Colectivo', icon: BarChart3 },
          { id: 'tactica', label: 'Bloques y Táctica', icon: Layers },
          { id: 'cobertura', label: 'Cobertura Territorial', icon: Activity },
          { id: 'finalizacion', label: 'Finalización y ABP', icon: Crosshair },
          { id: 'pases', label: 'Red de Pases', icon: Share2 },
          { id: 'jugadores', label: 'Zoom Jugadores', icon: UserCheck },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
        rightSlot={
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md transition-all whitespace-nowrap"
          >
            <Upload size={16} /> Importar PDF / JSON
          </button>
        }
      />

      {/* ======================================================== */}
      {/* TAB 1: SCORE COLECTIVO                                    */}
      {/* ======================================================== */}
      {activeTab === 'score' && (
        <div className="space-y-6">
          {/* Selector de Periodo */}
          <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-700 dark:text-gray-300">Periodo analizado:</span>
              <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl">
                <button
                  onClick={() => setPeriod('total_partido')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    period === 'total_partido'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                  }`}
                >
                  Total Partido
                </button>
                <button
                  onClick={() => setPeriod('primer_tiempo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    period === 'primer_tiempo'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                  }`}
                >
                  1º Tiempo
                </button>
                <button
                  onClick={() => setPeriod('segundo_tiempo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    period === 'segundo_tiempo'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                  }`}
                >
                  2º Tiempo
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-bold">
              <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <span className="w-3 h-3 rounded-full bg-red-500"></span> {home.nombre} (Casa)
              </span>
              <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span> {away.nombre} (Fuera)
              </span>
            </div>
          </div>

          {/* Cards de Métricas Traducidas */}
          {(() => {
            const hStats = home.estadisticas[period];
            const aStats = away.estadisticas[period];

            const categories = [
              {
                title: 'Volumen y Posesión',
                metrics: [
                  { label: 'Posesión de balón', homeVal: `${hStats.posesion_tiempo} (${hStats.posesion_pct}%)`, awayVal: `${aStats.posesion_tiempo} (${aStats.posesion_pct}%)`, homePct: hStats.posesion_pct, awayPct: aStats.posesion_pct },
                  { label: 'Balones jugados', homeVal: `${hStats.balones_jugados_total} (${hStats.balones_jugados_pct}%)`, awayVal: `${aStats.balones_jugados_total} (${aStats.balones_jugados_pct}%)`, homePct: hStats.balones_jugados_pct, awayPct: aStats.balones_jugados_pct },
                ],
              },
              {
                title: 'Calidad de Juego',
                metrics: [
                  { label: 'Pases acertados totales', homeVal: `${hStats.pases_acertados_total}`, awayVal: `${aStats.pases_acertados_total}`, homePct: (hStats.pases_acertados_total / (hStats.pases_acertados_total + aStats.pases_acertados_total || 1)) * 100, awayPct: (aStats.pases_acertados_total / (hStats.pases_acertados_total + aStats.pases_acertados_total || 1)) * 100 },
                  { label: '% Precisión de pases', homeVal: `${hStats.precision_pases_pct}%`, awayVal: `${aStats.precision_pases_pct}%`, homePct: hStats.precision_pases_pct, awayPct: aStats.precision_pases_pct },
                  { label: 'Acciones útiles (eliminan rivales)', homeVal: `${hStats.acciones_utiles_total} (${hStats.acciones_utiles_pct}%)`, awayVal: `${aStats.acciones_utiles_total} (${aStats.acciones_utiles_pct}%)`, homePct: hStats.acciones_utiles_pct * 3, awayPct: aStats.acciones_utiles_pct * 3 },
                ],
              },
              {
                title: 'Posicionamiento y Presión',
                metrics: [
                  { label: 'Altura del bloque / Baricentro', homeVal: `${hStats.baricentro_altura_m} m`, awayVal: `${aStats.baricentro_altura_m} m`, homePct: hStats.baricentro_altura_m, awayPct: aStats.baricentro_altura_m },
                  { label: 'Supremacía territorial (campo rival)', homeVal: `${hStats.supremacia_territorial_tiempo} (${hStats.supremacia_territorial_pct}%)`, awayVal: `${aStats.supremacia_territorial_tiempo} (${aStats.supremacia_territorial_pct}%)`, homePct: hStats.supremacia_territorial_pct, awayPct: aStats.supremacia_territorial_pct },
                  { label: 'Altura de recuperación / Pressing', homeVal: `${hStats.altura_pressing_m} m`, awayVal: `${aStats.altura_pressing_m} m`, homePct: hStats.altura_pressing_m, awayPct: aStats.altura_pressing_m },
                ],
              },
              {
                title: 'Fase Defensiva y Recuperaciones',
                metrics: [
                  { label: '% Recuperaciones efectivas', homeVal: `${hStats.recuperaciones_efectivas_pct}%`, awayVal: `${aStats.recuperaciones_efectivas_pct}%`, homePct: hStats.recuperaciones_efectivas_pct, awayPct: aStats.recuperaciones_efectivas_pct },
                  { label: '% Protección de área', homeVal: `${hStats.proteccion_area_pct}%`, awayVal: `${aStats.proteccion_area_pct}%`, homePct: hStats.proteccion_area_pct, awayPct: aStats.proteccion_area_pct },
                  { label: 'Fueras de juego provocados', homeVal: `${hStats.fueras_juego_provocados}`, awayVal: `${aStats.fueras_juego_provocados}`, homePct: hStats.fueras_juego_provocados * 15, awayPct: aStats.fueras_juego_provocados * 15 },
                  { label: 'Paradas del portero', homeVal: `${hStats.paradas_portero}`, awayVal: `${aStats.paradas_portero}`, homePct: hStats.paradas_portero * 10, awayPct: aStats.paradas_portero * 10 },
                ],
              },
              {
                title: 'Fase Ofensiva y Profundidad',
                metrics: [
                  { label: 'Elaboración desde atrás', homeVal: `${hStats.elaboracion_desde_atras_pct}%`, awayVal: `${aStats.elaboracion_desde_atras_pct}%`, homePct: hStats.elaboracion_desde_atras_pct, awayPct: aStats.elaboracion_desde_atras_pct },
                  { label: 'Salto de línea en largo', homeVal: `${hStats.salto_linea_largo_pct}%`, awayVal: `${aStats.salto_linea_largo_pct}%`, homePct: hStats.salto_linea_largo_pct, awayPct: aStats.salto_linea_largo_pct },
                  { label: 'Pases rasos útiles en campo rival', homeVal: `${hStats.pases_rasos_campo_rival}`, awayVal: `${aStats.pases_rasos_campo_rival}`, homePct: 40, awayPct: 60 },
                  { label: 'Centros completados desde el fondo', homeVal: `${hStats.centros_desde_fondo}`, awayVal: `${aStats.centros_desde_fondo}`, homePct: 70, awayPct: 30 },
                  { label: 'Regates completados', homeVal: `${hStats.regates_utiles}`, awayVal: `${aStats.regates_utiles}`, homePct: 40, awayPct: 60 },
                ],
              },
              {
                title: 'Peligrosidad y Finalización',
                metrics: [
                  { label: 'Balones jugados en área rival', homeVal: `${hStats.balones_en_area_rival}`, awayVal: `${aStats.balones_en_area_rival}`, homePct: (hStats.balones_en_area_rival / (hStats.balones_en_area_rival + aStats.balones_en_area_rival || 1)) * 100, awayPct: (aStats.balones_en_area_rival / (hStats.balones_en_area_rival + aStats.balones_en_area_rival || 1)) * 100 },
                  { label: '% Ataque a portería', homeVal: `${hStats.ataque_porteria_pct}%`, awayVal: `${aStats.ataque_porteria_pct}%`, homePct: hStats.ataque_porteria_pct, awayPct: aStats.ataque_porteria_pct },
                  { label: '% Eficacia ABP ofensivo', homeVal: `${hStats.eficacia_abp_ofensivo_pct}%`, awayVal: `${aStats.eficacia_abp_ofensivo_pct}%`, homePct: hStats.eficacia_abp_ofensivo_pct, awayPct: aStats.eficacia_abp_ofensivo_pct },
                  { label: 'Tiros a puerta / Totales', homeVal: `${hStats.tiros_a_puerta}`, awayVal: `${aStats.tiros_a_puerta}`, homePct: 60, awayPct: 40 },
                  { label: 'Ocasiones de gol generadas', homeVal: `${hStats.ocasiones_gol}`, awayVal: `${aStats.ocasiones_gol}`, homePct: (hStats.ocasiones_gol / (hStats.ocasiones_gol + aStats.ocasiones_gol || 1)) * 100, awayPct: (aStats.ocasiones_gol / (hStats.ocasiones_gol + aStats.ocasiones_gol || 1)) * 100 },
                ],
              },
            ];

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat, i) => (
                  <div key={i} className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="font-extrabold text-sm text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
                      <span className="w-2 h-5 rounded-full bg-indigo-600"></span>
                      {cat.title}
                    </h3>
                    <div className="space-y-4">
                      {cat.metrics.map((m, j) => (
                        <div key={j} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-red-700 dark:text-red-400 font-mono font-black">{m.homeVal}</span>
                            <span className="text-gray-600 dark:text-gray-300 text-[11px] text-center px-1 font-medium">{m.label}</span>
                            <span className="text-blue-700 dark:text-blue-400 font-mono font-black">{m.awayVal}</span>
                          </div>
                          {/* Comparative bar */}
                          <div className="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden flex">
                            <div className="bg-red-500 h-full transition-all" style={{ width: `${Math.min(Math.max(m.homePct, 5), 95)}%` }} />
                            <div className="bg-blue-500 h-full transition-all" style={{ width: `${Math.min(Math.max(m.awayPct, 5), 95)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: BLOQUES Y TÁCTICA (CAMPOGRAMA DE FORMACIONES)      */}
      {/* ======================================================== */}
      {activeTab === 'tactica' && (
        <TacticalFormationPitch homeTeam={home} awayTeam={away} />
      )}

      {/* ======================================================== */}
      {/* TAB 3: COBERTURA TERRITORIAL (HEATMAP 3X3)               */}
      {/* ======================================================== */}
      {activeTab === 'cobertura' && (
        <TerritorialHeatmapPitch homeTeam={home} awayTeam={away} />
      )}

      {/* ======================================================== */}
      {/* TAB 4: FINALIZACIÓN Y ABP (MAPA DE TIROS Y xG)            */}
      {/* ======================================================== */}
      {activeTab === 'finalizacion' && (
        <ShotMapPitch
          homeFinishing={home.finalizacion}
          awayFinishing={away.finalizacion}
          homeTeamName={home.nombre}
          awayTeamName={away.nombre}
        />
      )}

      {/* ======================================================== */}
      {/* TAB 5: RED DE PASES (FLUSSI DI GIOCO + MATRIZ)            */}
      {/* ======================================================== */}
      {activeTab === 'pases' && (
        <div className="space-y-6">
          <PassNetworkPitch
            passingDataHome={home.matriz_pases}
            passingDataAway={away.matriz_pases}
            homeTeamName={home.nombre}
            awayTeamName={away.nombre}
          />

          {/* Matriz Table con vínculos a fichas de jugadores */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                <Share2 size={16} className="text-indigo-600" /> Tabla Matriz de Pases ({currentTeamObj.nombre})
              </h4>
              <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setSelectedTeam('away')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    selectedTeam === 'away' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {away.nombre}
                </button>
                <button
                  onClick={() => setSelectedTeam('home')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    selectedTeam === 'home' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {home.nombre}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-100 dark:border-white/10 rounded-2xl">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 font-extrabold border-b border-gray-200 dark:border-white/10">
                    <th className="p-3 text-left bg-gray-200/80 dark:bg-neutral-700 sticky left-0 z-10">De \ A</th>
                    {currentTeamObj.matriz_pases.jugadores.map((j) => (
                      <th
                        key={j.dorsal}
                        onClick={() => navigateToPlayerCard(j.player_id)}
                        className="p-2 min-w-[42px] border-r border-gray-200 dark:border-white/10 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors group"
                        title="Ver tarjeta de jugador"
                      >
                        <div className="font-black text-indigo-700 dark:text-indigo-400 group-hover:underline">#{j.dorsal}</div>
                        <span className="text-[9px] text-gray-500 dark:text-gray-400 font-normal truncate block max-w-[45px]">
                          {j.nombre.split(' ').pop()}
                        </span>
                      </th>
                    ))}
                    <th className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 font-black">TOTAL</th>
                    <th className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-black">% ACIERTO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {currentTeamObj.matriz_pases.jugadores.map((origin) => {
                    const oDorsal = origin.dorsal;
                    const rowPases = currentTeamObj.matriz_pases.matriz[oDorsal] || {};
                    const totalOrigin = currentTeamObj.matriz_pases.totales_dados[oDorsal] || 0;
                    const pctOrigin = currentTeamObj.matriz_pases.precision_individual_pct[oDorsal] || 0;

                    return (
                      <tr key={oDorsal} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
                        <td
                          onClick={() => navigateToPlayerCard(origin.player_id)}
                          className="p-3 text-left font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-neutral-800 sticky left-0 z-10 border-r border-gray-200 dark:border-white/10 flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors group"
                        >
                          <span className="w-5 h-5 rounded-full bg-gray-700 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                            {oDorsal}
                          </span>
                          <span className="truncate max-w-[130px] group-hover:underline">{origin.nombre}</span>
                          <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 text-indigo-500" />
                        </td>

                        {currentTeamObj.matriz_pases.jugadores.map((dest) => {
                          const dDorsal = dest.dorsal;
                          const count = rowPases[dDorsal];
                          const isSelf = oDorsal === dDorsal;

                          return (
                            <td
                              key={dDorsal}
                              className={`p-2 border-r border-gray-100 dark:border-white/5 font-mono ${
                                isSelf
                                  ? 'bg-gray-100/60 dark:bg-neutral-800/40 text-gray-300 dark:text-gray-600'
                                  : count > 5
                                  ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 font-black text-sm'
                                  : count > 0
                                  ? 'text-gray-800 dark:text-gray-200 font-bold'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            >
                              {isSelf ? '-' : count || '-'}
                            </td>
                          );
                        })}

                        <td className="p-2 font-mono font-black text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20">
                          {totalOrigin}
                        </td>
                        <td className="p-2 font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                          {pctOrigin}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: ZOOM JUGADORES                                     */}
      {/* ======================================================== */}
      {activeTab === 'jugadores' && (
        <div className="space-y-6">
          {/* Selector de Equipo y Jugadores */}
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-100 dark:border-white/10">
              <h3 className="font-extrabold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <UserCheck className="text-indigo-600 dark:text-indigo-400" size={20} /> Rendimiento Individual (Zoom sui Giocatori)
              </h3>
              
              <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl">
                <button
                  onClick={() => { setSelectedTeam('away'); setSelectedPlayerDorsal(8); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedTeam === 'away' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {away.nombre}
                </button>
                <button
                  onClick={() => { setSelectedTeam('home'); setSelectedPlayerDorsal(8); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedTeam === 'home' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {home.nombre}
                </button>
              </div>
            </div>

            {/* Player Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {currentTeamObj.jugadores_stats.map((p) => (
                <button
                  key={p.dorsal}
                  onClick={() => setSelectedPlayerDorsal(p.dorsal)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold transition-all shrink-0 ${
                    selectedPlayerDorsal === p.dorsal
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                      : 'bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-100'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      selectedPlayerDorsal === p.dorsal
                        ? 'bg-white text-indigo-700'
                        : 'bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {p.dorsal}
                  </span>
                  <span>{p.nombre}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Player Card Details */}
          {selectedPlayerStats && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Profile Card with Direct Link */}
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-6 border border-indigo-500/30">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-indigo-200">
                      {selectedPlayerStats.posicion} • Nac. {selectedPlayerStats.anio_nacimiento}
                    </span>
                    <span className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-xl text-white">
                      {selectedPlayerStats.dorsal}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-2xl text-white mt-4">{selectedPlayerStats.nombre}</h3>
                  <span className="text-xs text-indigo-300 font-medium">Minutos jugados: {selectedPlayerStats.minutos}</span>
                </div>

                {/* Touch Zone Breakdown */}
                {selectedPlayerStats.distribucion_1t && (
                  <div className="bg-white/10 p-4 rounded-2xl space-y-2 text-xs">
                    <span className="font-bold text-gray-300 uppercase tracking-wider block text-[10px]">
                      Presencia Territorial en 1T:
                    </span>
                    <div className="grid grid-cols-3 gap-1 text-center font-bold">
                      <div className="bg-black/20 p-2 rounded-lg">Def: {selectedPlayerStats.distribucion_1t.defensa_pct}%</div>
                      <div className="bg-black/20 p-2 rounded-lg">Med: {selectedPlayerStats.distribucion_1t.medio_pct}%</div>
                      <div className="bg-black/20 p-2 rounded-lg">Atq: {selectedPlayerStats.distribucion_1t.ataque_pct}%</div>
                    </div>
                  </div>
                )}

                {/* Direct Action Button to Player Card */}
                <button
                  onClick={() => navigateToPlayerCard(selectedPlayerStats.player_id)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs py-3 px-4 rounded-xl shadow-lg transition-all"
                >
                  <User size={16} />
                  <span>Ver Ficha de Jugador en Datos</span>
                  <ExternalLink size={15} />
                </button>
              </div>

              {/* Stats Grid */}
              <div className="lg:col-span-2 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
                <h4 className="font-extrabold text-gray-900 dark:text-white text-sm uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" /> Métricas Específicas del Partido
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Balones Jugados</span>
                    <span className="font-mono font-black text-gray-900 dark:text-white text-xl">
                      {selectedPlayerStats.balones_jugados}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Pases Acertados</span>
                    <span className="font-mono font-black text-gray-900 dark:text-white text-xl">
                      {selectedPlayerStats.pases_acertados}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Acciones Útiles</span>
                    <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-xl">
                      {selectedPlayerStats.acciones_utiles}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Recuperaciones</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xl">
                      {selectedPlayerStats.recuperaciones_efectivas}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Intercepciones</span>
                    <span className="font-mono font-black text-gray-900 dark:text-white text-xl">
                      {selectedPlayerStats.intercepciones}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Regates Completados</span>
                    <span className="font-mono font-black text-gray-900 dark:text-white text-xl">
                      {selectedPlayerStats.regates_utiles}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Pases Largos Útiles</span>
                    <span className="font-mono font-black text-gray-900 dark:text-white text-xl">
                      {selectedPlayerStats.pases_largos_utiles}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Asistencias / Claves</span>
                    <span className="font-mono font-black text-gray-900 dark:text-white text-xl">
                      {selectedPlayerStats.asistencias_pases_clave}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Tiros a Puerta</span>
                    <span className="font-mono font-black text-red-600 dark:text-red-400 text-xl">
                      {selectedPlayerStats.tiros_a_puerta}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Panini Import Modal */}
      <PaniniImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentMatchId={matchId}
        onImportSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />

    </div>
  );
}
