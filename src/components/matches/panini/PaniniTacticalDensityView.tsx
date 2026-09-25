import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ExternalLink, Clock } from 'lucide-react';
import type { PaniniTeamData, PaniniPlayerLineup } from '../../../types/paniniReport';

interface Props {
  homeTeam: PaniniTeamData;
  awayTeam: PaniniTeamData;
}

interface PlayerPin {
  dorsal: number;
  name: string;
  role: 'P' | 'D' | 'C' | 'A';
  x: number;
  y: number;
  badgePos: 'above' | 'below';
}

// Configuración 1º Tiempo Villa Valle (Ataca hacia la derecha)
const VILLA_VALLE_1T_PLAYERS: PlayerPin[] = [
  { dorsal: 35, name: 'Offredi', role: 'P', x: 15.0, y: 55.0, badgePos: 'below' },
  { dorsal: 4,  name: 'Nava', role: 'D', x: 39.5, y: 36.5, badgePos: 'above' },
  { dorsal: 24, name: 'Piacentini', role: 'D', x: 39.5, y: 62.0, badgePos: 'below' },
  { dorsal: 25, name: 'Martinelli', role: 'D', x: 53.0, y: 79.5, badgePos: 'below' },
  { dorsal: 30, name: 'Caccia', role: 'D', x: 54.5, y: 31.0, badgePos: 'above' },
  { dorsal: 8,  name: 'Serena', role: 'C', x: 49.5, y: 49.0, badgePos: 'above' },
  { dorsal: 28, name: 'Rinaldi', role: 'C', x: 51.0, y: 64.0, badgePos: 'below' },
  { dorsal: 21, name: 'Danieli', role: 'C', x: 62.0, y: 35.5, badgePos: 'above' },
  { dorsal: 20, name: 'Strechie', role: 'C', x: 64.5, y: 77.0, badgePos: 'below' },
  { dorsal: 14, name: "D'Amuri", role: 'A', x: 63.5, y: 51.5, badgePos: 'above' },
  { dorsal: 7,  name: 'Ravasi', role: 'A', x: 65.5, y: 68.5, badgePos: 'above' },
];

// Configuración 2º Tiempo Villa Valle
const VILLA_VALLE_2T_PLAYERS: PlayerPin[] = [
  { dorsal: 35, name: 'Offredi', role: 'P', x: 15.0, y: 54.0, badgePos: 'below' },
  { dorsal: 4,  name: 'Nava', role: 'D', x: 44.0, y: 32.0, badgePos: 'above' },
  { dorsal: 24, name: 'Piacentini', role: 'D', x: 41.0, y: 60.0, badgePos: 'below' },
  { dorsal: 25, name: 'Martinelli', role: 'D', x: 55.0, y: 76.0, badgePos: 'below' },
  { dorsal: 3,  name: 'Zambelli', role: 'D', x: 52.0, y: 28.0, badgePos: 'above' },
  { dorsal: 8,  name: 'Serena', role: 'C', x: 52.0, y: 48.0, badgePos: 'above' },
  { dorsal: 28, name: 'Rinaldi', role: 'C', x: 56.0, y: 66.0, badgePos: 'below' },
  { dorsal: 27, name: 'Benzoni', role: 'C', x: 65.0, y: 38.0, badgePos: 'above' },
  { dorsal: 19, name: 'Nikolli', role: 'C', x: 63.0, y: 74.0, badgePos: 'below' },
  { dorsal: 11, name: 'Siani', role: 'A', x: 68.0, y: 48.0, badgePos: 'above' },
  { dorsal: 7,  name: 'Ravasi', role: 'A', x: 66.0, y: 62.0, badgePos: 'above' },
];

// Configuración 1º Tiempo Milan Futuro (Ataca hacia la izquierda)
const MILAN_FUTURO_1T_PLAYERS: PlayerPin[] = [
  { dorsal: 1,  name: 'Pittarella', role: 'P', x: 77.0, y: 46.0, badgePos: 'above' },
  { dorsal: 2,  name: 'Cappelletti', role: 'D', x: 60.0, y: 20.0, badgePos: 'above' },
  { dorsal: 4,  name: 'Zukic', role: 'D', x: 65.0, y: 35.5, badgePos: 'above' },
  { dorsal: 5,  name: 'Vladimirov', role: 'D', x: 70.0, y: 67.5, badgePos: 'below' },
  { dorsal: 3,  name: 'Borsani', role: 'D', x: 53.0, y: 73.0, badgePos: 'below' },
  { dorsal: 11, name: 'Ossola', role: 'C', x: 47.0, y: 24.5, badgePos: 'above' },
  { dorsal: 8,  name: 'Pandolfi', role: 'C', x: 58.0, y: 45.0, badgePos: 'above' },
  { dorsal: 6,  name: 'Cissé', role: 'C', x: 55.0, y: 55.5, badgePos: 'below' },
  { dorsal: 7,  name: 'Sala', role: 'A', x: 37.0, y: 28.0, badgePos: 'above' },
  { dorsal: 9,  name: 'Asanji', role: 'A', x: 38.0, y: 45.0, badgePos: 'above' },
  { dorsal: 10, name: 'Vos', role: 'A', x: 41.0, y: 64.0, badgePos: 'below' },
];

// Configuración 2º Tiempo Milan Futuro
const MILAN_FUTURO_2T_PLAYERS: PlayerPin[] = [
  { dorsal: 1,  name: 'Pittarella', role: 'P', x: 80.0, y: 48.0, badgePos: 'above' },
  { dorsal: 13, name: 'Colombo', role: 'D', x: 62.0, y: 22.0, badgePos: 'above' },
  { dorsal: 14, name: 'Pagliei', role: 'D', x: 66.0, y: 38.0, badgePos: 'above' },
  { dorsal: 5,  name: 'Vladimirov', role: 'D', x: 72.0, y: 65.0, badgePos: 'below' },
  { dorsal: 15, name: 'Perera', role: 'D', x: 55.0, y: 75.0, badgePos: 'below' },
  { dorsal: 11, name: 'Ossola', role: 'C', x: 45.0, y: 28.0, badgePos: 'above' },
  { dorsal: 8,  name: 'Pandolfi', role: 'C', x: 56.0, y: 48.0, badgePos: 'above' },
  { dorsal: 6,  name: 'Cissé', role: 'C', x: 58.0, y: 58.0, badgePos: 'below' },
  { dorsal: 18, name: 'Menon', role: 'A', x: 36.0, y: 30.0, badgePos: 'above' },
  { dorsal: 9,  name: 'Asanji', role: 'A', x: 36.0, y: 48.0, badgePos: 'above' },
  { dorsal: 10, name: 'Vos', role: 'A', x: 43.0, y: 62.0, badgePos: 'below' },
];

// Matriz de calor 9 cols x 7 rows
const DENSITY_MATRIX_VV_1T: number[][] = [
  [0, 0, 0, 0, 2, 3, 2, 0, 0],
  [0, 0, 0, 1, 3, 3, 2, 0, 0],
  [0, 0, 1, 2, 1, 2, 1, 0, 0],
  [3, 0, 0, 3, 2, 2, 0, 0, 0],
  [2, 0, 3, 0, 1, 2, 2, 0, 0],
  [0, 0, 3, 0, 1, 2, 3, 0, 0],
  [0, 0, 0, 0, 1, 0, 2, 0, 0],
];

const DENSITY_MATRIX_MF_1T: number[][] = [
  [0, 0, 0, 0, 0, 2, 2, 0, 0],
  [0, 0, 0, 0, 0, 0, 2, 0, 0],
  [0, 0, 0, 0, 0, 0, 2, 0, 0],
  [0, 0, 0, 0, 0, 0, 2, 1, 3],
  [0, 0, 0, 0, 0, 0, 2, 3, 3],
  [0, 0, 0, 0, 0, 0, 3, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

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

  const playerPins = isHome
    ? is1T ? VILLA_VALLE_1T_PLAYERS : VILLA_VALLE_2T_PLAYERS
    : is1T ? MILAN_FUTURO_1T_PLAYERS : MILAN_FUTURO_2T_PLAYERS;

  const densityGrid = isHome ? DENSITY_MATRIX_VV_1T : DENSITY_MATRIX_MF_1T;

  const getRoleStyle = (role: 'P' | 'D' | 'C' | 'A') => {
    switch (role) {
      case 'P':
        return { bg: '#9da3a8', text: '#000000', label: 'Portero' };
      case 'D':
        return { bg: '#ffea00', text: '#000000', label: 'Defensa' };
      case 'C':
        return { bg: '#f99d42', text: '#000000', label: 'Centrocampista' };
      case 'A':
      default:
        return { bg: '#e50914', text: '#ffffff', label: 'Delantero' };
    }
  };

  const navigateToPlayerCard = (playerId?: string) => {
    if (playerId) {
      navigate(`/players/${playerId}?view=ficha`);
    } else {
      navigate(`/players?view=ficha`);
    }
  };

  // Medidas del bloque
  const longitudMetros = isHome
    ? (is1T ? '29,3' : '33,6')
    : (is1T ? '41,6' : '42,0');

  const amplitudMetros = isHome
    ? (is1T ? '44,8' : '44,0')
    : (is1T ? '39,2' : '41,6');

  // Densidades en márgenes
  const densY_top = isHome ? (is1T ? '34,5' : '24,6') : (is1T ? '41,0' : '19,8');
  const densY_mid = isHome ? (is1T ? '37,6' : '43,6') : (is1T ? '39,7' : '49,8');
  const densY_bot = isHome ? (is1T ? '27,9' : '31,8') : (is1T ? '19,3' : '30,4');

  const densX_left = isHome ? (is1T ? '28,9' : '25,6') : (is1T ? '12,3' : '20,9');
  const densX_mid  = isHome ? (is1T ? '42,7' : '31,3') : (is1T ? '37,7' : '31,1');
  const densX_right= isHome ? (is1T ? '28,4' : '43,1') : (is1T ? '50,0' : '48,0');

  return (
    <div className="space-y-6 animate-fade-in text-gray-800 dark:text-gray-100">
      
      {/* Controles: Selector de Parte y Selector de Equipo */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
        
        {/* Selector de Tiempo */}
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-indigo-600" />
          <span className="font-extrabold text-sm text-gray-800 dark:text-gray-200">Fracción de Juego:</span>
          <div className="flex bg-gray-100 dark:bg-neutral-800 p-1.5 rounded-2xl border border-gray-200/60 dark:border-white/10 shadow-inner">
            <button
              onClick={() => setSelectedHalf('1T')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedHalf === '1T'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30 scale-[1.02]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
              }`}
            >
              1ª Parte (Primo Tempo)
            </button>
            <button
              onClick={() => setSelectedHalf('2T')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedHalf === '2T'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30 scale-[1.02]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
              }`}
            >
              2ª Parte (Secondo Tempo)
            </button>
          </div>
        </div>

        {/* Selector de Equipo */}
        <div className="flex bg-gray-100 dark:bg-neutral-800 p-1.5 rounded-2xl border border-gray-200/60 dark:border-white/10 shadow-inner">
          <button
            onClick={() => setSelectedTeamKey('home')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              selectedTeamKey === 'home'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-2 ring-red-500/30 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${selectedTeamKey === 'home' ? 'bg-white' : 'bg-red-500'}`} />
            {homeTeam.nombre} ({block.sistema})
          </button>
          <button
            onClick={() => setSelectedTeamKey('away')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              selectedTeamKey === 'away'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/30 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-neutral-700/50'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${selectedTeamKey === 'away' ? 'bg-white' : 'bg-blue-500'}`} />
            {awayTeam.nombre} ({block.sistema})
          </button>
        </div>
      </div>

      {/* Header Panini: Leyenda de Roles + Nombre de Equipo + Sistema */}
      <div className="space-y-3 max-w-4xl mx-auto">
        {/* Role Legend Pills */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="px-4 py-1 rounded-xl border border-black font-bold text-xs bg-[#9da3a8] text-black shadow-xs">
            Portero
          </span>
          <span className="px-4 py-1 rounded-xl border border-black font-bold text-xs bg-[#ffea00] text-black shadow-xs">
            Defensa
          </span>
          <span className="px-4 py-1 rounded-xl border border-black font-bold text-xs bg-[#f99d42] text-black shadow-xs">
            Centrocampista
          </span>
          <span className="px-4 py-1 rounded-xl border border-black font-bold text-xs bg-[#e50914] text-white shadow-xs">
            Delantero
          </span>
        </div>

        {/* Team Title & Match Time Indicator */}
        <div className="flex items-center justify-between px-6 pt-1">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-2xl font-mono text-gray-900 dark:text-white">
              {block.sistema}
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-500">
              {is1T ? "45' Primo Tempo" : "51' Secondo Tempo"}
            </span>
          </div>

          <h2 className={`font-black text-2xl md:text-3xl tracking-wider uppercase ${isHome ? 'text-red-600' : 'text-[#001f7a] dark:text-blue-400'}`}>
            {team.nombre}
          </h2>

          <div className="text-xs font-mono font-bold text-gray-400">
            {is1T ? "23':27'' Efectivo" : "25':04'' Efectivo"}
          </div>
        </div>
      </div>

      {/* Campograma con Cotas en Metros, Densidades y Matriz 9x7 */}
      <div className="relative max-w-4xl mx-auto bg-white dark:bg-neutral-900 p-4 md:p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-lg">
        
        {/* Margen Superior e Izquierdo con Porcentajes */}
        <div className="flex items-stretch gap-2">
          
          {/* Eje Y: Porcentajes de densidad lateral (3 zonas) */}
          <div className="flex flex-col justify-between py-6 text-xs font-mono font-black text-gray-700 dark:text-gray-300 w-8 text-right shrink-0">
            <span>{densY_top}%</span>
            <span>{densY_mid}%</span>
            <span>{densY_bot}%</span>
          </div>

          {/* Terreno de Juego */}
          <div className="relative flex-1 aspect-[100/60] rounded-xl overflow-hidden border-2 border-gray-400 dark:border-white/20 bg-[#e3f4d7] select-none">
            
            {/* 1. Fondo Rayado Diagonal Panini */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(34, 197, 94, 0.35), rgba(34, 197, 94, 0.35) 2px, transparent 2px, transparent 8px)'
              }}
            />

            {/* 2. Cuadrícula de Densidad 9 cols x 7 rows */}
            <div className="absolute inset-0 grid grid-cols-9 grid-rows-7 pointer-events-none z-10">
              {densityGrid.map((row, rIdx) =>
                row.map((cellVal, cIdx) => {
                  let bgStyle = 'transparent';
                  if (cellVal === 1) bgStyle = 'rgba(74, 222, 128, 0.45)'; // verde suave
                  if (cellVal === 2) bgStyle = '#00a800'; // verde medio
                  if (cellVal === 3) bgStyle = '#006000'; // verde oscuro denso

                  return (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      style={{ backgroundColor: bgStyle }}
                      className="border border-green-600/10 transition-colors"
                    />
                  );
                })
              )}
            </div>

            {/* 3. SVG Pitch Markings */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-15" viewBox="0 0 100 60" preserveAspectRatio="none">
              <rect x="2" y="2" width="96" height="56" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
              <line x1="50" y1="2" x2="50" y2="58" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
              <circle cx="50" cy="30" r="9" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
              <circle cx="50" cy="30" r="0.6" fill="rgba(255,255,255,0.9)" />
              
              {/* Left Box */}
              <rect x="2" y="14" width="14" height="32" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
              <rect x="2" y="21" width="5" height="18" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
              <circle cx="10" cy="30" r="0.6" fill="rgba(255,255,255,0.9)" />
              <path d="M 16 23 A 8.5 8.5 0 0 1 16 37" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />

              {/* Right Box */}
              <rect x="84" y="14" width="14" height="32" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
              <rect x="93" y="21" width="5" height="18" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
              <circle cx="90" cy="30" r="0.6" fill="rgba(255,255,255,0.9)" />
              <path d="M 84 23 A 8.5 8.5 0 0 0 84 37" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
            </svg>

            {/* Trademark */}
            <div className="absolute top-2 right-4 text-[11px] font-bold text-black pointer-events-none z-20">
              ©Panini Digital
            </div>

            {/* Crests */}
            {isHome ? (
              <div className="absolute top-2 left-2 w-11 h-11 bg-white rounded-lg border border-gray-300 p-1 shadow-md flex items-center justify-center pointer-events-none z-20">
                <div className="w-full h-full bg-red-600 text-white font-black text-[8px] flex items-center justify-center rounded">
                  VV
                </div>
              </div>
            ) : (
              <div className="absolute bottom-2 right-2 w-11 h-11 bg-white rounded-lg border border-gray-300 p-1 shadow-md flex items-center justify-center pointer-events-none z-20">
                <div className="w-full h-full bg-black text-white font-black text-[8px] flex items-center justify-center rounded border border-red-600">
                  ACM
                </div>
              </div>
            )}

            {/* 4. Cotas en Metros: Brackets de Longitud y Amplitud */}
            {/* Brackets Amplitud (Eje Y) */}
            <div className={`absolute ${isHome ? 'right-2' : 'left-2'} top-[20%] bottom-[20%] w-8 flex items-center justify-center pointer-events-none z-25`}>
              <div className={`w-2 h-full ${isHome ? 'border-r-2 border-y-2' : 'border-l-2 border-y-2'} border-black`} />
              <span className={`absolute ${isHome ? '-right-2' : '-left-2'} top-1/2 -translate-y-1/2 bg-white/95 px-1.5 py-0.5 rounded text-[10px] font-black text-black font-mono shadow-sm whitespace-nowrap -rotate-90 border border-black/20`}>
                mt {amplitudMetros}
              </span>
            </div>

            {/* Brackets Longitud (Eje X) */}
            <div className={`absolute bottom-2 ${isHome ? 'left-[38%] right-[30%]' : 'left-[35%] right-[25%]'} h-6 flex items-center justify-center pointer-events-none z-25`}>
              <div className="h-2 w-full border-b-2 border-x-2 border-black" />
              <span className="absolute bottom-0.5 bg-white/95 px-2 py-0.5 rounded text-[10px] font-black text-black font-mono shadow-sm border border-black/20">
                mt {longitudMetros}
              </span>
            </div>

            {/* 5. Jugadores Ubicados en el Campograma */}
            {playerPins.map((pin) => {
              const roleStyle = getRoleStyle(pin.role);
              const isSelected = selectedPlayer?.player.dorsal === pin.dorsal;
              const dbPlayer = team.alineacion.find(p => p.dorsal === pin.dorsal);

              return (
                <div
                  key={pin.dorsal}
                  onClick={() =>
                    setSelectedPlayer({
                      player: dbPlayer || {
                        dorsal: pin.dorsal,
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
                  {/* Name Tag (Above) */}
                  {pin.badgePos === 'above' && (
                    <div
                      style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
                      className="px-2 py-0.5 rounded border border-black text-[9px] font-black shadow-md whitespace-nowrap mb-0.5"
                    >
                      {pin.name}
                    </div>
                  )}

                  {/* Circle Number */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-lg transition-all ${
                      pin.role === 'P'
                        ? 'bg-[#9da3a8] text-black border-2 border-black'
                        : isHome
                        ? 'bg-red-600 text-white border-2 border-white'
                        : 'bg-[#001f7a] text-white border-2 border-white'
                    } ${isSelected ? 'ring-4 ring-yellow-400' : ''}`}
                  >
                    {pin.dorsal}
                  </div>

                  {/* Name Tag (Below) */}
                  {pin.badgePos === 'below' && (
                    <div
                      style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
                      className="px-2 py-0.5 rounded border border-black text-[9px] font-black shadow-md whitespace-nowrap mt-0.5"
                    >
                      {pin.name}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </div>

        {/* Eje X: Porcentajes de densidad longitudinal (3 zonas) */}
        <div className="flex justify-between items-center pl-10 pr-6 pt-3 text-xs font-mono font-black text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-6">
            <span className="text-gray-400">%</span>
            <span>{densX_left}%</span>
          </div>
          <div>
            <span>{densX_mid}%</span>
          </div>
          <div>
            <span>{densX_right}%</span>
          </div>
        </div>

      </div>

      {/* Selected Player Interactive Bottom Bar */}
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all shadow-sm"
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
