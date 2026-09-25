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

// Configuración visual exacta 1º Tiempo Villa Valle (Ataca hacia la derecha)
const VILLA_VALLE_1T_PLAYERS: PlayerPin[] = [
  { dorsal: 35, name: 'Offredi', role: 'P', x: 10.5, y: 50.0, badgePos: 'below' },
  { dorsal: 4,  name: 'Nava', role: 'D', x: 34.0, y: 35.5, badgePos: 'above' },
  { dorsal: 24, name: 'Piacentini', role: 'D', x: 34.0, y: 64.5, badgePos: 'below' },
  { dorsal: 30, name: 'Caccia', role: 'D', x: 56.5, y: 20.0, badgePos: 'above' },
  { dorsal: 25, name: 'Martinelli', role: 'D', x: 56.5, y: 78.5, badgePos: 'below' },
  { dorsal: 8,  name: 'Serena', role: 'C', x: 50.0, y: 44.5, badgePos: 'above' },
  { dorsal: 28, name: 'Rinaldi', role: 'C', x: 50.5, y: 62.5, badgePos: 'below' },
  { dorsal: 21, name: 'Danieli', role: 'C', x: 68.0, y: 29.5, badgePos: 'above' },
  { dorsal: 20, name: 'Strechie', role: 'C', x: 68.0, y: 75.0, badgePos: 'below' },
  { dorsal: 14, name: "D'Amuri", role: 'A', x: 68.0, y: 47.0, badgePos: 'above' },
  { dorsal: 7,  name: 'Ravasi', role: 'A', x: 68.0, y: 61.5, badgePos: 'above' },
];

// Configuración visual exacta 2º Tiempo Villa Valle
const VILLA_VALLE_2T_PLAYERS: PlayerPin[] = [
  { dorsal: 35, name: 'Offredi', role: 'P', x: 10.5, y: 50.0, badgePos: 'below' },
  { dorsal: 4,  name: 'Nava', role: 'D', x: 44.0, y: 34.0, badgePos: 'above' },
  { dorsal: 24, name: 'Piacentini', role: 'D', x: 41.0, y: 62.0, badgePos: 'below' },
  { dorsal: 3,  name: 'Zambelli', role: 'D', x: 54.0, y: 22.0, badgePos: 'above' },
  { dorsal: 25, name: 'Martinelli', role: 'D', x: 56.0, y: 78.0, badgePos: 'below' },
  { dorsal: 8,  name: 'Serena', role: 'C', x: 51.5, y: 47.0, badgePos: 'above' },
  { dorsal: 28, name: 'Rinaldi', role: 'C', x: 55.5, y: 64.0, badgePos: 'below' },
  { dorsal: 27, name: 'Benzoni', role: 'C', x: 66.0, y: 34.0, badgePos: 'above' },
  { dorsal: 19, name: 'Nikolli', role: 'C', x: 64.0, y: 74.0, badgePos: 'below' },
  { dorsal: 11, name: 'Siani', role: 'A', x: 68.5, y: 47.0, badgePos: 'above' },
  { dorsal: 7,  name: 'Ravasi', role: 'A', x: 66.5, y: 61.0, badgePos: 'above' },
];

// Configuración visual exacta 1º Tiempo Milan Futuro (Ataca hacia la izquierda)
const MILAN_FUTURO_1T_PLAYERS: PlayerPin[] = [
  { dorsal: 1,  name: 'Pittarella', role: 'P', x: 89.0, y: 50.0, badgePos: 'below' },
  { dorsal: 2,  name: 'Cappelletti', role: 'D', x: 54.0, y: 20.0, badgePos: 'above' },
  { dorsal: 4,  name: 'Zukic', role: 'D', x: 68.0, y: 36.0, badgePos: 'above' },
  { dorsal: 5,  name: 'Vladimirov', role: 'D', x: 72.0, y: 67.0, badgePos: 'below' },
  { dorsal: 3,  name: 'Borsani', role: 'D', x: 54.0, y: 77.0, badgePos: 'below' },
  { dorsal: 8,  name: 'Pandolfi', role: 'C', x: 59.0, y: 46.0, badgePos: 'above' },
  { dorsal: 6,  name: 'Cissé', role: 'C', x: 57.0, y: 58.0, badgePos: 'below' },
  { dorsal: 11, name: 'Ossola', role: 'C', x: 46.0, y: 26.0, badgePos: 'above' },
  { dorsal: 7,  name: 'Sala', role: 'A', x: 37.0, y: 29.0, badgePos: 'above' },
  { dorsal: 9,  name: 'Asanji', role: 'A', x: 37.0, y: 48.0, badgePos: 'above' },
  { dorsal: 10, name: 'Vos', role: 'A', x: 42.0, y: 63.0, badgePos: 'below' },
];

// Configuración visual exacta 2º Tiempo Milan Futuro
const MILAN_FUTURO_2T_PLAYERS: PlayerPin[] = [
  { dorsal: 1,  name: 'Pittarella', role: 'P', x: 88.5, y: 50.0, badgePos: 'below' },
  { dorsal: 13, name: 'Colombo', role: 'D', x: 58.0, y: 22.0, badgePos: 'above' },
  { dorsal: 14, name: 'Pagliei', role: 'D', x: 66.0, y: 37.0, badgePos: 'above' },
  { dorsal: 5,  name: 'Vladimirov', role: 'D', x: 70.0, y: 65.0, badgePos: 'below' },
  { dorsal: 15, name: 'Perera', role: 'D', x: 55.0, y: 76.0, badgePos: 'below' },
  { dorsal: 8,  name: 'Pandolfi', role: 'C', x: 56.0, y: 47.0, badgePos: 'above' },
  { dorsal: 6,  name: 'Cissé', role: 'C', x: 57.0, y: 58.0, badgePos: 'below' },
  { dorsal: 11, name: 'Ossola', role: 'C', x: 44.0, y: 27.0, badgePos: 'above' },
  { dorsal: 18, name: 'Menon', role: 'A', x: 35.0, y: 30.0, badgePos: 'above' },
  { dorsal: 9,  name: 'Asanji', role: 'A', x: 36.0, y: 48.0, badgePos: 'above' },
  { dorsal: 10, name: 'Vos', role: 'A', x: 43.0, y: 62.0, badgePos: 'below' },
];

// Matriz de densidad exacta 9 cols x 7 rows del informe oficial Panini Digital
const DENSITY_MATRIX_VV_1T: number[][] = [
  [0, 0, 0, 0, 1, 3, 2, 0, 0],
  [0, 0, 1, 2, 1, 3, 2, 0, 0],
  [0, 0, 1, 0, 0, 0, 1, 0, 0],
  [2, 0, 0, 3, 2, 2, 1, 0, 0],
  [2, 0, 3, 0, 1, 2, 2, 0, 0],
  [0, 0, 3, 0, 1, 2, 3, 0, 0],
  [0, 0, 0, 0, 1, 0, 2, 0, 0],
];

const DENSITY_MATRIX_VV_2T: number[][] = [
  [0, 0, 0, 0, 1, 2, 3, 1, 0],
  [0, 0, 1, 1, 2, 3, 2, 0, 0],
  [0, 0, 1, 0, 1, 2, 2, 0, 0],
  [2, 0, 0, 2, 2, 3, 2, 0, 0],
  [2, 0, 2, 1, 2, 2, 3, 0, 0],
  [0, 0, 2, 1, 1, 3, 3, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 0, 0],
];

const DENSITY_MATRIX_MF_1T: number[][] = [
  [0, 0, 2, 3, 1, 0, 0, 0, 0],
  [0, 0, 3, 3, 1, 2, 1, 0, 0],
  [0, 0, 1, 2, 1, 0, 1, 0, 0],
  [0, 0, 0, 2, 2, 3, 0, 0, 2],
  [0, 0, 2, 2, 1, 0, 3, 0, 2],
  [0, 0, 3, 2, 1, 0, 3, 0, 0],
  [0, 0, 2, 0, 1, 0, 0, 0, 0],
];

const DENSITY_MATRIX_MF_2T: number[][] = [
  [0, 1, 3, 2, 1, 0, 0, 0, 0],
  [0, 0, 2, 3, 2, 1, 1, 0, 0],
  [0, 0, 2, 2, 1, 0, 1, 0, 0],
  [0, 0, 2, 3, 2, 2, 0, 0, 2],
  [0, 0, 3, 2, 2, 1, 2, 0, 2],
  [0, 0, 3, 3, 1, 1, 2, 0, 0],
  [0, 0, 2, 2, 1, 0, 0, 0, 0],
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

  const densityGrid = isHome
    ? is1T ? DENSITY_MATRIX_VV_1T : DENSITY_MATRIX_VV_2T
    : is1T ? DENSITY_MATRIX_MF_1T : DENSITY_MATRIX_MF_2T;

  const getRoleStyle = (role: 'P' | 'D' | 'C' | 'A') => {
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

  // Medidas del bloque (Longitud horizontal y Amplitud vertical)
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
            {homeTeam.nombre} ({block.sistema})
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
            {awayTeam.nombre} ({block.sistema})
          </button>
        </div>
      </div>

      {/* Tarjeta Campograma Oficial Panini Digital */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-neutral-900 p-4 sm:p-6 md:p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-lg space-y-4">
        
        {/* 1. Barra Superior Panini Oficial: 45' | primo tempo | 23':27'' */}
        <div className="bg-[#e2e2e4] dark:bg-neutral-800 rounded-lg px-4 py-1.5 flex items-center justify-between font-black text-sm text-black dark:text-white select-none border border-gray-300 dark:border-white/10">
          <span className="font-mono text-base">{is1T ? "45'" : "51'"}</span>
          <span className="uppercase tracking-widest text-xs font-extrabold text-gray-800 dark:text-gray-200">
            {is1T ? 'primo tempo' : 'secondo tempo'}
          </span>
          <span className="font-mono text-base">{is1T ? "23':27''" : "25':04''"}</span>
        </div>

        {/* 2. Sistema y Nombre del Equipo */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1">
          <span className="font-black text-2xl font-mono text-black dark:text-white">
            {block.sistema}
          </span>
          <h2 className={`font-black text-2xl sm:text-3xl tracking-wider uppercase ${isHome ? 'text-[#e50914]' : 'text-[#001f7a] dark:text-blue-400'}`}>
            {team.nombre}
          </h2>
          <span className="w-12"></span>
        </div>

        {/* 3. Campograma Principal con Porcentajes Laterales y Matriz 9x7 */}
        <div className="flex items-stretch gap-2.5 sm:gap-4">
          
          {/* Eje Y: Porcentajes de densidad lateral (3 zonas) */}
          <div className="flex flex-col justify-between py-6 text-xs sm:text-sm font-mono font-black text-black dark:text-white w-9 text-right shrink-0 select-none">
            <span>{densY_top}</span>
            <span>{densY_mid}</span>
            <span>{densY_bot}</span>
          </div>

          {/* Terreno de Juego con Proporciones Oficiales y Líneas Sincronizadas */}
          <div className="relative flex-1 aspect-[100/62] rounded-xl overflow-hidden border-2 border-gray-400 dark:border-white/20 bg-[#def0d3] select-none shadow-inner">
            
            {/* 3.1 Fondo Rayado Diagonal Panini */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-40 z-0"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(80, 185, 80, 0.35) 0px, rgba(80, 185, 80, 0.35) 1px, transparent 1px, transparent 6px)'
              }}
            />

            {/* 3.2 Cuadrícula de Densidad 9 cols x 7 rows con Colores Oficiales Panini */}
            <div className="absolute inset-0 grid grid-cols-9 grid-rows-7 pointer-events-none z-10">
              {densityGrid.map((row, rIdx) =>
                row.map((cellVal, cIdx) => {
                  let bgStyle = 'transparent';
                  if (cellVal === 1) bgStyle = '#76d66b'; // Verde claro Panini
                  if (cellVal === 2) bgStyle = '#009e00'; // Verde medio Panini
                  if (cellVal === 3) bgStyle = '#005500'; // Verde oscuro Panini

                  return (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      style={{ backgroundColor: bgStyle }}
                      className="border border-white/25 transition-colors"
                    />
                  );
                })
              )}
            </div>

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
            {isHome ? (
              <div className="absolute top-2 left-2 w-10 h-12 bg-white rounded-xl border border-gray-300 p-0.5 shadow-sm flex flex-col items-center justify-center pointer-events-none z-20">
                <div className="w-full h-full rounded-lg border border-red-500 flex flex-col items-center justify-center bg-white p-0.5">
                  <span className="text-[7px] font-black text-red-600 leading-tight text-center">VILLA</span>
                  <span className="text-[6.5px] font-black text-amber-600 leading-tight text-center">VALLE</span>
                </div>
              </div>
            ) : (
              <div className="absolute bottom-2 right-2 w-10 h-10 bg-white rounded-full border border-gray-300 p-0.5 shadow-sm flex items-center justify-center pointer-events-none z-20">
                <div className="w-full h-full bg-black text-white font-black text-[7px] flex items-center justify-center rounded-full border border-red-600">
                  ACM
                </div>
              </div>
            )}

            {/* 3.4 Cotas Métricas: Brackets Oficiales de Longitud y Amplitud */}
            {/* Brackets Amplitud (Eje Y) */}
            <div className={`absolute ${isHome ? 'right-2' : 'left-2'} top-[20%] bottom-[21.5%] w-8 flex items-center justify-center pointer-events-none z-25`}>
              <div className={`w-2 h-full ${isHome ? 'border-r-2 border-y-2' : 'border-l-2 border-y-2'} border-black`} />
              <span className={`absolute ${isHome ? '-right-2' : '-left-2'} top-1/2 -translate-y-1/2 bg-white/95 px-1 py-0.2 rounded text-[10px] font-black text-black font-mono shadow-xs whitespace-nowrap -rotate-90 border border-black/20`}>
                mt {amplitudMetros}
              </span>
            </div>

            {/* Brackets Longitud (Eje X) */}
            <div className={`absolute bottom-2 ${isHome ? 'left-[34%] right-[32%]' : 'left-[32%] right-[30%]'} h-6 flex items-center justify-center pointer-events-none z-25`}>
              <div className="h-2 w-full border-b-2 border-x-2 border-black" />
              <span className="absolute bottom-0.5 bg-white/95 px-1.5 py-0.2 rounded text-[10px] font-black text-black font-mono shadow-xs border border-black/20">
                mt {longitudMetros}
              </span>
            </div>

            {/* 3.5 Pines de Jugadores con Posicionamiento y Etiquetas de Rol */}
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

