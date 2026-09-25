import { useState } from 'react';
import { Activity, Zap } from 'lucide-react';
import type { PaniniEventMaps, PaniniMapEvent, PaniniSpatialCategory, PaniniTeamData } from '../../../types/paniniReport';
import { MISSING_SPATIAL_DATA_MESSAGE } from './paniniPitch';

interface Props {
  homeTeam: PaniniTeamData;
  awayTeam: PaniniTeamData;
}

type CategoryKey = keyof PaniniEventMaps;

/** Mapas de "Copertura territoriale" del PDF (pp. 6-7) */
const CATEGORIES: { key: CategoryKey; label: string; coverage: keyof PaniniTeamData }[] = [
  { key: 'regates', label: 'Regates', coverage: 'cobertura_regates' },
  { key: 'centros', label: 'Centros en jugada', coverage: 'cobertura_centros' },
  { key: 'pases_largos', label: 'Pases largos', coverage: 'cobertura_pases_largos' },
  { key: 'recuperaciones', label: 'Recuperaciones', coverage: 'cobertura_recuperaciones' },
  { key: 'faltas', label: 'Faltas cometidas', coverage: 'cobertura_faltas' },
  { key: 'acciones_utiles', label: 'Acciones útiles', coverage: 'cobertura_acciones_utiles' },
];

/** Resumen del Score (p. 3) para las categorías que lo tienen */
const summaryFor = (team: PaniniTeamData, key: CategoryKey) => {
  const t = team.estadisticas?.total_partido;
  if (!t) return '';
  if (key === 'regates') return t.regates_utiles ? `${t.regates_utiles} útiles` : '';
  if (key === 'centros') return t.centros_desde_fondo ? `${t.centros_desde_fondo} centros desde el fondo` : '';
  if (key === 'pases_largos') return t.pases_largos_utiles ? `${t.pases_largos_utiles} útiles` : '';
  return '';
};

interface SelectedPoint {
  team: string;
  point: PaniniMapEvent;
}

export default function PaniniDribblingCrossView({ homeTeam, awayTeam }: Props) {
  const [category, setCategory] = useState<CategoryKey>('regates');
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const current = CATEGORIES.find((c) => c.key === category)!;

  const renderPitchMap = (team: PaniniTeamData, isHome: boolean) => {
    const points = team.mapas_eventos?.[category] ?? [];
    const coverage = team[current.coverage] as PaniniSpatialCategory | undefined;
    const summary = summaryFor(team, category);

    return (
      <div className="flex-1 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-3 h-3 rounded-full shrink-0 ${isHome ? 'bg-red-600' : 'bg-blue-600'}`} />
            <span className={`font-black text-sm truncate ${isHome ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {team.nombre}
            </span>
          </div>
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 shrink-0">
            {points.length} acciones{summary ? ` · ${summary}` : ''}
          </span>
        </div>

        <div className="flex items-stretch gap-1.5">
          {/* Eje Y: reparto por bandas, calculado a partir de los puntos */}
          <div className="flex flex-col justify-between py-4 text-[10px] font-mono font-black text-gray-700 dark:text-gray-300 w-10 text-right shrink-0">
            <span title="Banda izquierda">{coverage?.izquierda_pct ?? 0}%</span>
            <span title="Centro">{coverage?.centro_pct ?? 0}%</span>
            <span title="Banda derecha">{coverage?.derecha_pct ?? 0}%</span>
          </div>

          {/* Campo horizontal: el equipo ataca hacia la derecha (como en el PDF) */}
          <div className="relative flex-1 aspect-[100/62] rounded-xl overflow-hidden border-2 border-gray-300 dark:border-white/20 bg-[#abdda4] select-none shadow-inner">
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 62" preserveAspectRatio="none">
              <rect x="2" y="2" width="96" height="58" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
              <line x1="50" y1="2" x2="50" y2="60" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
              <circle cx="50" cy="31" r="9" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
              <circle cx="50" cy="31" r="0.6" fill="rgba(255,255,255,0.9)" />
              <rect x="2" y="15" width="14" height="32" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
              <rect x="2" y="22" width="5" height="18" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
              <rect x="84" y="15" width="14" height="32" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
              <rect x="93" y="22" width="5" height="18" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
              {/* Tercios del campo */}
              <line x1="34" y1="2" x2="34" y2="60" stroke="rgba(0,0,0,0.15)" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
              <line x1="66" y1="2" x2="66" y2="60" stroke="rgba(0,0,0,0.15)" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
            </svg>

            <div className="absolute top-1.5 right-3 text-[10px] font-bold text-black/70 pointer-events-none">©Panini Digital</div>

            {points.map((pt, idx) => {
              const isSelected = selectedPoint?.point === pt;
              const color = isHome ? (pt.balon_parado ? '#fbbfbf' : '#ee0000') : (pt.balon_parado ? '#bfbfe6' : '#000099');
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setSelectedPoint({ team: team.nombre, point: pt })}
                  style={{
                    // Las líneas del campo van de 2 a 98 (ancho) y de 2 a 60 sobre 62 (alto)
                    left: `${2 + pt.x * 0.96}%`,
                    top: `${((2 + pt.y * 0.58) / 62) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute z-20 cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-150 z-30' : 'hover:scale-125'}`}
                  title={`${pt.periodo === '1T' ? '1º tiempo' : pt.periodo === '2T' ? '2º tiempo' : 'Prórroga'}${pt.balon_parado ? ' · balón parado' : ''}`}
                >
                  <span
                    style={{ backgroundColor: color }}
                    className={`block w-2.5 h-2.5 sm:w-3 sm:h-3 border border-black/60 shadow-sm ${pt.periodo === '1T' ? 'rounded-full' : 'rounded-[2px]'} ${
                      isSelected ? 'ring-2 ring-yellow-400' : ''
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Eje X: reparto por tercios (del PDF) */}
        <div className="flex justify-between items-center pl-12 pr-4 text-[10px] font-mono font-black text-gray-700 dark:text-gray-300">
          <span><span className="text-gray-400 uppercase text-[9px]">Def:</span> {coverage?.defensa_pct ?? 0}%</span>
          <span><span className="text-gray-400 uppercase text-[9px]">Med:</span> {coverage?.medio_pct ?? 0}%</span>
          <span><span className="text-gray-400 uppercase text-[9px]">Atq:</span> {coverage?.ataque_pct ?? 0}%</span>
        </div>
      </div>
    );
  };

  const hasData = !!(homeTeam.mapas_eventos || awayTeam.mapas_eventos);

  return (
    <div className="space-y-6 animate-fade-in text-gray-800 dark:text-gray-100">
      {/* Cabecera y leyenda */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="text-amber-500" size={18} />
            Cobertura territorial (Copertura territoriale)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Dónde realizó cada equipo cada acción. Ambos equipos atacan hacia la derecha.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold bg-gray-50 dark:bg-neutral-800 px-3 py-1.5 rounded-2xl border border-gray-200 dark:border-white/10">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-gray-700 dark:bg-gray-300 rounded-full inline-block" /> 1º tiempo</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-gray-700 dark:bg-gray-300 rounded-[2px] inline-block" /> 2º tiempo</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#fbbfbf] border border-black/40 rounded-full inline-block" /> Balón parado (tono claro)</span>
        </div>
      </div>

      {/* Selector de categoría */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => { setCategory(c.key); setSelectedPoint(null); }}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              category === c.key
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">{MISSING_SPATIAL_DATA_MESSAGE}</p>
      ) : (
        <div className="space-y-3">
          <h4 className="font-black text-sm uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-white/10">
            <Activity className="text-indigo-600" size={16} /> {current.label}
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderPitchMap(homeTeam, true)}
            {renderPitchMap(awayTeam, false)}
          </div>
        </div>
      )}

      {selectedPoint && (
        <div className="p-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl flex items-center justify-between gap-3 max-w-md mx-auto shadow-md border border-white/10 text-xs animate-scale-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
            <span className="font-bold truncate">{selectedPoint.team} · {current.label}</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase bg-white/10 border border-white/20 shrink-0">
            {selectedPoint.point.periodo === '1T' ? '1º tiempo' : selectedPoint.point.periodo === '2T' ? '2º tiempo' : 'Prórroga'}
            {selectedPoint.point.balon_parado ? ' · ABP' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
