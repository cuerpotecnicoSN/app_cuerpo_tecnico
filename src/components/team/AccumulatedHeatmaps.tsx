import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, 
  Zap, 
  Share2, 
  Sparkles, 
  Crosshair, 
  AlertTriangle,
  Calendar,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import type { SeasonPaniniEntry } from '../../services/paniniReports';
import { accumulatedGrid, matchdayLabel, type CoverageKey } from '../../utils/teamPaniniMetrics';

interface Props {
  entries: SeasonPaniniEntry[];
}

interface ActionConfig {
  key: CoverageKey;
  icon: LucideIcon;
  accentColor: string;
}

const ACTIONS: ActionConfig[] = [
  { key: 'cobertura_recuperaciones', icon: ShieldCheck, accentColor: '#10b981' },
  { key: 'cobertura_acciones_utiles', icon: Zap, accentColor: '#3b82f6' },
  { key: 'cobertura_pases_largos', icon: Share2, accentColor: '#8b5cf6' },
  { key: 'cobertura_regates', icon: Sparkles, accentColor: '#ec4899' },
  { key: 'cobertura_centros', icon: Crosshair, accentColor: '#f59e0b' },
  { key: 'cobertura_faltas', icon: AlertTriangle, accentColor: '#ef4444' },
];

// Campo horizontal 105x68, atacando hacia la derecha
const W = 105;
const H = 68;

const PitchLines: React.FC = () => (
  <g fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={0.35}>
    <rect x={0.5} y={0.5} width={W - 1} height={H - 1} />
    <line x1={W / 2} y1={0.5} x2={W / 2} y2={H - 0.5} />
    <circle cx={W / 2} cy={H / 2} r={9.15} />
    <circle cx={W / 2} cy={H / 2} r={0.5} fill="rgba(255,255,255,0.55)" />
    <rect x={0.5} y={H / 2 - 20.16} width={16.5} height={40.32} />
    <rect x={0.5} y={H / 2 - 9.16} width={5.5} height={18.32} />
    <rect x={W - 17} y={H / 2 - 20.16} width={16.5} height={40.32} />
    <rect x={W - 6} y={H / 2 - 9.16} width={5.5} height={18.32} />
    <path d={`M 17 ${H / 2 - 7.3} A 9.15 9.15 0 0 1 17 ${H / 2 + 7.3}`} />
    <path d={`M ${W - 17} ${H / 2 - 7.3} A 9.15 9.15 0 0 0 ${W - 17} ${H / 2 + 7.3}`} />
  </g>
);

interface SinglePitchCardProps {
  grid: number[][];
  side: 'our' | 'rival';
  title: string;
  subtitle: string;
  badge: string;
  isGeneral?: boolean;
  matches: number;
}

const SinglePitchCard: React.FC<SinglePitchCardProps> = ({
  grid,
  side,
  title,
  subtitle,
  badge,
  isGeneral,
  matches,
}) => {
  const { t } = useTranslation();
  const max = grid.length ? Math.max(...grid.flat(), 1) : 1;
  const rgb = side === 'our' ? '219, 0, 48' : '250, 204, 21';
  const cw = W / 3;
  const ch = H / 3;

  const cols = [
    t('teamReport.heatmaps.cols.defense', 'Defensa'),
    t('teamReport.heatmaps.cols.middle', 'Medio'),
    t('teamReport.heatmaps.cols.attack', 'Ataque'),
  ];

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl p-3 transition-all ${
        isGeneral
          ? 'bg-red-50/40 dark:bg-neutral-800/90 ring-2 ring-[#db0030]/60 dark:ring-[#db0030]/70 shadow-md'
          : 'bg-white dark:bg-neutral-900 ring-1 ring-gray-200/80 dark:ring-white/10 shadow-xs'
      }`}
    >
      {/* Cabecera del campograma individual */}
      <div className="flex items-start justify-between gap-1 mb-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isGeneral
                  ? 'bg-[#db0030] text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {badge}
            </span>
            <span className="text-xs font-black text-gray-900 dark:text-white truncate">{title}</span>
          </div>
          <div className="text-[10px] font-bold text-gray-400 mt-0.5">{subtitle}</div>
        </div>
        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 tabular-nums shrink-0">
          {t('teamReport.heatmaps.pj', { count: matches })}
        </span>
      </div>

      {/* SVG del Campo con mapa de calor */}
      {grid.length && matches > 0 ? (
        <div className="w-full">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl overflow-hidden block shadow-inner bg-[#14532d]">
            <defs>
              <linearGradient id={`grass-${title.replace(/\s+/g, '-')}`} x1="0" x2="1">
                <stop offset="0" stopColor="#14532d" />
                <stop offset="1" stopColor="#166534" />
              </linearGradient>
              <filter id={`blur-${title.replace(/\s+/g, '-')}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.2" />
              </filter>
            </defs>
            <rect width={W} height={H} fill={`url(#grass-${title.replace(/\s+/g, '-')})`} />
            {[...Array(10)].map((_, i) => (
              <rect
                key={i}
                x={(W / 10) * i}
                y={0}
                width={W / 10}
                height={H}
                fill={i % 2 ? 'rgba(255,255,255,0.03)' : 'transparent'}
              />
            ))}
            <g filter={`url(#blur-${title.replace(/\s+/g, '-')})`}>
              {grid.map((row, r) =>
                row.map((v, c) => (
                  <rect
                    key={`${r}-${c}`}
                    x={c * cw}
                    y={r * ch}
                    width={cw}
                    height={ch}
                    fill={`rgba(${rgb}, ${(0.08 + (v / max) * 0.82).toFixed(2)})`}
                  />
                )),
              )}
            </g>
            {[1, 2].map((i) => (
              <React.Fragment key={i}>
                <line
                  x1={cw * i}
                  y1={0}
                  x2={cw * i}
                  y2={H}
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={0.3}
                  strokeDasharray="1.5 1.5"
                />
                <line
                  x1={0}
                  y1={ch * i}
                  x2={W}
                  y2={ch * i}
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={0.3}
                  strokeDasharray="1.5 1.5"
                />
              </React.Fragment>
            ))}
            <PitchLines />
            {grid.map((row, r) =>
              row.map((v, c) => {
                const isMax = v === max && v > 0;
                return (
                  <text
                    key={`t-${r}-${c}`}
                    x={c * cw + cw / 2}
                    y={r * ch + ch / 2 + 1.8}
                    textAnchor="middle"
                    fontSize={isMax ? 6.2 : 5.2}
                    fontWeight={900}
                    fill={isMax ? '#ffffff' : 'rgba(255,255,255,0.95)'}
                    style={{
                      paintOrder: 'stroke',
                      stroke: 'rgba(0,0,0,0.65)',
                      strokeWidth: isMax ? 1.0 : 0.8,
                    }}
                  >
                    {v.toFixed(0)}%
                  </text>
                );
              }),
            )}
            {/* Flecha indicadora de ataque */}
            <path d={`M ${W - 13} ${H - 3.5} L ${W - 4.5} ${H - 3.5}`} stroke="#fff" strokeWidth={0.55} />
            <path d={`M ${W - 6.5} ${H - 5} L ${W - 4.5} ${H - 3.5} L ${W - 6.5} ${H - 2}`} fill="none" stroke="#fff" strokeWidth={0.55} />
          </svg>
        </div>
      ) : (
        <div className="aspect-[105/68] rounded-xl bg-gray-100 dark:bg-neutral-800/60 flex flex-col items-center justify-center p-3 text-center">
          <Calendar size={18} className="text-gray-400 mb-1" />
          <span className="text-[11px] font-bold text-gray-400">{t('teamReport.heatmaps.noMatchesInTramo', 'Sin partidos en este tramo')}</span>
        </div>
      )}

      {/* Etiquetas de carriles/tercios inferiores */}
      <div className="grid grid-cols-3 mt-2 text-[9px] font-black uppercase tracking-wider text-gray-400 text-center">
        {cols.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
    </div>
  );
};

export interface TramoData {
  index: 1 | 2 | 3;
  name: string;
  label: string;
  matchCount: number;
  entries: SeasonPaniniEntry[];
}

/**
 * Divide la lista de partidos ordenados en 3 tramos proporcionales
 */
function partitionIntoThreeTramos(entries: SeasonPaniniEntry[], t: (key: string, opts?: any) => string): TramoData[] {
  const n = entries.length;
  if (n === 0) {
    return [
      { index: 1, name: t('teamReport.heatmaps.tramo1', 'Tramo 1 (Inicio)'), label: '0 PJ', matchCount: 0, entries: [] },
      { index: 2, name: t('teamReport.heatmaps.tramo2', 'Tramo 2 (Medio)'), label: '0 PJ', matchCount: 0, entries: [] },
      { index: 3, name: t('teamReport.heatmaps.tramo3', 'Tramo 3 (Reciente)'), label: '0 PJ', matchCount: 0, entries: [] },
    ];
  }

  const base = Math.floor(n / 3);
  const rem = n % 3;
  let s1 = base;
  let s2 = base;
  let s3 = base;

  if (rem === 1) {
    s2 += 1;
  } else if (rem === 2) {
    s1 += 1;
    s3 += 1;
  }

  if (n === 1) {
    s1 = 1; s2 = 0; s3 = 0;
  } else if (n === 2) {
    s1 = 1; s2 = 0; s3 = 1;
  }

  const t1 = entries.slice(0, s1);
  const t2 = entries.slice(s1, s1 + s2);
  const t3 = entries.slice(s1 + s2);

  const getTramoLabel = (slice: SeasonPaniniEntry[], startIdx: number) => {
    if (!slice.length) return t('teamReport.heatmaps.noMatchesInTramo', 'Sin partidos');
    const firstLabel = matchdayLabel(slice[0], startIdx);
    const lastLabel = matchdayLabel(slice[slice.length - 1], startIdx + slice.length - 1);
    const countStr = t('teamReport.heatmaps.pj', { count: slice.length });
    if (slice.length === 1 || firstLabel === lastLabel) {
      return `${firstLabel} (${countStr})`;
    }
    return `${firstLabel} - ${lastLabel} (${countStr})`;
  };

  return [
    { index: 1, name: t('teamReport.heatmaps.tramo1', 'Tramo 1 (Inicio)'), label: getTramoLabel(t1, 0), matchCount: t1.length, entries: t1 },
    { index: 2, name: t('teamReport.heatmaps.tramo2', 'Tramo 2 (Medio)'), label: getTramoLabel(t2, s1), matchCount: t2.length, entries: t2 },
    { index: 3, name: t('teamReport.heatmaps.tramo3', 'Tramo 3 (Reciente)'), label: getTramoLabel(t3, s1 + s2), matchCount: t3.length, entries: t3 },
  ];
}

export const AccumulatedHeatmaps: React.FC<Props> = ({ entries }) => {
  const { t } = useTranslation();
  const [side, setSide] = useState<'our' | 'rival'>('our');
  const [selectedActionKey, setSelectedActionKey] = useState<string>('all');

  const cols = useMemo(() => [
    t('teamReport.heatmaps.cols.defense', 'Defensa'),
    t('teamReport.heatmaps.cols.middle', 'Medio'),
    t('teamReport.heatmaps.cols.attack', 'Ataque'),
  ], [t]);

  const rows = useMemo(() => [
    t('teamReport.heatmaps.rows.left', 'Izq'),
    t('teamReport.heatmaps.rows.center', 'Centro'),
    t('teamReport.heatmaps.rows.right', 'Dcha'),
  ], [t]);

  // Calcular la partición en 3 tramos de la temporada
  const tramos = useMemo(() => partitionIntoThreeTramos(entries, t), [entries, t]);

  const visibleActions = useMemo(() => {
    if (selectedActionKey === 'all') return ACTIONS;
    return ACTIONS.filter((a) => a.key === selectedActionKey);
  }, [selectedActionKey]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra de cabecera con switch de equipo y selector de acción */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-3xl ring-1 ring-gray-200/80 dark:ring-white/10 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#db0030]">
              <Layers size={16} strokeWidth={2.4} />
            </span>
            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase">
              {t('teamReport.heatmaps.title', 'Campogramas Acumulados y Evolución por Tramos')}
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t('teamReport.heatmaps.subtitle', 'Distribución territorial por zonas (% medio en 3×3). Campograma general comparado con los 3 tramos de la temporada.')}
          </p>
        </div>

        {/* Controles: Nuestro Equipo / Rivales y Filtro de Acciones */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Switch de equipo */}
          <div className="flex p-1 rounded-xl bg-gray-100 dark:bg-neutral-800 ring-1 ring-gray-200/60 dark:ring-white/10 text-xs font-bold">
            {([
              ['our', t('teamReport.heatmaps.ourTeam', 'Nuestro equipo')],
              ['rival', t('teamReport.heatmaps.rivals', 'Rivales')],
            ] as const).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSide(k)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                  side === k
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Filtro por acción */}
          <select
            value={selectedActionKey}
            onChange={(e) => setSelectedActionKey(e.target.value)}
            className="!rounded-xl !py-1.5 !px-3 text-xs font-bold bg-gray-50 dark:!bg-neutral-800 dark:!text-white border-gray-200 dark:border-white/10 shadow-xs"
            aria-label="Filtrar por acción"
          >
            <option value="all">{t('teamReport.heatmaps.allMetrics', { count: ACTIONS.length })}</option>
            {ACTIONS.map((a) => (
              <option key={a.key} value={a.key}>
                {t(`teamReport.heatmaps.actions.${a.key}.label`, a.key)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de bloques por cada métrica / acción */}
      <div className="space-y-6">
        {visibleActions.map((action) => {
          const generalGrid = accumulatedGrid(entries, action.key, side);
          const Icon = action.icon;
          const actionLabel = t(`teamReport.heatmaps.actions.${action.key}.label`, action.key);
          const actionDesc = t(`teamReport.heatmaps.actions.${action.key}.desc`, '');

          // Zona dominante en el general
          let dominantZoneText = '';
          if (generalGrid.length) {
            let maxVal = -1;
            let maxR = 0;
            let maxC = 0;
            generalGrid.forEach((row, r) => {
              row.forEach((v, c) => {
                if (v > maxVal) {
                  maxVal = v;
                  maxR = r;
                  maxC = c;
                }
              });
            });
            dominantZoneText = `${cols[maxC]} · ${rows[maxR]} (${maxVal.toFixed(0)}%)`;
          }

          return (
            <div
              key={action.key}
              className="bg-white dark:bg-neutral-900 rounded-3xl ring-1 ring-gray-200/80 dark:ring-white/10 p-5 shadow-sm space-y-4"
            >
              {/* Título y descripción de la acción */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex items-center justify-center w-8 h-8 rounded-xl text-white shadow-xs"
                    style={{ backgroundColor: action.accentColor }}
                  >
                    <Icon size={16} strokeWidth={2.4} />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                      {actionLabel}
                    </h3>
                    {actionDesc && <p className="text-[11px] text-gray-500">{actionDesc}</p>}
                  </div>
                </div>

                {dominantZoneText && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-50 dark:bg-neutral-800 text-[11px] font-bold text-gray-600 dark:text-gray-300 ring-1 ring-gray-200/60 dark:ring-white/10">
                    <span className="text-gray-400">{t('teamReport.heatmaps.dominantZone', 'Zona predominante:')}</span>
                    <span className="font-black text-gray-900 dark:text-white">{dominantZoneText}</span>
                  </div>
                )}
              </div>

              {/* Grid con 4 campogramas: General + 3 Tramos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Campograma General */}
                <SinglePitchCard
                  grid={generalGrid}
                  side={side}
                  title={t('teamReport.heatmaps.general', 'General')}
                  subtitle={t('teamReport.heatmaps.allSeason', 'Toda la temporada')}
                  badge={t('teamReport.heatmaps.global', 'Global')}
                  isGeneral={true}
                  matches={entries.length}
                />

                {/* 2, 3, 4. Campogramas de los 3 tramos */}
                {tramos.map((tr) => (
                  <SinglePitchCard
                    key={tr.index}
                    grid={accumulatedGrid(tr.entries, action.key, side)}
                    side={side}
                    title={tr.name}
                    subtitle={tr.label}
                    badge={t('teamReport.heatmaps.tramoBadge', { n: tr.index })}
                    isGeneral={false}
                    matches={tr.matchCount}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AccumulatedHeatmaps;
