import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, User, ExternalLink, ArrowRight, ArrowLeft, Filter, Smartphone, Monitor } from 'lucide-react';
import type { PaniniTeamData, PaniniPassingNode } from '../../../types/paniniReport';

interface Props {
  homeTeam: PaniniTeamData;
  awayTeam: PaniniTeamData;
}

/** Coordenadas espaciales exactas calibradas con las líneas del campo del informe oficial Panini Digital (Págs. 10 y 11) */
const DEFAULT_COORDS_HOME: Record<number, { x: number; y: number }> = {
  35: { x: 5.0,  y: 50.0 }, // Offredi (Portero centrado en área pequeña izq)
  4:  { x: 32.5, y: 29.0 }, // Nava (Central Dcho - Fuera de área izq X < 50%)
  24: { x: 31.5, y: 69.0 }, // Piacentini (Central Izq - Fuera de área izq X < 50%)
  8:  { x: 48.0, y: 52.0 }, // Serena (Mediocentro - Borde izq círculo central X < 50%)
  30: { x: 58.0, y: 16.0 }, // Caccia (Carrilero Izq - Campo Derecho X > 50%)
  25: { x: 58.0, y: 83.0 }, // Martinelli (Lateral Dcho - Campo Derecho X > 50%)
  21: { x: 61.0, y: 28.5 }, // Danieli (Centrocampista - Campo Derecho X > 50%)
  20: { x: 66.5, y: 56.5 }, // Strechie (Centrocampista - Campo Derecho X > 50%)
  28: { x: 64.0, y: 68.5 }, // Rinaldi (Centrocampista - Campo Derecho X > 50%)
  7:  { x: 72.0, y: 58.0 }, // Ravasi (Delantero - Campo Derecho X > 50%)
  14: { x: 72.5, y: 43.5 }, // D'Amuri (Delantero - Campo Derecho X > 50%)
};

const DEFAULT_COORDS_AWAY: Record<number, { x: number; y: number }> = {
  1:  { x: 95.0, y: 50.0 }, // Pittarella (Portero centrado en área pequeña der)
  2:  { x: 52.5, y: 16.5 }, // Cappelletti (Banda sup ligeramente a la dcha de la línea central)
  3:  { x: 52.5, y: 82.0 }, // Borsani (Defensa banda inf)
  4:  { x: 77.0, y: 34.0 }, // Zukic (Defensa claramente libre fuera del área de penalti)
  5:  { x: 78.0, y: 77.0 }, // Vladimirov (Defensa claramente libre fuera del área de penalti)
  6:  { x: 69.5, y: 57.5 }, // Cissé (Centrocampista)
  7:  { x: 67.5, y: 28.5 }, // Sala (Interior/Medio sup)
  8:  { x: 57.5, y: 62.0 }, // Pandolfi (Pivote cuadrante inf-der círculo central)
  9:  { x: 43.5, y: 41.0 }, // Asanji (Delantero borde sup-izq círculo - Campo Izq X < 50%)
  10: { x: 47.5, y: 68.5 }, // Vos (Medio inf izq fuera círculo - Campo Izq X < 50%)
  11: { x: 41.5, y: 52.5 }, // Ossola (Extremo vértice izq círculo - Campo Izq X < 50%)
};

function getPlayerCoords(p: PaniniPassingNode, isHome: boolean) {
  const map = isHome ? DEFAULT_COORDS_HOME : DEFAULT_COORDS_AWAY;
  const def = map[p.dorsal];
  return {
    x: def?.x ?? p.x ?? 50,
    y: def?.y ?? p.y ?? 50,
  };
}

export default function PaniniPassingNetworkView({ homeTeam, awayTeam }: Props) {
  const navigate = useNavigate();
  const [selectedTeamKey, setSelectedTeamKey] = useState<'home' | 'away'>('home');
  const [activePlayerDorsal, setActivePlayerDorsal] = useState<number | null>(null);
  const [minPasses, setMinPasses] = useState<number>(3); // Default 3 = Conexiones Preferenciales
  const [pitchOrientation, setPitchOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  const isHome = selectedTeamKey === 'home';
  const team = isHome ? homeTeam : awayTeam;
  const passingData = team.matriz_pases;
  const players = passingData.jugadores;
  const matrix = passingData.matriz || {};

  const activePlayer = players.find((p) => p.dorsal === activePlayerDorsal);

  // Generate weighted links from matrix based on minPasses threshold
  const links: {
    from: PaniniPassingNode;
    to: PaniniPassingNode;
    count: number;
    hasReverse: boolean;
    isReverse: boolean;
  }[] = [];

  players.forEach((pFrom) => {
    const row = matrix[pFrom.dorsal] || {};
    players.forEach((pTo) => {
      if (pFrom.dorsal !== pTo.dorsal) {
        const count = row[pTo.dorsal] || 0;
        if (count >= minPasses) {
          const reverseCount = (matrix[pTo.dorsal] || {})[pFrom.dorsal] || 0;
          const hasReverse = reverseCount >= minPasses;
          const isReverse = pFrom.dorsal > pTo.dorsal;
          links.push({ from: pFrom, to: pTo, count, hasReverse, isReverse });
        }
      }
    });
  });

  // Calculate SVG trimmed line coordinates (Supports Vertical 0..62x100 or Horizontal 0..100x62)
  const computeArrowCoords = (
    from: PaniniPassingNode,
    to: PaniniPassingNode,
    hasReverse: boolean,
    isReverse: boolean
  ) => {
    const fromC = getPlayerCoords(from, isHome);
    const toC = getPlayerCoords(to, isHome);

    let fromX: number, fromY: number, toX: number, toY: number;
    const radius = 2.4;

    if (pitchOrientation === 'vertical') {
      // Vertical Pitch: ViewBox 0 0 62 100
      fromX = (fromC.y / 100) * 62;
      fromY = 100 - fromC.x;
      toX = (toC.y / 100) * 62;
      toY = 100 - toC.x;
    } else {
      // Horizontal Pitch: ViewBox 0 0 100 62
      fromX = fromC.x;
      fromY = (fromC.y / 100) * 62;
      toX = toC.x;
      toY = (toC.y / 100) * 62;
    }

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= radius * 2) {
      return { x1: fromX, y1: fromY, x2: toX, y2: toY };
    }

    const ux = dx / dist;
    const uy = dy / dist;

    // Perpendicular vector for parallel offset when bi-directional link exists
    const px = -uy;
    const py = ux;
    const offset = hasReverse ? (isReverse ? -0.55 : 0.55) : 0;

    const x1 = fromX + ux * radius + px * offset;
    const y1 = fromY + uy * radius + py * offset;

    // End point trimmed so arrowhead marker tip lands precisely on circle boundary
    const x2 = toX - ux * (radius + 0.45) + px * offset;
    const y2 = toY - uy * (radius + 0.45) + py * offset;

    return { x1, y1, x2, y2 };
  };

  // Fine stroke width scaling
  const getStrokeWidth = (count: number) => {
    if (count <= 2) return 0.3;
    if (count === 3) return 0.55;
    if (count === 4) return 0.9;
    if (count === 5) return 1.3;
    if (count === 6) return 1.65;
    return 2.05; // 7+ passes
  };

  const navigateToPlayerCard = (playerId?: string) => {
    if (playerId) {
      navigate(`/players/${playerId}?view=ficha`);
    } else {
      navigate(`/players?view=ficha`);
    }
  };

  // Encontrar máximos para colorear
  const maxGivenDorsal = Object.entries(passingData.totales_dados).sort((a, b) => b[1] - a[1])[0]?.[0];
  const maxReceivedDorsal = Object.entries(passingData.totales_recibidos).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="space-y-6 animate-fade-in text-gray-800 dark:text-gray-100">
      
      {/* 1. Selector de Equipo y Controles Superiores */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
        <div>
          <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Share2 className="text-indigo-600 dark:text-indigo-400" size={18} />
            Flujo de Pases y Asociaciones (Flussi di Gioco)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Campograma oficial con líneas tácticas reglamentarias y posicionamiento exacto sincronizado con el informe Panini Digital.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Orientación Campo */}
          <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-2xl">
            <button
              onClick={() => setPitchOrientation('horizontal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                pitchOrientation === 'horizontal'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
              title="Orientación Horizontal (Láminas 10 y 11)"
            >
              <Monitor size={13} />
              <span>Horizontal</span>
            </button>
            <button
              onClick={() => setPitchOrientation('vertical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                pitchOrientation === 'vertical'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
              title="Orientación Vertical"
            >
              <Smartphone size={13} />
              <span>Vertical</span>
            </button>
          </div>

          {/* Toggle Equipo */}
          <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-2xl">
            <button
              onClick={() => { setSelectedTeamKey('home'); setActivePlayerDorsal(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedTeamKey === 'home'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
              {homeTeam.nombre} ({homeTeam.matriz_pases.total_equipo_pases} pases - {homeTeam.matriz_pases.precision_equipo_pct}%)
            </button>
            <button
              onClick={() => { setSelectedTeamKey('away'); setActivePlayerDorsal(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedTeamKey === 'away'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-300" />
              {awayTeam.nombre} ({awayTeam.matriz_pases.total_equipo_pases} pases - {awayTeam.matriz_pases.precision_equipo_pct}%)
            </button>
          </div>
        </div>
      </div>

      {/* 2. Grid Principal: Campograma Ampliado a la Izquierda + Tabla Matriz y Detalle al lado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ======================================================== */}
        {/* COLUMNA IZQUIERDA: CAMPOGRAMA DE RED DE PASES AMPLIADO   */}
        {/* ======================================================== */}
        <div className={`${pitchOrientation === 'vertical' ? 'lg:col-span-4 xl:col-span-4 max-w-[340px] w-full' : 'lg:col-span-5 xl:col-span-5 w-full'} bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-gray-100 dark:border-white/10">
            <h4 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
              <Share2 size={13} className="text-indigo-600" /> Red ({team.nombre})
            </h4>

            {/* Filtro de Umbral de Pases */}
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-neutral-800 p-0.5 rounded-xl text-[10px] font-bold">
              {[
                { label: '≥3 (Todas)', val: 3 },
                { label: '≥4', val: 4 },
                { label: '≥5 (Preferenciales)', val: 5 },
                { label: '≥6 (Principales)', val: 6 },
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => setMinPasses(item.val)}
                  className={`px-1.5 py-0.5 rounded-md transition-all ${
                    minPasses === item.val
                      ? 'bg-indigo-600 text-white shadow-xs font-black'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Leyenda de Grosores y Colores */}
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 bg-gray-50 dark:bg-neutral-800/60 px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-white/5">
            <span className="text-gray-400 font-semibold">Pases:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-0.5 bg-gray-900 dark:bg-gray-200 inline-block" /> 3-4 pases</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-1 bg-red-600 rounded-full inline-block" /> ≥5 pases (Alta frecuencia)</span>
            </div>
          </div>

          {/* Pitch Container Reglamentario Panini */}
          <div className={`relative w-full ${pitchOrientation === 'vertical' ? 'aspect-[62/100]' : 'aspect-[100/62]'} rounded-2xl overflow-hidden border-2 border-[#8bbd85] dark:border-white/20 bg-[#a2d29e] select-none shadow-inner p-1`}>
            
            {/* SVG Pitch Markings con proporciones y líneas reglamentarias */}
            {pitchOrientation === 'vertical' ? (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 62 100" preserveAspectRatio="none">
                {/* Bordes exteriores */}
                <rect x="2" y="2" width="58" height="96" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                {/* Línea central */}
                <line x1="2" y1="50" x2="60" y2="50" stroke="#ffffff" strokeWidth="0.75" />
                {/* Círculo central y punto */}
                <circle cx="31" cy="50" r="9.5" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <circle cx="31" cy="50" r="0.7" fill="#ffffff" />

                {/* Área Superior (Grande y Pequeña + Punto + Media Luna) */}
                <rect x="12" y="2" width="38" height="12" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <rect x="21" y="2" width="20" height="4.5" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <circle cx="31" cy="9" r="0.7" fill="#ffffff" />
                <path d="M 24 14 A 9.5 9.5 0 0 0 38 14" fill="none" stroke="#ffffff" strokeWidth="0.75" />

                {/* Área Inferior (Grande y Pequeña + Punto + Media Luna) */}
                <rect x="12" y="86" width="38" height="12" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <rect x="21" y="93.5" width="20" height="4.5" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <circle cx="31" cy="91" r="0.7" fill="#ffffff" />
                <path d="M 24 86 A 9.5 9.5 0 0 1 38 86" fill="none" stroke="#ffffff" strokeWidth="0.75" />

                {/* Córners */}
                <path d="M 4.5 2 A 2.5 2.5 0 0 0 2 4.5" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <path d="M 57.5 2 A 2.5 2.5 0 0 1 60 4.5" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <path d="M 2 95.5 A 2.5 2.5 0 0 0 4.5 98" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <path d="M 60 95.5 A 2.5 2.5 0 0 1 57.5 98" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <circle cx="2" cy="2" r="0.8" fill="#ffffff" />
                <circle cx="60" cy="2" r="0.8" fill="#ffffff" />
                <circle cx="2" cy="98" r="0.8" fill="#ffffff" />
                <circle cx="60" cy="98" r="0.8" fill="#ffffff" />
              </svg>
            ) : (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 62" preserveAspectRatio="none">
                {/* Bordes exteriores */}
                <rect x="2" y="2" width="96" height="58" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                {/* Línea central */}
                <line x1="50" y1="2" x2="50" y2="60" stroke="#ffffff" strokeWidth="0.75" />
                {/* Círculo central y punto */}
                <circle cx="50" cy="31" r="9.5" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <circle cx="50" cy="31" r="0.7" fill="#ffffff" />

                {/* Área Izquierda (Grande, Pequeña, Punto, Media Luna) */}
                <rect x="2" y="12" width="12" height="38" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <rect x="2" y="21" width="4.5" height="20" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <circle cx="9" cy="31" r="0.7" fill="#ffffff" />
                <path d="M 14 24 A 9.5 9.5 0 0 1 14 38" fill="none" stroke="#ffffff" strokeWidth="0.75" />

                {/* Área Derecha (Grande, Pequeña, Punto, Media Luna) */}
                <rect x="86" y="12" width="12" height="38" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <rect x="93.5" y="21" width="4.5" height="20" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <circle cx="91" cy="31" r="0.7" fill="#ffffff" />
                <path d="M 86 24 A 9.5 9.5 0 0 0 86 38" fill="none" stroke="#ffffff" strokeWidth="0.75" />

                {/* Córners */}
                <path d="M 2 4.5 A 2.5 2.5 0 0 0 4.5 2" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <path d="M 95.5 2 A 2.5 2.5 0 0 0 98 4.5" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <path d="M 2 57.5 A 2.5 2.5 0 0 1 4.5 60" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <path d="M 95.5 60 A 2.5 2.5 0 0 1 98 57.5" fill="none" stroke="#ffffff" strokeWidth="0.75" />
                <circle cx="2" cy="2" r="0.8" fill="#ffffff" />
                <circle cx="98" cy="2" r="0.8" fill="#ffffff" />
                <circle cx="2" cy="60" r="0.8" fill="#ffffff" />
                <circle cx="98" cy="60" r="0.8" fill="#ffffff" />
              </svg>
            )}

            {/* Trademark */}
            <div className="absolute top-1.5 right-2.5 text-[9px] font-bold text-black pointer-events-none z-10 opacity-70">
              ©Panini Digital
            </div>

            {/* Crest */}
            <div className={`absolute ${isHome ? (pitchOrientation === 'vertical' ? 'bottom-2 left-2' : 'top-2 left-2') : (pitchOrientation === 'vertical' ? 'top-2 right-2' : 'bottom-2 right-2')} w-8 h-8 bg-white rounded-lg border border-gray-300 p-0.5 shadow-md flex items-center justify-center pointer-events-none z-10`}>
              <div className={`w-full h-full ${isHome ? 'bg-red-600' : 'bg-black'} text-white font-black text-[7px] flex items-center justify-center rounded`}>
                {isHome ? 'VV' : 'ACM'}
              </div>
            </div>

            {/* Directed Passing Vectors / Links */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
              viewBox={pitchOrientation === 'vertical' ? '0 0 62 100' : '0 0 100 62'}
              preserveAspectRatio="none"
            >
              <defs>
                {/* Puntas de flecha estándar (Negro/Gris) */}
                <marker
                  id="arrow-std"
                  viewBox="0 0 10 10"
                  refX="7.5"
                  refY="5"
                  markerWidth="2.2"
                  markerHeight="2.2"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 2 L 7.5 5 L 0 8 L 1.5 5 z" fill="#111827" />
                </marker>
                {/* Puntas de flecha para pases de ALTA FRECUENCIA (Rojo) */}
                <marker
                  id="arrow-high"
                  viewBox="0 0 10 10"
                  refX="7.5"
                  refY="5"
                  markerWidth="2.8"
                  markerHeight="2.8"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.8 L 8 5 L 0 8.2 L 2 5 z" fill="#dc2626" />
                </marker>
                {/* Puntas de flecha activas al hacer clic (Dorado) */}
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="7.5"
                  refY="5"
                  markerWidth="3.0"
                  markerHeight="3.0"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8.5 5 L 0 8.5 L 2 5 z" fill="#f59e0b" />
                </marker>
              </defs>

              {links.map((link, idx) => {
                const { x1, y1, x2, y2 } = computeArrowCoords(
                  link.from,
                  link.to,
                  link.hasReverse,
                  link.isReverse
                );

                const isFromActive = activePlayerDorsal === link.from.dorsal;
                const isToActive = activePlayerDorsal === link.to.dorsal;
                const isHighlighted = isFromActive || isToActive;
                const isDimmed = activePlayerDorsal !== null && !isHighlighted;
                const isHighFreq = link.count >= 5;

                const strokeWidth = getStrokeWidth(link.count);
                const strokeColor = isHighlighted
                  ? '#f59e0b'
                  : isHighFreq
                  ? '#dc2626'
                  : '#111827';

                const markerId = isHighlighted
                  ? 'url(#arrow-active)'
                  : isHighFreq
                  ? 'url(#arrow-high)'
                  : 'url(#arrow-std)';

                return (
                  <line
                    key={idx}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    markerEnd={markerId}
                    opacity={isDimmed ? 0.08 : (isHighFreq ? 0.95 : 0.82)}
                    className="transition-all duration-200"
                  />
                );
              })}
            </svg>

            {/* Players (Nodes) Compactos */}
            {players.slice(0, 11).map((p) => {
              const coords = getPlayerCoords(p, isHome);
              const xPos = pitchOrientation === 'vertical' ? coords.y : coords.x;
              const yPos = pitchOrientation === 'vertical' ? (100 - coords.x) : coords.y;
              const isGK = isHome ? p.dorsal === 35 : p.dorsal === 1;
              const isActive = activePlayerDorsal === p.dorsal;

              return (
                <div
                  key={p.dorsal}
                  onClick={() => setActivePlayerDorsal(isActive ? null : p.dorsal)}
                  style={{
                    left: `${xPos}%`,
                    top: `${yPos}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute z-30 flex flex-col items-center cursor-pointer transition-all duration-200 ${
                    isActive ? 'scale-120 z-40' : 'hover:scale-110'
                  }`}
                >
                  {/* Jugador con Dorsal Limpio (SIN #) */}
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-black text-xs font-mono shadow-md transition-all ${
                      isGK
                        ? 'bg-[#9da3a8] text-black border-2 border-black'
                        : isHome
                        ? 'bg-red-600 text-white border-2 border-white'
                        : 'bg-[#001f7a] text-white border-2 border-white'
                    } ${isActive ? 'ring-3 ring-yellow-400' : ''}`}
                  >
                    {p.dorsal}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] font-bold text-center text-gray-400">
            {pitchOrientation === 'vertical'
              ? '⬆ Ataque hacia arriba'
              : (isHome ? 'Ataque hacia la derecha ➔' : '⬅ Ataque hacia la izquierda')}
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLUMNA DERECHA: TABLA MATRIZ CRUZADA Y PANEL JUGADOR   */}
        {/* ======================================================== */}
        <div className={`${pitchOrientation === 'vertical' ? 'lg:col-span-8 xl:col-span-8' : 'lg:col-span-7 xl:col-span-7'} space-y-6 w-full`}>
          
          {/* Panel lateral de análisis individual del jugador (si hay seleccionado) */}
          {activePlayer && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl border border-indigo-500/30 space-y-4 animate-scale-in">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-1 bg-white/10 text-indigo-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Conexiones de Pases
                  </span>
                  <h4 className="font-extrabold text-xl text-white mt-1">
                    {activePlayer.nombre}
                  </h4>
                  <span className="text-xs text-gray-400 font-medium">Dorsal {activePlayer.dorsal}</span>
                </div>
                {/* Dorsal Grande Estilo Camiseta (Sin #) */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-3xl font-mono shadow-lg border-2 border-white/20 ${isHome ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                  {activePlayer.dorsal}
                </div>
              </div>

              {/* Individual Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-white/5 p-3 rounded-2xl border border-white/10">
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Pases Entregados:</span>
                  <span className="font-mono font-black text-lg text-amber-300">
                    {passingData.totales_dados[activePlayer.dorsal] || 0}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Precisión:</span>
                  <span className="font-mono font-black text-lg text-emerald-300">
                    {passingData.precision_individual_pct[activePlayer.dorsal] || 0}%
                  </span>
                </div>
              </div>

              {/* Connections breakdown */}
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 text-xs">
                {players
                  .filter((to) => to.dorsal !== activePlayer.dorsal)
                  .map((to) => {
                    const given = (matrix[activePlayer.dorsal] || {})[to.dorsal] || 0;
                    const received = (matrix[to.dorsal] || {})[activePlayer.dorsal] || 0;
                    if (given === 0 && received === 0) return null;

                    return (
                      <div key={to.dorsal} className="flex items-center justify-between bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                        <span className="font-bold truncate max-w-[150px] flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-white/10 text-white font-mono font-black text-[10px] flex items-center justify-center">
                            {to.dorsal}
                          </span>
                          {to.nombre.split(' ').pop()}
                        </span>
                        <div className="flex items-center gap-3 font-mono font-bold">
                          <span className="text-amber-300 flex items-center gap-0.5 text-[11px]" title="Pases dados">
                            <ArrowRight size={11} /> {given}
                          </span>
                          <span className="text-emerald-300 flex items-center gap-0.5 text-[11px]" title="Pases recibidos">
                            <ArrowLeft size={11} /> {received}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <button
                onClick={() => navigateToPlayerCard(activePlayer.player_id)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <User size={14} />
                <span>Ver Tarjeta de Jugador</span>
                <ExternalLink size={13} />
              </button>
            </div>
          )}

          {/* Tabla Matriz Cruzada de Pases (DA \ A) */}
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-white/10">
              <h4 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                <Share2 size={15} className="text-indigo-600" /> Matriz Cruzada de Pases (DA \ A)
              </h4>
              <div className="flex items-center gap-3 text-[11px] font-bold text-gray-400">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-100 dark:bg-red-950/60 border border-red-300 rounded-xs inline-block" /> High (≥3 pases)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-600 rounded-xs inline-block text-white text-[8px] flex items-center justify-center font-bold">●</span> Max pasador</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 dark:border-white/10 rounded-2xl">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 font-extrabold border-b border-gray-200 dark:border-white/10">
                    <th className="p-2.5 text-left bg-gray-200/90 dark:bg-neutral-700 sticky left-0 z-10 min-w-[120px]">
                      DE \ A
                    </th>
                    {players.map((j) => (
                      <th
                        key={j.dorsal}
                        onClick={() => setActivePlayerDorsal(j.dorsal)}
                        className="p-1.5 min-w-[38px] border-r border-gray-200 dark:border-white/10 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                      >
                        {/* Dorsales sin # y más grandes */}
                        <div className="font-black text-sm font-mono text-gray-900 dark:text-white bg-gray-200/60 dark:bg-neutral-700/80 py-0.5 px-1 rounded-md border border-gray-300/60 dark:border-white/10">
                          {j.dorsal}
                        </div>
                        <span className="text-[9px] text-gray-500 font-normal truncate block max-w-[42px] mt-0.5">
                          {j.nombre.split(' ').pop()}
                        </span>
                      </th>
                    ))}
                    <th className="p-2 bg-gray-200/90 dark:bg-neutral-700 font-black text-gray-900 dark:text-white">TOTAL</th>
                    <th className="p-2 bg-gray-200/90 dark:bg-neutral-700 font-black text-emerald-700 dark:text-emerald-400">% ACIERTO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {players.map((origin) => {
                    const oDorsal = origin.dorsal;
                    const rowPases = matrix[oDorsal] || {};
                    const totalOrigin = passingData.totales_dados[oDorsal] || 0;
                    const pctOrigin = passingData.precision_individual_pct[oDorsal] || 0;
                    const isMaxPasser = String(oDorsal) === String(maxGivenDorsal);

                    return (
                      <tr key={oDorsal} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
                        <td
                          onClick={() => setActivePlayerDorsal(oDorsal)}
                          className="p-2 text-left font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-neutral-800 sticky left-0 z-10 border-r border-gray-200 dark:border-white/10 flex items-center gap-2 cursor-pointer hover:text-indigo-600"
                        >
                          {/* Dorsal sin # */}
                          <span className="w-6 h-6 rounded-lg bg-gray-900 text-white font-black text-xs font-mono flex items-center justify-center shrink-0 shadow-xs border border-gray-700">
                            {oDorsal}
                          </span>
                          <span className="truncate max-w-[110px] text-xs">{origin.nombre}</span>
                        </td>

                        {players.map((dest) => {
                          const dDorsal = dest.dorsal;
                          const count = rowPases[dDorsal];
                          const isSelf = oDorsal === dDorsal;

                          let cellBg = '';
                          if (count >= 5) cellBg = 'bg-red-200 dark:bg-red-950/80 font-black text-red-900 dark:text-red-200';
                          else if (count >= 3) cellBg = 'bg-red-100/70 dark:bg-red-950/40 font-bold text-red-800 dark:text-red-300';
                          else if (count > 0) cellBg = 'font-medium text-gray-800 dark:text-gray-200';

                          return (
                            <td
                              key={dDorsal}
                              className={`p-1.5 border-r border-gray-100 dark:border-white/5 font-mono text-center ${
                                isSelf
                                  ? 'bg-gray-100 dark:bg-neutral-800/40 text-gray-300 dark:text-gray-600'
                                  : cellBg || 'text-gray-300 dark:text-gray-600'
                              }`}
                            >
                              {isSelf ? '-' : count || '-'}
                            </td>
                          );
                        })}

                        <td className={`p-1.5 font-mono font-black ${
                          isMaxPasser
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'text-gray-900 dark:text-white bg-gray-50 dark:bg-neutral-800'
                        }`}>
                          {totalOrigin}
                        </td>

                        <td className="p-1.5 font-mono font-black text-emerald-700 dark:text-emerald-400 bg-gray-50 dark:bg-neutral-800">
                          {pctOrigin}%
                        </td>
                      </tr>
                    );
                  })}

                  {/* Fila de Totales Recibidos */}
                  <tr className="bg-gray-100 dark:bg-neutral-800 font-extrabold border-t-2 border-gray-300 dark:border-white/20">
                    <td className="p-2 text-left font-black text-gray-900 dark:text-white bg-gray-200/90 dark:bg-neutral-700 sticky left-0 z-10 border-r border-gray-200 dark:border-white/10">
                      TOTALES (A)
                    </td>
                    {players.map((dest) => {
                      const dDorsal = dest.dorsal;
                      const totalRec = passingData.totales_recibidos[dDorsal] || 0;
                      const isMaxReceiver = String(dDorsal) === String(maxReceivedDorsal);

                      return (
                        <td
                          key={dDorsal}
                          className={`p-1.5 font-mono font-black border-r border-gray-200 dark:border-white/10 ${
                            isMaxReceiver
                              ? 'bg-red-600 text-white'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {totalRec}
                        </td>
                      );
                    })}
                    <td className="p-1.5 font-mono font-black text-sm text-gray-900 dark:text-white bg-gray-200/90 dark:bg-neutral-700">
                      {passingData.total_equipo_pases}
                    </td>
                    <td className="p-1.5 font-mono font-black text-sm text-emerald-700 dark:text-emerald-400 bg-gray-200/90 dark:bg-neutral-700">
                      {passingData.precision_equipo_pct}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
