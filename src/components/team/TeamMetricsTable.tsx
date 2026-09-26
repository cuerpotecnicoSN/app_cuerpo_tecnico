import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Home, Plane } from 'lucide-react';
import type { SeasonPaniniEntry } from '../../services/paniniReports';
import {
  METRIC_BLOCKS,
  TRAMO_SIZE,
  chunk,
  deviationColor,
  formatValue,
  isLeagueMatch,
  matchdayLabel,
  mean,
  opponentLogo,
  summarize,
} from '../../utils/teamPaniniMetrics';

interface Props {
  entries: SeasonPaniniEntry[];
}

type Column =
  | { kind: 'match'; entry: SeasonPaniniEntry; index: number }
  | { kind: 'tramo'; entries: SeasonPaniniEntry[]; label: string; range: string };

const OpponentCrest: React.FC<{ entry: SeasonPaniniEntry }> = ({ entry }) => {
  const logo = opponentLogo(entry);
  const name = entry.rival.nombre || entry.match.opponent;
  return logo ? (
    <img src={logo} alt={name} title={name} className="w-8 h-8 object-contain drop-shadow-sm" />
  ) : (
    <div title={name} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-[10px] font-black uppercase">
      {name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3)}
    </div>
  );
};

const ResultBadge: React.FC<{ entry: SeasonPaniniEntry }> = ({ entry }) => {
  const { t } = useTranslation();
  const our = Number(entry.our.goles ?? 0);
  const rival = Number(entry.rival.goles ?? 0);
  const isWin = our > rival;
  const isLoss = our < rival;

  const colorClass = isWin
    ? 'bg-emerald-600 text-white ring-1 ring-emerald-600/30'
    : isLoss
      ? 'bg-[#db0030] text-white ring-1 ring-[#db0030]/30'
      : 'bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950 ring-1 ring-neutral-900/40';

  const label = isWin
    ? t('teamReport.table.win', 'Victoria')
    : isLoss
      ? t('teamReport.table.loss', 'Derrota')
      : t('teamReport.table.draw', 'Empate');

  return (
    <span
      title={`${label}: ${entry.our.goles} - ${entry.rival.goles}`}
      className={`px-2 py-0.5 rounded-md text-[11px] font-black tabular-nums tracking-tight shadow-xs transition-transform hover:scale-105 select-none ${colorClass}`}
    >
      {entry.our.goles}–{entry.rival.goles}
    </span>
  );
};

const TeamMetricsTable: React.FC<Props> = ({ entries }) => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const columns = useMemo<Column[]>(() => {
    const cols: Column[] = [];
    chunk(entries, TRAMO_SIZE).forEach((group, gi) => {
      group.forEach((entry, i) => cols.push({ kind: 'match', entry, index: gi * TRAMO_SIZE + i }));
      const first = matchdayLabel(group[0], gi * TRAMO_SIZE);
      const last = matchdayLabel(group[group.length - 1], gi * TRAMO_SIZE + group.length - 1);
      cols.push({
        kind: 'tramo',
        entries: group,
        label: t('teamReport.table.tramo', { n: gi + 1 }),
        range: group.length > 1 ? `${first}–${last}` : first,
      });
    });
    return cols;
  }, [entries, t]);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl ring-1 ring-gray-200/80 dark:ring-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.15)] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
            {t('teamReport.table.title', 'Acumulado por jornada')}
          </h2>
          <p className="text-xs text-gray-500">
            {t('teamReport.table.subtitle', { n: TRAMO_SIZE })}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/60" /> {t('teamReport.table.betterThanMean', 'Mejor que la media')}</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#db0030]/60" /> {t('teamReport.table.worseThanMean', 'Peor que la media')}</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 dark:bg-neutral-700" /> {t('teamReport.table.noRating', 'Sin valoración')}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-white dark:bg-neutral-900 w-[220px] min-w-[220px] max-w-[220px] px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-white/10">
                {t('teamReport.table.metric', 'Métrica')}
              </th>
              <th className="sticky left-[220px] z-20 bg-gray-900 text-white min-w-[84px] px-3 py-3 text-center border-b border-gray-900 shadow-[4px_0_12px_-6px_rgba(0,0,0,0.3)]">
                <div className="text-[11px] font-black uppercase tracking-wider">{t('teamReport.table.mean', 'Media')}</div>
                <div className="text-[10px] font-semibold text-gray-400">{entries.length} PJ</div>
              </th>
              {columns.map((col) =>
                col.kind === 'match' ? (
                  <th key={col.entry.match.id} className="min-w-[78px] px-2 py-2.5 border-b border-gray-100 dark:border-white/10 align-bottom">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        title={[col.entry.match.competition, col.entry.match.date].filter(Boolean).join(' · ')}
                        className={`text-[11px] font-black ${isLeagueMatch(col.entry) ? 'text-gray-900 dark:text-white' : 'text-amber-600 dark:text-amber-400'}`}
                      >
                        {matchdayLabel(col.entry, col.index)}
                      </span>
                      <OpponentCrest entry={col.entry} />
                      <span
                        title={col.entry.isHome ? t('teamReport.page.venues.home', 'Local') : t('teamReport.page.venues.away', 'Visitante')}
                        className={`flex items-center gap-1 text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                          col.entry.isHome
                            ? 'bg-[#db0030]/10 text-[#db0030]'
                            : 'bg-gray-900/5 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {col.entry.isHome ? <Home size={10} strokeWidth={3} /> : <Plane size={10} strokeWidth={3} />}
                        {col.entry.isHome ? t('teamReport.pdf.home', 'L') : t('teamReport.pdf.away', 'V')}
                      </span>
                      <ResultBadge entry={col.entry} />
                    </div>
                  </th>
                ) : (
                  <th key={col.label} className="min-w-[84px] px-2 py-2.5 bg-indigo-50/70 dark:bg-indigo-500/10 border-b border-indigo-100 dark:border-indigo-500/20 border-x border-x-indigo-100 dark:border-x-indigo-500/20 align-bottom">
                    <div className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">{col.label}</div>
                    <div className="text-[10px] font-semibold text-indigo-500/80">{col.range}</div>
                  </th>
                ),
              )}
            </tr>
          </thead>

          {METRIC_BLOCKS.map((block) => {
            const isCollapsed = collapsed[block.key];
            const blockLabel = t(`teamReport.blocks.${block.key}`, block.label);
            return (
              <tbody key={block.key}>
                <tr>
                  <td colSpan={2} className="sticky left-0 z-10 bg-gray-50 dark:bg-neutral-800/80 p-0 border-b border-gray-100 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setCollapsed((c) => ({ ...c, [block.key]: !c[block.key] }))}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
                    >
                      <ChevronDown size={14} strokeWidth={3} className={`text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                      <span className="w-1 h-4 rounded-full bg-[#db0030]" />
                      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-700 dark:text-gray-200">{blockLabel}</span>
                      <span className="text-[10px] font-bold text-gray-400">{block.metrics.length}</span>
                    </button>
                  </td>
                  <td colSpan={columns.length} className="bg-gray-50 dark:bg-neutral-800/80 border-b border-gray-100 dark:border-white/10" />
                </tr>

                {!isCollapsed && block.metrics.map((metric) => {
                  const values = entries.map(metric.get);
                  const s = summarize(values);
                  const metricLabel = t(`teamReport.metrics.${metric.key}`, metric.label);
                  return (
                    <tr key={metric.key} className="group">
                      <td className="sticky left-0 z-10 bg-white dark:bg-neutral-900 group-hover:bg-gray-50 dark:group-hover:bg-neutral-800 w-[220px] min-w-[220px] max-w-[220px] px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-white/5 whitespace-nowrap truncate" title={metricLabel}>
                        {metricLabel}
                        {metric.better === 'low' && <span className="ml-1.5 text-[9px] font-black text-gray-400 uppercase" title={t('teamReport.pdf.lowerBetter', 'Menos es mejor')}>↓ {t('teamReport.pdf.lowerBetter', 'mejor')}</span>}
                      </td>
                      <td className="sticky left-[220px] z-10 bg-gray-900 text-white px-3 py-2 text-center font-black tabular-nums border-b border-gray-800 shadow-[4px_0_12px_-6px_rgba(0,0,0,0.3)]">
                        {formatValue(s.mean, metric)}
                      </td>
                      {columns.map((col) => {
                        if (col.kind === 'match') {
                          const v = values[col.index];
                          return (
                            <td
                              key={col.entry.match.id}
                              className="px-2 py-2 text-center tabular-nums font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-white/5"
                              style={{ backgroundColor: deviationColor(v, s, metric.better) }}
                            >
                              {formatValue(v, metric)}
                            </td>
                          );
                        }
                        const tv = mean(col.entries.map(metric.get));
                        return (
                          <td
                            key={col.label}
                            className="px-2 py-2 text-center tabular-nums font-black text-gray-900 dark:text-white border-b border-indigo-100 dark:border-indigo-500/20 border-x border-x-indigo-100 dark:border-x-indigo-500/20"
                            style={{ backgroundColor: deviationColor(tv, s, metric.better) ?? 'rgba(99, 102, 241, 0.06)' }}
                          >
                            {formatValue(tv, metric)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
};

export default TeamMetricsTable;
