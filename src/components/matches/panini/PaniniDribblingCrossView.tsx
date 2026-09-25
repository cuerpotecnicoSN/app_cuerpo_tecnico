import { useState } from 'react';
import { Activity, Zap, Compass } from 'lucide-react';
import type { PaniniTeamData } from '../../../types/paniniReport';

interface Props {
  homeTeam: PaniniTeamData;
  awayTeam: PaniniTeamData;
}

interface ActionPoint {
  id: string;
  x: number;
  y: number;
  isSuccessful: boolean;
  minute?: string;
  player?: string;
}

// Puntos de Dribbling exactos (ambos atacando hacia la derecha)
const DRIBBLES_HOME: ActionPoint[] = [
  { id: 'dh-1', x: 42.0, y: 12.0, isSuccessful: false, minute: "24'", player: 'Ravasi' },
  { id: 'dh-2', x: 49.0, y: 15.0, isSuccessful: true, minute: "38'", player: 'Siani' },
  { id: 'dh-3', x: 26.0, y: 55.0, isSuccessful: true, minute: "12'", player: 'Serena' },
  { id: 'dh-4', x: 24.5, y: 70.0, isSuccessful: true, minute: "41'", player: 'Martinelli' },
  { id: 'dh-5', x: 67.5, y: 82.0, isSuccessful: true, minute: "58'", player: 'Benzoni' },
  { id: 'dh-6', x: 69.5, y: 85.0, isSuccessful: true, minute: "67'", player: 'Benzoni' },
  { id: 'dh-7', x: 78.5, y: 22.0, isSuccessful: true, minute: "72'", player: 'Siani' },
  { id: 'dh-8', x: 80.5, y: 18.0, isSuccessful: true, minute: "80'", player: 'Siani' },
  { id: 'dh-9', x: 83.5, y: 25.0, isSuccessful: true, minute: "84'", player: 'Nikolli' },
  { id: 'dh-10', x: 81.0, y: 32.0, isSuccessful: true, minute: "90+1'", player: 'Siani' },
];

const DRIBBLES_AWAY: ActionPoint[] = [
  { id: 'da-1', x: 19.0, y: 68.0, isSuccessful: false, minute: "15'", player: 'Vladimirov' },
  { id: 'da-2', x: 25.5, y: 70.0, isSuccessful: true, minute: "22'", player: 'Vladimirov' },
  { id: 'da-3', x: 28.5, y: 85.0, isSuccessful: true, minute: "34'", player: 'Cappelletti' },
  { id: 'da-4', x: 33.5, y: 74.0, isSuccessful: false, minute: "40'", player: 'Cissé' },
  { id: 'da-5', x: 37.0, y: 88.0, isSuccessful: true, minute: "52'", player: 'Pandolfi' },
  { id: 'da-6', x: 39.5, y: 32.0, isSuccessful: true, minute: "48'", player: 'Sala' },
  { id: 'da-7', x: 47.0, y: 38.0, isSuccessful: true, minute: "56'", player: 'Ossola' },
  { id: 'da-8', x: 49.5, y: 52.0, isSuccessful: true, minute: "62'", player: 'Pandolfi' },
  { id: 'da-9', x: 50.5, y: 49.0, isSuccessful: false, minute: "66'", player: 'Ossola' },
  { id: 'da-10', x: 57.0, y: 46.0, isSuccessful: true, minute: "71'", player: 'Pandolfi' },
  { id: 'da-11', x: 41.5, y: 92.0, isSuccessful: false, minute: "75'", player: 'Menon' },
  { id: 'da-12', x: 57.5, y: 87.0, isSuccessful: false, minute: "79'", player: 'Menon' },
  { id: 'da-13', x: 62.0, y: 91.0, isSuccessful: false, minute: "84'", player: 'Menon' },
  { id: 'da-14', x: 68.5, y: 73.0, isSuccessful: true, minute: "86'", player: 'Pandolfi' },
  { id: 'da-15', x: 74.0, y: 71.0, isSuccessful: true, minute: "89'", player: 'Pandolfi' },
  { id: 'da-16', x: 89.0, y: 28.0, isSuccessful: true, minute: "90+2'", player: 'Ossola' },
  { id: 'da-17', x: 91.0, y: 38.0, isSuccessful: true, minute: "90+4'", player: 'Ossola' },
];

// Puntos de Centros al Área exactos
const CROSSES_HOME: ActionPoint[] = [
  { id: 'ch-1', x: 48.0, y: 18.0, isSuccessful: false, minute: "14'", player: 'Caccia' },
  { id: 'ch-2', x: 50.0, y: 21.0, isSuccessful: true, minute: "28'", player: 'Caccia' },
  { id: 'ch-3', x: 51.5, y: 26.0, isSuccessful: true, minute: "35'", player: 'Caccia' },
  { id: 'ch-4', x: 55.0, y: 23.0, isSuccessful: true, minute: "52'", player: 'Danieli' },
  { id: 'ch-5', x: 60.0, y: 22.0, isSuccessful: false, minute: "60'", player: 'Zambelli' },
  { id: 'ch-6', x: 63.5, y: 26.0, isSuccessful: false, minute: "74'", player: 'Zambelli' },
  { id: 'ch-7', x: 77.0, y: 29.0, isSuccessful: true, minute: "81'", player: 'Siani' },
  { id: 'ch-8', x: 79.5, y: 32.0, isSuccessful: true, minute: "87'", player: 'Siani' },
  { id: 'ch-9', x: 83.0, y: 36.0, isSuccessful: true, minute: "90+2'", player: 'Siani' },
  // Banda derecha
  { id: 'ch-10', x: 51.5, y: 92.0, isSuccessful: false, minute: "19'", player: 'Martinelli' },
  { id: 'ch-11', x: 54.0, y: 88.0, isSuccessful: true, minute: "44'", player: 'Martinelli' },
  { id: 'ch-12', x: 66.5, y: 84.0, isSuccessful: true, minute: "63'", player: 'Strechie' },
  { id: 'ch-13', x: 73.0, y: 87.0, isSuccessful: true, minute: "77'", player: 'Benzoni' },
  { id: 'ch-14', x: 77.5, y: 83.0, isSuccessful: true, minute: "83'", player: 'Benzoni' },
  { id: 'ch-15', x: 83.0, y: 94.0, isSuccessful: true, minute: "89'", player: 'Nikolli' },
];

const CROSSES_AWAY: ActionPoint[] = [
  { id: 'ca-1', x: 65.0, y: 26.0, isSuccessful: true, minute: "26'", player: 'Sala' },
  { id: 'ca-2', x: 78.5, y: 30.0, isSuccessful: true, minute: "41'", player: 'Ossola' },
  { id: 'ca-3', x: 82.5, y: 30.0, isSuccessful: true, minute: "76'", player: 'Ossola' },
  // Banda derecha
  { id: 'ca-4', x: 67.5, y: 92.0, isSuccessful: true, minute: "32'", player: 'Cappelletti' },
  { id: 'ca-5', x: 79.0, y: 98.0, isSuccessful: false, minute: "54'", player: 'Cappelletti' },
  { id: 'ca-6', x: 83.0, y: 86.0, isSuccessful: false, minute: "70'", player: 'Borsani' },
  { id: 'ca-7', x: 85.0, y: 90.0, isSuccessful: true, minute: "88'", player: 'Menon' },
];

export default function PaniniDribblingCrossView({ homeTeam, awayTeam }: Props) {
  const [selectedPoint, setSelectedPoint] = useState<ActionPoint | null>(null);

  const renderHalfPitchMap = (
    teamName: string,
    isHome: boolean,
    points: ActionPoint[],
    densitiesY: { left: number; center: number; right: number },
    densitiesX: { defense: number; midfield: number; attack: number }
  ) => {
    return (
      <div className="flex-1 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
        {/* Pitch Card Header */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isHome ? 'bg-red-600' : 'bg-blue-600'}`} />
            <span className={`font-black text-sm ${isHome ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {teamName}
            </span>
          </div>
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
            Ataque ➔ Portería Rival
          </span>
        </div>

        {/* The Pitch Viewport */}
        <div className="flex items-stretch gap-1.5">
          
          {/* Eje Y: Densidades de banda (Izquierda, Centro, Derecha) */}
          <div className="flex flex-col justify-between py-4 text-[10px] font-mono font-black text-gray-700 dark:text-gray-300 w-12 text-right shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-gray-400 uppercase -rotate-90 origin-right translate-y-1">Izq</span>
              <span>{densitiesY.left}%</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-gray-400 uppercase -rotate-90 origin-right translate-y-1">Cen</span>
              <span>{densitiesY.center}%</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-gray-400 uppercase -rotate-90 origin-right translate-y-1">Dcha</span>
              <span>{densitiesY.right}%</span>
            </div>
          </div>

          {/* Terreno de Juego Horizontal */}
          <div className="relative flex-1 aspect-[100/62] rounded-xl overflow-hidden border-2 border-gray-300 dark:border-white/20 bg-[#a7d7a9] select-none shadow-inner">
            
            {/* SVG Markings */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 62" preserveAspectRatio="none">
              <rect x="2" y="2" width="96" height="58" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <line x1="50" y1="2" x2="50" y2="60" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <circle cx="50" cy="31" r="9" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <circle cx="50" cy="31" r="0.6" fill="rgba(255,255,255,0.85)" />

              {/* Left Box */}
              <rect x="2" y="15" width="14" height="32" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <rect x="2" y="22" width="5" height="18" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />

              {/* Right Box (Target Goal) */}
              <rect x="84" y="15" width="14" height="32" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <rect x="93" y="22" width="5" height="18" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <circle cx="90" cy="31" r="0.6" fill="rgba(255,255,255,0.85)" />
              <path d="M 84 24 A 8.5 8.5 0 0 0 84 38" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
            </svg>

            {/* Trademark */}
            <div className="absolute top-1.5 right-3 text-[10px] font-bold text-black pointer-events-none">
              ©Panini Digital
            </div>

            {/* Action Points */}
            {points.map((pt) => {
              const isSelected = selectedPoint?.id === pt.id;
              const color = isHome ? '#dc2626' : '#1d4ed8';

              return (
                <div
                  key={pt.id}
                  onClick={() => setSelectedPoint(pt)}
                  style={{
                    left: `${pt.x}%`,
                    top: `${pt.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute z-20 cursor-pointer transition-all duration-200 ${
                    isSelected ? 'scale-150 z-30' : 'hover:scale-125'
                  }`}
                  title={`${pt.player || 'Jugador'} (${pt.minute || ''}) - ${pt.isSuccessful ? 'Útil / Exitoso' : 'Incompleto'}`}
                >
                  {pt.isSuccessful ? (
                    /* Cuadrado para acción exitosa/útil */
                    <div
                      style={{ backgroundColor: color }}
                      className={`w-3.5 h-3.5 rounded-xs shadow-md border border-white ${
                        isSelected ? 'ring-2 ring-yellow-400' : ''
                      }`}
                    />
                  ) : (
                    /* Círculo para acción incompleta */
                    <div
                      style={{ backgroundColor: color }}
                      className={`w-3.5 h-3.5 rounded-full shadow-md border border-white ${
                        isSelected ? 'ring-2 ring-yellow-400' : ''
                      }`}
                    />
                  )}
                </div>
              );
            })}

          </div>
        </div>

        {/* Eje X: Porcentajes de longitud (Defensa, Mediocampo, Ataque) */}
        <div className="flex justify-between items-center pl-14 pr-4 text-[10px] font-mono font-black text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-1">
            <span className="text-gray-400 uppercase text-[9px]">Def:</span>
            <span>{densitiesX.defense}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400 uppercase text-[9px]">Med:</span>
            <span>{densitiesX.midfield}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400 uppercase text-[9px]">Atq:</span>
            <span>{densitiesX.attack}%</span>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in text-gray-800 dark:text-gray-100">
      
      {/* Legend & Orientation Header */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="text-amber-500" size={18} />
            Regates y Centros al Área (Dribbling & Cross)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ambos equipos encarados hacia la derecha en dirección al ataque con desglose en 3 zonas (X e Y).
          </p>
        </div>

        {/* Shapes Legend */}
        <div className="flex items-center gap-4 text-xs font-bold bg-gray-50 dark:bg-neutral-800 px-3 py-1.5 rounded-2xl border border-gray-200 dark:border-white/10">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-gray-700 dark:bg-gray-300 rounded-xs inline-block" /> Útil / Exitoso
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-gray-700 dark:bg-gray-300 rounded-full inline-block" /> Incompleto
          </span>
        </div>
      </div>

      {/* SECCIÓN 1: DRIBBLING (REGATES) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-white/10">
          <h4 className="font-black text-sm uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="text-indigo-600" size={16} /> Regates (Dribbling)
          </h4>
          <span className="text-xs text-gray-400 font-bold">
            Villa Valle: 8/11 útiles (73%) • Milan Futuro: 13/19 útiles (68%)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Local: Villa Valle */}
          {renderHalfPitchMap(
            homeTeam.nombre,
            true,
            DRIBBLES_HOME,
            { left: 64, center: 9, right: 27 },
            { defense: 9, midfield: 18, attack: 73 }
          )}

          {/* Visitante: Milan Futuro */}
          {renderHalfPitchMap(
            awayTeam.nombre,
            false,
            DRIBBLES_AWAY,
            { left: 11, center: 47, right: 42 },
            { defense: 26, midfield: 48, attack: 26 }
          )}
        </div>
      </div>

      {/* SECCIÓN 2: CROSS SU AZIONE (CENTROS EN JUGADA) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-white/10">
          <h4 className="font-black text-sm uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
            <Compass className="text-emerald-600" size={16} /> Centros al Área en Jugada (Cross su Azione)
          </h4>
          <span className="text-xs text-gray-400 font-bold">
            Villa Valle: 16/24 completados (67%) • Milan Futuro: 5/8 completados (63%)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Local: Villa Valle */}
          {renderHalfPitchMap(
            homeTeam.nombre,
            true,
            CROSSES_HOME,
            { left: 62, center: 0, right: 38 },
            { defense: 0, midfield: 0, attack: 100 }
          )}

          {/* Visitante: Milan Futuro */}
          {renderHalfPitchMap(
            awayTeam.nombre,
            false,
            CROSSES_AWAY,
            { left: 37, center: 0, right: 63 },
            { defense: 0, midfield: 0, attack: 100 }
          )}
        </div>
      </div>

      {/* Selected Action Point Pill */}
      {selectedPoint && (
        <div className="p-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl flex items-center justify-between max-w-md mx-auto shadow-md border border-white/10 text-xs animate-scale-in">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="font-bold">{selectedPoint.player || 'Acción'}</span>
            <span className="text-gray-400">Minuto {selectedPoint.minute || '-'}</span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
            selectedPoint.isSuccessful ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}>
            {selectedPoint.isSuccessful ? 'Útil / Exitoso' : 'Incompleto'}
          </span>
        </div>
      )}

    </div>
  );
}
