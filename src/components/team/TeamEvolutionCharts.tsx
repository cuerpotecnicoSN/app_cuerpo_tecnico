import React, { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SeasonPaniniEntry } from '../../services/paniniReports';
import {
  METRIC_BLOCKS,
  TRAMO_SIZE,
  formatValue,
  matchdayLabel,
  metricByKey,
  rollingMean,
  summarize,
  type MetricDef,
} from '../../utils/teamPaniniMetrics';

interface Props {
  entries: SeasonPaniniEntry[];
}

const FEATURED = ['pos', 'pass_acc', 'press_h', 'barycenter', 'shots', 'r_chances'];

const GREEN = '#10b981';
const RED = '#db0030';
const NEUTRAL = '#6366f1';

const axisTick = { fontSize: 11, fill: '#9ca3af', fontWeight: 600 };

const buildSeries = (entries: SeasonPaniniEntry[], metric: MetricDef) => {
  const values = entries.map(metric.get);
  const rolling = rollingMean(values);
  const s = summarize(values);
  const data = entries.map((e, i) => ({
    label: matchdayLabel(e, i),
    rival: e.rival.nombre || e.match.opponent,
    venue: e.isHome ? 'L' : 'V',
    value: values[i],
    rolling: rolling[i],
  }));
  return { data, s };
};

const barColor = (v: number | null, m: number | null, metric: MetricDef) => {
  if (v === null || m === null || metric.better === 'neutral') return NEUTRAL;
  const above = v >= m;
  return (metric.better === 'high') === above ? GREEN : RED;
};

const ChartTooltip: React.FC<{ active?: boolean; payload?: any[]; metric: MetricDef }> = ({ active, payload, metric }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-gray-900/95 backdrop-blur text-white rounded-xl px-3 py-2 shadow-xl text-xs">
      <div className="font-black">{p.label} · {p.venue === 'L' ? 'vs' : '@'} {p.rival}</div>
      <div className="mt-1 flex justify-between gap-4"><span className="text-gray-400">Valor</span><span className="font-bold tabular-nums">{formatValue(p.value, metric)}</span></div>
      <div className="flex justify-between gap-4"><span className="text-gray-400">Media {TRAMO_SIZE}P</span><span className="font-bold tabular-nums">{formatValue(p.rolling, metric)}</span></div>
    </div>
  );
};

const MetricChart: React.FC<{ entries: SeasonPaniniEntry[]; metric: MetricDef; height: number; compact?: boolean }> = ({ entries, metric, height, compact }) => {
  const { data, s } = useMemo(() => buildSeries(entries, metric), [entries, metric]);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: compact ? -24 : -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.2} vertical={false} />
        <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} domain={['auto', 'auto']} />
        <Tooltip content={<ChartTooltip metric={metric} />} cursor={{ fill: 'rgba(156,163,175,0.12)' }} />
        {!compact && <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />}
        {s.mean !== null && (
          <ReferenceLine
            y={s.mean}
            stroke="#111827"
            strokeOpacity={0.5}
            strokeDasharray="6 4"
            label={compact ? undefined : { value: `Media ${formatValue(s.mean, metric)}`, position: 'insideTopRight', fontSize: 11, fontWeight: 800, fill: '#6b7280' }}
          />
        )}
        <Bar dataKey="value" name="Por jornada" radius={[6, 6, 0, 0]} maxBarSize={36}>
          {data.map((d) => (
            <Cell key={d.label} fill={barColor(d.value, s.mean, metric)} fillOpacity={0.85} />
          ))}
        </Bar>
        <Line
          dataKey="rolling"
          name={`Media móvil ${TRAMO_SIZE} partidos`}
          type="monotone"
          stroke="#111827"
          strokeWidth={2.5}
          dot={{ r: compact ? 0 : 3, fill: '#111827' }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

const XgDuelChart: React.FC<{ entries: SeasonPaniniEntry[] }> = ({ entries }) => {
  const data = entries.map((e, i) => ({
    label: matchdayLabel(e, i),
    xgf: e.our.xg ?? null,
    xgc: e.rival.xg ?? null,
    gf: e.our.goles ?? null,
    gc: e.rival.goles ?? null,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.2} vertical={false} />
        <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={{ background: 'rgba(17,24,39,0.95)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }}
          labelStyle={{ fontWeight: 900 }}
          formatter={(v: any) => (typeof v === 'number' ? v.toFixed(2).replace(/\.00$/, '') : v)}
        />
        <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
        <Bar dataKey="gf" name="Goles a favor" fill={RED} radius={[6, 6, 0, 0]} maxBarSize={18} />
        <Bar dataKey="gc" name="Goles en contra" fill="#111827" radius={[6, 6, 0, 0]} maxBarSize={18} />
        <Line dataKey="xgf" name="xG a favor" type="monotone" stroke={RED} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
        <Line dataKey="xgc" name="xG en contra" type="monotone" stroke="#6b7280" strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

const card = 'bg-white dark:bg-neutral-900 rounded-3xl ring-1 ring-gray-200/80 dark:ring-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.15)]';

const TeamEvolutionCharts: React.FC<Props> = ({ entries }) => {
  const [selected, setSelected] = useState('pos');
  const metric = metricByKey(selected) ?? METRIC_BLOCKS[0].metrics[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className={`${card} p-5 xl:col-span-3`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Evolución por jornada</h3>
              <p className="text-xs text-gray-500">Barras verdes/rojas respecto a la media · línea: media móvil de {TRAMO_SIZE} partidos</p>
            </div>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="!rounded-xl !py-2 !px-3 text-sm font-bold dark:!bg-neutral-800 dark:!text-white dark:!border-white/10"
            >
              {METRIC_BLOCKS.map((b) => (
                <optgroup key={b.key} label={b.label}>
                  {b.metrics.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <MetricChart entries={entries} metric={metric} height={300} />
        </div>

        <div className={`${card} p-5 xl:col-span-2`}>
          <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Goles vs xG</h3>
          <p className="text-xs text-gray-500 mb-3">Rendimiento real frente a esperado, a favor y en contra</p>
          <XgDuelChart entries={entries} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {FEATURED.map((key) => {
          const m = metricByKey(key);
          if (!m) return null;
          const s = summarize(entries.map(m.get));
          const active = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={`${card} p-4 text-left transition-all hover:-translate-y-0.5 ${active ? '!ring-2 !ring-[#db0030]' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-gray-500">{m.label}</span>
                <span className="text-lg font-black text-gray-900 dark:text-white tabular-nums">{formatValue(s.mean, m)}</span>
              </div>
              <MetricChart entries={entries} metric={m} height={130} compact />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TeamEvolutionCharts;
