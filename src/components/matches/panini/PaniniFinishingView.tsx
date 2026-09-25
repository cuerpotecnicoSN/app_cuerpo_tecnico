import { useState } from 'react';
import { 
  Crosshair, 
  Target, 
  Clock 
} from 'lucide-react';
import type { PaniniTeamData } from '../../../types/paniniReport';
import { MISSING_SPATIAL_DATA_MESSAGE } from './paniniPitch';

interface Props {
  homeTeam: PaniniTeamData;
  awayTeam: PaniniTeamData;
}

interface ShotPoint {
  id: string;
  /** Posición en el medio campo dibujado (% del contenedor) */
  left: number;
  top: number;
  half: 1 | 2;
  isSetPiece: boolean;
  isGoal: boolean;
}

const SET_PIECE_LABELS: Record<string, string> = {
  faltas_derecha: 'Faltas desde la derecha',
  faltas_centrales: 'Faltas centrales',
  faltas_izquierda: 'Faltas desde la izquierda',
  corners_derecha: 'Córners desde la derecha',
  corners_izquierda: 'Córners desde la izquierda',
  saques_banda_derecha: 'Saques de banda desde la derecha',
  saques_banda_izquierda: 'Saques de banda desde la izquierda',
};

const minuteValue = (m: string) => {
  const match = m.match(/^(\d+)(?:\+(\d+))?/);
  return match ? Number(match[1]) + (match[2] ? Number(match[2]) : 0) : 0;
};

export default function PaniniFinishingView({ homeTeam, awayTeam }: Props) {
  const [selectedTeamKey, setSelectedTeamKey] = useState<'home' | 'away'>('home');
  const [selectedShot, setSelectedShot] = useState<ShotPoint | null>(null);

  const isHome = selectedTeamKey === 'home';
  const team = isHome ? homeTeam : awayTeam;
  const fin = team.finalizacion;
  // Tiros reales del PDF. Datos en coordenadas de ataque (x 50 = medio campo → 100 = línea de gol,
  // y 0-100 de banda izquierda a derecha). El campo dibujado (viewBox 100×110) tiene la
  // portería arriba (y=5) y el medio campo abajo (y=105), con bandas en x=5 y x=95.
  const shotPoints: ShotPoint[] = (team.mapa_tiros ?? []).map((t, i) => ({
    id: `shot-${i}`,
    left: 5 + t.y * 0.9,
    top: ((5 + (100 - t.x) * 2) / 110) * 100,
    half: t.periodo === '1T' ? 1 : 2,
    isSetPiece: t.balon_parado,
    isGoal: !!t.gol,
  }));

  // Tiros por tramos de 15' a partir de la línea de tiempo del PDF
  const shotMinutes = team.minutos_tiros ?? [];
  const goalMinutes = (team.goles_porteria ?? []).map((g) => minuteValue(g.minuto));
  const buckets: [string, number, number][] = [
    ["0'-15'", 0, 15],
    ["15'-30'", 15, 30],
    ["30'-45'", 30, 45],
    ["45'-60'", 45, 60],
    ["60'-75'", 60, 75],
    ["75'-90'+", 75, Infinity],
  ];
  const intervals = buckets.map(([label, from, to]) => ({
    label,
    count: shotMinutes.filter((m) => m.minuto >= from && m.minuto < to).length,
    goals: goalMinutes.filter((m) => m >= from && m < to).length,
  }));

  // Eficacia a balón parado (barras de la zona de ataque del PDF)
  const abpStats = (team.eficacia_balon_parado ?? []).map((e) => ({
    label: SET_PIECE_LABELS[e.categoria] ?? e.categoria,
    success: e.exitosas,
    total: e.total,
  }));

  const shotColor = (isSetPiece: boolean) =>
    isHome ? (isSetPiece ? '#fbbfbf' : '#ee0000') : (isSetPiece ? '#bfbfe6' : '#000099');

  return (
    <div className="space-y-8 animate-fade-in text-gray-800 dark:text-gray-100">
      
      {/* Selector de Equipo */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
        <div>
          <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Crosshair className="text-red-500" size={18} />
            Estudio de Finalizaciones y Balón Parado (Studio Finalizzazioni)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Análisis exhaustivo del comportamiento ofensivo en definición, remates y ABP.
          </p>
        </div>

        <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-2xl">
          <button
            onClick={() => { setSelectedTeamKey('home'); setSelectedShot(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedTeamKey === 'home'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
            {homeTeam.nombre} ({homeTeam.finalizacion.tiros_totales} Tiros)
          </button>
          <button
            onClick={() => { setSelectedTeamKey('away'); setSelectedShot(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedTeamKey === 'away'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-300" />
            {awayTeam.nombre} ({awayTeam.finalizacion.tiros_totales} Tiros)
          </button>
        </div>
      </div>

      {/* 1. Resumen Superior (KPIs del Equipo) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm text-center space-y-1">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Tiros Totales</span>
          <span className="font-mono font-black text-2xl text-gray-900 dark:text-white">
            {fin.tiros_totales}
          </span>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm text-center space-y-1">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Tiros a Puerta</span>
          <span className="font-mono font-black text-2xl text-emerald-600 dark:text-emerald-400">
            {fin.tiros_a_puerta}
          </span>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm text-center space-y-1">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Goles Marcados</span>
          <span className="font-mono font-black text-2xl text-amber-500">
            {fin.goles}
          </span>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm text-center space-y-1">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Grandes Ocasiones</span>
          <span className="font-mono font-black text-2xl text-indigo-600 dark:text-indigo-400">
            {fin.ocasiones}
          </span>
        </div>
      </div>

      {/* 2. Línea Temporal de Tiros (en Quincenas de 15 Minutos) */}
      <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/10">
          <h4 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
            <Clock size={14} className="text-indigo-600" /> Evolución de los Tiros en el Tiempo (Andamento dei tiri)
          </h4>
          <span className="text-[11px] text-gray-400 font-bold">Distribución por quincenas</span>
        </div>

        {/* Timeline Bar */}
        <div className="relative bg-[#a7d7a9] rounded-2xl p-3 border-2 border-green-800/30 shadow-inner">
          <div className="grid grid-cols-6 divide-x divide-green-800/30 text-center">
            {intervals.map((iv, idx) => (
              <div key={idx} className="px-1 py-1.5 flex flex-col items-center justify-between min-h-[70px]">
                <span className="font-mono font-bold text-[10px] text-green-950">
                  {iv.label}
                </span>

                {/* Tiros en el intervalo */}
                <div className="flex items-center gap-1 my-1 flex-wrap justify-center">
                  {[...Array(iv.count)].map((_, sIdx) => (
                    <span
                      key={sIdx}
                      className={`w-2.5 h-2.5 rounded-full shadow-xs ${
                        sIdx === 0 && iv.goals > 0
                          ? 'bg-amber-400 border border-black scale-125'
                          : isHome
                          ? 'bg-red-600'
                          : 'bg-blue-600'
                      }`}
                      title="Remate"
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono font-black text-green-950">
                  <span>{iv.count} tiros</span>
                  {iv.goals > 0 && (
                    <span className="bg-amber-400 text-black px-1 rounded text-[9px] font-black">
                      ⚽ {iv.goals}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Gráficas de Desglose de Tiro (Cómo, Dónde, Remate y Éxito) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Cómo se llega al tiro */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
          <h4 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-white/10">
            Cómo se Llega al Tiro
          </h4>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-gray-600 dark:text-gray-300">En jugada</span>
                <span className="font-mono font-black text-red-600">{fin.llegada_jugada}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-red-600 h-full rounded-full" style={{ width: `${(fin.llegada_jugada / (fin.tiros_totales || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-gray-600 dark:text-gray-300">Indirecto ABP</span>
                <span className="font-mono font-black text-pink-500">{fin.llegada_abp_indirecto}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-pink-400 h-full rounded-full" style={{ width: `${(fin.llegada_abp_indirecto / (fin.tiros_totales || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-gray-600 dark:text-gray-300">Directo ABP</span>
                <span className="font-mono font-black text-pink-400">{fin.llegada_abp_directo}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-pink-300 h-full rounded-full" style={{ width: `${(fin.llegada_abp_directo / (fin.tiros_totales || 1)) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* De dónde se tira */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
          <h4 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-white/10">
            De Dónde se Tira
          </h4>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-gray-600 dark:text-gray-300">Área pequeña</span>
                <span className="font-mono font-black text-gray-700 dark:text-gray-300">{fin.zona_area_pequena}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(fin.zona_area_pequena / (fin.tiros_totales || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-gray-600 dark:text-gray-300">Área de penalti</span>
                <span className="font-mono font-black text-red-600">{fin.zona_area_penalti}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-red-600 h-full rounded-full" style={{ width: `${(fin.zona_area_penalti / (fin.tiros_totales || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-gray-600 dark:text-gray-300">Fuera del área</span>
                <span className="font-mono font-black text-red-500">{fin.zona_fuera_area}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-red-400 h-full rounded-full" style={{ width: `${(fin.zona_fuera_area / (fin.tiros_totales || 1)) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Cómo se remata */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
          <h4 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-white/10">
            Cómo se Remata
          </h4>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-gray-600 dark:text-gray-300">Con el pie</span>
                <span className="font-mono font-black text-red-600">{fin.remate_pie_raso}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-red-600 h-full rounded-full" style={{ width: `${(fin.remate_pie_raso / (fin.tiros_totales || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-gray-600 dark:text-gray-300">En acrobacia</span>
                <span className="font-mono font-black text-red-500">{fin.remate_acrobacia}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full rounded-full" style={{ width: `${(fin.remate_acrobacia / (fin.tiros_totales || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-gray-600 dark:text-gray-300">De cabeza</span>
                <span className="font-mono font-black text-red-400">{fin.remate_cabeza}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-red-400 h-full rounded-full" style={{ width: `${(fin.remate_cabeza / (fin.tiros_totales || 1)) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Éxito del tiro */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
          <h4 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-white/10">
            Éxito de las Conclusiones
          </h4>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-gray-600 dark:text-gray-300">A puerta</span>
                <span className="font-mono font-black text-emerald-600">{fin.resultado_a_puerta}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${(fin.resultado_a_puerta / (fin.tiros_totales || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-gray-600 dark:text-gray-300">Bloqueados / Desviados</span>
                <span className="font-mono font-black text-amber-500">{fin.resultado_bloqueado}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(fin.resultado_bloqueado / (fin.tiros_totales || 1)) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1">
                <span className="text-gray-600 dark:text-gray-300">Fuera de puerta</span>
                <span className="font-mono font-black text-rose-500">{fin.resultado_fuera}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(fin.resultado_fuera / (fin.tiros_totales || 1)) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Campograma de Tiros + Marco de Portería */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Campograma Vertical de Tiros */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/10">
            <h4 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
              <Target size={14} className="text-red-500" /> Ubicación Espacial de los Remates
            </h4>
            {/* Shapes legend */}
            <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-black inline-block" /> 1º Tiempo</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs border-2 border-black inline-block" /> 2º Tiempo</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Jugada</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-pink-300 inline-block" /> Balón Parado</span>
            </div>
          </div>

          {/* Half Pitch View */}
          <div className="relative w-full max-w-[420px] mx-auto aspect-[68/80] rounded-2xl overflow-hidden border-2 border-gray-400 dark:border-white/20 bg-[#a7d7a9] select-none shadow-inner">
            
            {/* SVG Markings */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 110" preserveAspectRatio="none">
              <rect x="5" y="5" width="90" height="100" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <rect x="22" y="5" width="56" height="34" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <rect x="36" y="5" width="28" height="12" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <circle cx="50" cy="24" r="0.8" fill="rgba(255,255,255,0.85)" />
              <path d="M 38 39 A 12 12 0 0 0 62 39" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <line x1="5" y1="105" x2="95" y2="105" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
              <circle cx="50" cy="105" r="14" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
            </svg>

            {/* Trademark */}
            <div className="absolute bottom-2 left-3 text-[10px] font-bold text-black pointer-events-none">
              ©Panini Digital
            </div>
            <div className="absolute bottom-2 right-3 font-black text-base text-black/80 pointer-events-none">
              Tiri
            </div>

            {/* Plotted Shot Points */}
            {shotPoints.map((s) => {
              const isSelected = selectedShot?.id === s.id;
              const is1T = s.half === 1;
              const bgColor = shotColor(s.isSetPiece);
              const size = s.isGoal ? 'w-5 h-5' : 'w-4 h-4';

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedShot(s)}
                  style={{
                    left: `${s.left}%`,
                    top: `${s.top}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute z-20 cursor-pointer transition-all duration-200 ${
                    isSelected ? 'scale-150 z-30' : 'hover:scale-125'
                  }`}
                  title={`${is1T ? '1º tiempo' : '2º tiempo'} · ${s.isSetPiece ? 'Balón parado' : 'Jugada'}${s.isGoal ? ' · Gol' : ''}`}
                >
                  <div
                    style={{ backgroundColor: bgColor }}
                    className={`${size} ${is1T ? 'rounded-full' : 'rounded-xs'} border-2 ${s.isGoal ? 'border-amber-400' : 'border-black'} shadow-md ${
                      isSelected ? 'ring-2 ring-yellow-400' : ''
                    }`}
                  />
                </div>
              );
            })}
          </div>
          {shotPoints.length === 0 && (
            <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">{MISSING_SPATIAL_DATA_MESSAGE}</p>
          )}
        </div>

        {/* Marco de Portería (Impacto de Goles) + Eficacia Balón Parado */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Marco de Portería */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
            <h4 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-white/10">
              Ubicación de los Goles en la Portería
            </h4>

            {/* 3D Goal Perspective Box */}
            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border-2 border-gray-300 dark:border-white/20 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-neutral-800 dark:to-neutral-900 select-none shadow-inner p-2 flex flex-col justify-end">
              
              {/* Goal Posts & Net SVG */}
              <svg className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] pointer-events-none" viewBox="0 0 160 90" preserveAspectRatio="none">
                {/* Grass Line at bottom */}
                <rect x="0" y="70" width="160" height="20" fill="#22c55e" />
                <line x1="0" y1="70" x2="160" y2="70" stroke="#15803d" strokeWidth="2" />

                {/* Net Grid */}
                <path
                  d="M 15 15 L 145 15 L 145 70 L 15 70 Z"
                  fill="none"
                  stroke="rgba(0,0,0,0.15)"
                  strokeWidth="1.5"
                />
                {[...Array(12)].map((_, i) => (
                  <line key={`v-${i}`} x1={25 + i * 10} y1="15" x2={25 + i * 10} y2="70" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
                ))}
                {[...Array(5)].map((_, i) => (
                  <line key={`h-${i}`} x1="15" y1={25 + i * 10} x2="145" y2={25 + i * 10} stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
                ))}

                {/* Main White Posts */}
                <rect x="15" y="15" width="130" height="55" fill="none" stroke="#ffffff" strokeWidth="4" rx="2" />
                <rect x="13" y="13" width="134" height="59" fill="none" stroke="#475569" strokeWidth="1" rx="2" />
              </svg>

              {/* Goles en la portería: posición y orden según el PDF */}
              {(team.goles_porteria ?? []).map((g) => (
                <div
                  key={`${g.orden}-${g.minuto}`}
                  className="absolute z-20 flex flex-col items-center"
                  style={{ left: `${g.x}%`, top: `${g.y}%`, transform: 'translate(-50%, -100%)' }}
                >
                  <div className="bg-white/90 dark:bg-black/80 backdrop-blur-sm border border-black/40 px-2 py-0.5 rounded text-[10px] font-black shadow-md whitespace-nowrap mb-1">
                    {g.minuto} {g.jugador}
                  </div>
                  <div
                    className="w-7 h-7 rounded-md border-2 border-black flex items-center justify-center font-mono font-black text-sm text-black shadow-lg"
                    style={{ backgroundColor: isHome ? '#fbbfbf' : '#bfbfe6' }}
                  >
                    {g.orden}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Eficacia de Balón Parado (Zona de Ataque) */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
            <h4 className="font-black text-xs uppercase tracking-wider text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-white/10">
              Eficacia a Balón Parado - Zona de Ataque
            </h4>

            <div className="space-y-2.5 text-xs">
              {abpStats.map((abp, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-gray-600 dark:text-gray-300 truncate max-w-[200px]">{abp.label}</span>
                    <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                      {abp.success} / {abp.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${abp.total > 0 ? (abp.success / abp.total) * 100 : 0}%` }}
                      className="bg-pink-400 h-full rounded-full transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
