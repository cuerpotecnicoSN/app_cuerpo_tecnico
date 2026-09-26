import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronDown, FileDown, FileUp, Info, Loader2, Map as MapIcon, Search, Table2, Target, Trophy } from 'lucide-react';
import { usePlayerPaniniLines } from '../../../hooks/usePlayerPaniniLines';
import {
  METRIC_GROUPS,
  RANKABLE,
  aggValue,
  aggregatePlayers,
  averagePosition,
  filterByCompetition,
  formatMetric,
  metricDef,
  rankPlayers,
  type CompetitionFilter,
  type MetricGroup,
  type PlayerAggregate,
  type PlayerMetric,
  type Role,
  type ValueMode,
} from '../../../utils/playerPaniniStats';
import { isLeagueMatch } from '../../../utils/teamPaniniMetrics';
import PitchHeatmap, { Grass, PitchLines, PITCH_H, PITCH_W } from './PitchHeatmap';
import { Segmented, card, defaultMinMinutes } from './PlayerMatchStatsTab';
import SquadStatsPdfModal from './SquadStatsPdfModal';

export interface HubPlayer {
  id: string;
  name: string;
  avatar?: string;
}

interface Props {
  players: HubPlayer[];
}

type Section = 'rankings' | 'table' | 'heatmaps' | 'positions';

const ROLE_COLOR: Record<Role, string> = { P: '#f59e0b', D: '#3b82f6', C: '#10b981', A: '#db0030' };
const PLACEHOLDER = 'unsplash.com';

const Avatar: React.FC<{ player: PlayerAggregate; info?: HubPlayer; size?: number }> = ({ player, info, size = 28 }) =>
  info?.avatar && !info.avatar.includes(PLACEHOLDER) ? (
    <img src={info.avatar} alt="" className="rounded-full object-cover bg-gray-100 shrink-0" style={{ width: size, height: size }} />
  ) : (
    <span
      className="rounded-full flex items-center justify-center text-white font-black shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: ROLE_COLOR[player.role] }}
    >
      {player.dorsal}
    </span>
  );

const PlayerStatsHub: React.FC<Props> = ({ players }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusMetric = searchParams.get('metric');
  const { lines, reports, loading, error } = usePlayerPaniniLines();

  const [section, setSection] = useState<Section>('rankings');
  const [competition, setCompetition] = useState<CompetitionFilter>('all');
  const [vm, setVm] = useState<ValueMode>('per90');
  const [role, setRole] = useState<'all' | Role>('all');
  const [query, setQuery] = useState('');
  const [minMinutes, setMinMinutes] = useState<number | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const squad = useMemo(() => aggregatePlayers(filterByCompetition(lines ?? [], competition)), [lines, competition]);
  const minMin = minMinutes ?? defaultMinMinutes(squad);
  const hasCup = (lines ?? []).some((l) => !isLeagueMatch(l.entry));
  const hasLeague = (lines ?? []).some((l) => isLeagueMatch(l.entry));
  const info = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const displayName = (p: PlayerAggregate) => (p.playerId && info.get(p.playerId)?.name) || p.name;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return squad.filter((p) => (role === 'all' || p.role === role) && (!q || displayName(p).toLowerCase().includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squad, role, query, info]);

  const openPlayer = (p: PlayerAggregate) => p.playerId && navigate(`/players/${p.playerId}?view=partidos`);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={20} /> {t('playerStats.loading')}
      </div>
    );
  }
  if (error) return <div className="rounded-2xl bg-red-50 p-6 text-sm font-semibold text-red-700">{t('playerStats.error')}</div>;
  if (!squad.length) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10 p-12 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center mb-4">
          <FileUp size={24} />
        </div>
        <h2 className="text-lg font-black text-gray-900 dark:text-white">{t('playerStats.empty')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('playerStats.emptySquad')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{t('playerStats.hub.title')}</h2>
            <span className="px-2.5 py-0.5 bg-red-50 dark:bg-red-950/40 text-[#db0030] text-[10px] font-black uppercase tracking-wider rounded-full border border-red-200/60 dark:border-red-800/40">
              {t('playerStats.hub.reports', { count: reports })}
            </span>
          </div>
          <p className="text-xs text-gray-500">{t('playerStats.hub.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasCup && hasLeague && (
            <Segmented<CompetitionFilter>
              value={competition}
              onChange={setCompetition}
              options={[['all', t('playerStats.competition.all')], ['league', t('playerStats.competition.league')], ['cup', t('playerStats.competition.cup')]]}
            />
          )}
          <Segmented<ValueMode> value={vm} onChange={setVm} options={[['per90', t('playerStats.mode.per90')], ['total', t('playerStats.mode.total')]]} />
          <button
            type="button"
            onClick={() => setPdfModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#db0030] hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <FileDown size={14} />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Sub-secciones y filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex p-1 rounded-2xl bg-white dark:bg-neutral-900 ring-1 ring-gray-200/80 dark:ring-white/10 shadow-sm overflow-x-auto max-w-full">
          {([
            ['rankings', t('playerStats.hub.rankings'), Trophy],
            ['table', t('playerStats.hub.table'), Table2],
            ['heatmaps', t('playerStats.hub.heatmaps'), MapIcon],
            ['positions', t('playerStats.hub.positions'), Target],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                section === id ? 'bg-[#db0030] text-white shadow' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('playerStats.hub.search') as string}
              className="!pl-8 !py-2 !rounded-xl text-xs font-bold w-44 dark:!bg-neutral-800 dark:!text-white dark:!border-white/10"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'all' | Role)}
            className="!rounded-xl !py-2 !px-3 text-xs font-bold dark:!bg-neutral-800 dark:!text-white dark:!border-white/10"
            aria-label={t('playerStats.hub.position') as string}
          >
            <option value="all">{t('playerStats.hub.position')}: {t('playerStats.hub.allPositions')}</option>
            {(['P', 'D', 'C', 'A'] as Role[]).map((r) => (
              <option key={r} value={r}>{t(`playerStats.roles.${r}`)}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-gray-200/80 dark:ring-white/10 text-xs font-bold text-gray-500">
            {t('playerStats.hub.minMinutes')}
            <input
              type="number"
              min={0}
              step={15}
              value={minMin}
              onChange={(e) => setMinMinutes(Math.max(0, Number(e.target.value) || 0))}
              className="!w-16 !py-0.5 !px-1.5 !rounded-lg text-xs font-black tabular-nums dark:!bg-neutral-800 dark:!text-white"
            />
          </label>
        </div>
      </div>
      <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
        <Info size={12} /> {t('playerStats.hub.sampleNote', { min: minMin })}
      </p>

      {section === 'rankings' && (
        <Rankings squad={visible} vm={vm} minMinutes={minMin} focus={focusMetric} info={info} displayName={displayName} onOpen={openPlayer} />
      )}
      {section === 'table' && <FullTable squad={visible} vm={vm} minMinutes={minMin} info={info} displayName={displayName} onOpen={openPlayer} />}
      {section === 'heatmaps' && (
        <div>
          <p className="text-xs text-gray-500 mb-3">{t('playerStats.hub.heatmapsSubtitle')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {visible.map((p) => {
              const touches = p.lines.flatMap((l) => l.touches);
              return (
                <button key={p.key} type="button" onClick={() => openPlayer(p)} className={`${card} p-3 text-left hover:ring-[#db0030]/50 transition-all`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar player={p} info={p.playerId ? info.get(p.playerId) : undefined} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-gray-900 dark:text-white truncate">{displayName(p)}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase">
                        #{p.dorsal} · {t(`playerStats.roleShort.${p.role}`)} · {p.minutes}' · {t('playerStats.heatmap.touches', { count: touches.length })}
                      </div>
                    </div>
                  </div>
                  <PitchHeatmap touches={touches} avgPosition={averagePosition(p.lines)} label={displayName(p)} />
                </button>
              );
            })}
          </div>
        </div>
      )}
      {section === 'positions' && <Positions squad={visible} displayName={displayName} onOpen={openPlayer} />}

      <SquadStatsPdfModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        squad={squad}
        lines={lines ?? []}
        competitionFilter={competition}
        valueMode={vm}
        minMinutes={minMin}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Rankings
// ---------------------------------------------------------------------------
interface ListProps {
  squad: PlayerAggregate[];
  vm: ValueMode;
  minMinutes: number;
  info: Map<string, HubPlayer>;
  displayName: (p: PlayerAggregate) => string;
  onOpen: (p: PlayerAggregate) => void;
}

const Rankings: React.FC<ListProps & { focus: string | null }> = ({ squad, vm, minMinutes, focus, info, displayName, onOpen }) => {
  const { t } = useTranslation();
  const [group, setGroup] = useState<MetricGroup | 'all'>(() => (focus && metricDef(focus)?.group) || 'all');
  const groups = METRIC_GROUPS.filter((g) => group === 'all' || g === group);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {(['all', ...METRIC_GROUPS] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
              group === g ? 'bg-gray-900 text-white' : 'bg-white dark:bg-neutral-900 text-gray-500 ring-1 ring-gray-200 dark:ring-white/10 hover:text-gray-900'
            }`}
          >
            {g === 'all' ? t('playerStats.hub.allPositions') : t(`playerStats.groups.${g}`)}
          </button>
        ))}
      </div>
      {groups.map((g) => (
        <section key={g}>
          <h3 className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.14em] text-gray-700 dark:text-gray-200 mb-3">
            <span className="w-1 h-4 rounded-full bg-[#db0030]" /> {t(`playerStats.groups.${g}`)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {RANKABLE.filter((m) => m.group === g).map((m) => (
              <RankingCard key={m.key} metric={m} squad={squad} vm={vm} minMinutes={minMinutes} focused={focus === m.key} info={info} displayName={displayName} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

const RankingCard: React.FC<ListProps & { metric: PlayerMetric; focused: boolean }> = ({ metric, squad, vm, minMinutes, focused, info, displayName, onOpen }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(focused);
  const ref = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => rankPlayers(squad, metric, vm, minMinutes), [squad, metric, vm, minMinutes]);
  const shown = expanded ? rows : rows.slice(0, 5);
  const values = rows.map((r) => r.value);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const effectiveVm = metric.kind === 'count' && metric.per90 ? vm : 'total';

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focused]);

  return (
    <div ref={ref} className={`${card} p-4 ${focused ? '!ring-2 !ring-[#db0030]' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-black text-gray-900 dark:text-white">{t(`playerStats.metrics.${metric.key}`)}</h4>
          <p className="text-[11px] text-gray-500 leading-snug">{t(`playerStats.metricDesc.${metric.key}`)}</p>
        </div>
        <span className="shrink-0 flex items-center gap-1 text-[9px] font-black uppercase text-gray-400 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded-md">
          {metric.better === 'low' ? <ArrowDown size={10} /> : <ArrowUp size={10} />}
          {metric.kind === 'ratio' ? '%' : effectiveVm === 'per90' ? t('playerStats.mode.per90') : t('playerStats.mode.total')}
        </span>
      </div>

      <ol className="mt-3 space-y-1.5">
        {shown.map((r) => {
          // Barra: en "menos es mejor" el mejor (menor) ocupa más
          const span = max - min || 1;
          const width = metric.better === 'low' ? ((max - r.value) / span) * 85 + 15 : ((r.value - min) / span) * 85 + 15;
          const att = r.player.attempts[metric.key];
          return (
            <li key={r.player.key}>
              <button type="button" onClick={() => onOpen(r.player)} className="w-full flex items-center gap-2 group text-left">
                <span className={`w-6 text-center text-[11px] font-black tabular-nums ${r.rank <= 3 ? 'text-[#db0030]' : 'text-gray-400'}`}>{r.rank}</span>
                <Avatar player={r.player} info={r.player.playerId ? info.get(r.player.playerId) : undefined} size={24} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate group-hover:text-[#db0030]">{displayName(r.player)}</span>
                    <span className="text-xs font-black tabular-nums text-gray-900 dark:text-white">
                      {formatMetric(r.value, metric, effectiveVm)}
                      {metric.kind === 'ratio' && att ? <span className="ml-1 text-[10px] font-bold text-gray-400">{Math.round(att.ok)}/{att.total}</span> : null}
                    </span>
                  </div>
                  <div className="h-1.5 mt-0.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.rank === 1 ? 'bg-[#db0030]' : r.rank <= 3 ? 'bg-[#f43f5e]' : 'bg-gray-400 dark:bg-gray-500'}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <div className="text-[9.5px] font-semibold text-gray-400">
                    {r.player.minutes}' · {r.player.matches} PJ
                    {effectiveVm === 'per90' && r.player.total[metric.key] !== null ? ` · ${t('playerStats.col.total')} ${formatMetric(r.player.total[metric.key], metric)}` : ''}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
        {!rows.length && <li className="text-xs text-gray-400 py-2">{t('playerStats.hub.noRank')}</li>}
      </ol>

      {rows.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 w-full flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-wider text-gray-500 hover:text-[#db0030]"
        >
          {expanded ? t('playerStats.hub.showLess') : t('playerStats.hub.showAll', { count: rows.length })}
          <ChevronDown size={12} className={expanded ? 'rotate-180' : ''} />
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tabla completa
// ---------------------------------------------------------------------------
const FullTable: React.FC<ListProps> = ({ squad, vm, minMinutes, info, displayName, onOpen }) => {
  const { t } = useTranslation();
  const [group, setGroup] = useState<MetricGroup>('participation');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: 'minutes', dir: -1 });
  const metrics = RANKABLE.filter((m) => m.group === group);

  const cell = (p: PlayerAggregate, m: PlayerMetric) => {
    const sampled = m.kind === 'ratio' || (vm === 'per90' && m.kind === 'count' && m.per90);
    if (sampled && p.minutes < minMinutes) return null;
    return aggValue(p, m, vm);
  };

  // Color por posición relativa en la columna (verde = mejor)
  const scales = useMemo(() => {
    const out: Record<string, { min: number; max: number }> = {};
    for (const m of metrics) {
      const vals = squad.map((p) => cell(p, m)).filter((v): v is number => v !== null);
      out[m.key] = { min: Math.min(...vals), max: Math.max(...vals) };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squad, metrics, vm, minMinutes]);

  const sorted = useMemo(() => {
    const m = metricDef(sort.key);
    const val = (p: PlayerAggregate) => (sort.key === 'name' ? null : sort.key === 'minutes' ? p.minutes : m ? cell(p, m) : null);
    return [...squad].sort((a, b) => {
      if (sort.key === 'name') return displayName(a).localeCompare(displayName(b)) * sort.dir;
      const va = val(a);
      const vb = val(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va - vb) * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squad, sort, vm, minMinutes]);

  const header = (key: string, label: React.ReactNode, title?: string, align = 'text-center') => (
    <th className={`px-2 py-2.5 ${align} cursor-pointer select-none hover:text-gray-900 dark:hover:text-white`} title={title} onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : -1 }))}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sort.key === key && (sort.dir === -1 ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
      </span>
    </th>
  );

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-gray-100 dark:border-white/10">
        {METRIC_GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
              group === g ? 'bg-gray-900 text-white' : 'text-gray-500 ring-1 ring-gray-200 dark:ring-white/10 hover:text-gray-900'
            }`}
          >
            {t(`playerStats.groups.${g}`)}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-50 dark:bg-white/5">
              {header('name', t('playerStats.hub.player'), undefined, 'text-left sticky left-0 bg-gray-50 dark:bg-neutral-800 px-4')}
              {header('minutes', t('playerStats.metrics.minutes'))}
              {metrics.filter((m) => m.key !== 'minutes').map((m) =>
                header(m.key, <span className="max-w-[110px] truncate inline-block align-bottom">{t(`playerStats.metrics.${m.key}`)}</span>, t(`playerStats.metricDesc.${m.key}`)),
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.key} className="border-t border-gray-100 dark:border-white/5 hover:bg-gray-50/80 dark:hover:bg-white/5 group">
                <td className="px-4 py-2 sticky left-0 bg-white dark:bg-neutral-900 group-hover:bg-gray-50 dark:group-hover:bg-neutral-800">
                  <button type="button" onClick={() => onOpen(p)} className="flex items-center gap-2 text-left">
                    <Avatar player={p} info={p.playerId ? info.get(p.playerId) : undefined} size={26} />
                    <span>
                      <span className="block text-xs font-black text-gray-900 dark:text-white hover:text-[#db0030]">{displayName(p)}</span>
                      <span className="block text-[10px] font-bold text-gray-400">#{p.dorsal} · {t(`playerStats.roleShort.${p.role}`)} · {p.matches} PJ</span>
                    </span>
                  </button>
                </td>
                <td className="px-2 py-2 text-center tabular-nums font-bold">{p.minutes}'</td>
                {metrics.filter((m) => m.key !== 'minutes').map((m) => {
                  const v = cell(p, m);
                  const sc = scales[m.key];
                  let bg: string | undefined;
                  if (v !== null && sc && sc.max > sc.min && !(m.gk && p.role !== 'P')) {
                    let k = (v - sc.min) / (sc.max - sc.min);
                    if (m.better === 'low') k = 1 - k;
                    bg = `rgba(16, 185, 129, ${(0.05 + k * 0.45).toFixed(2)})`;
                  }
                  const eff = m.kind === 'count' && m.per90 ? vm : 'total';
                  return (
                    <td key={m.key} className="px-2 py-2 text-center tabular-nums text-gray-800 dark:text-gray-100" style={{ backgroundColor: bg }}>
                      {formatMetric(v, m, eff)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Posiciones medias
// ---------------------------------------------------------------------------
const Positions: React.FC<{ squad: PlayerAggregate[]; displayName: (p: PlayerAggregate) => string; onOpen: (p: PlayerAggregate) => void }> = ({ squad, displayName, onOpen }) => {
  const { t } = useTranslation();
  const maxMin = Math.max(1, ...squad.map((p) => p.minutes));
  const points = squad
    .map((p) => ({ p, pos: averagePosition(p.lines) }))
    .filter((x): x is { p: PlayerAggregate; pos: { x: number; y: number } } => !!x.pos);

  return (
    <div className={`${card} p-5`}>
      <p className="text-xs text-gray-500 mb-3">{t('playerStats.hub.positionsSubtitle')}</p>
      <svg viewBox={`0 0 ${PITCH_W} ${PITCH_H}`} className="w-full block rounded-2xl overflow-hidden">
        <Grass id="avgpos" />
        <PitchLines />
        {points
          .sort((a, b) => b.p.minutes - a.p.minutes)
          .map(({ p, pos }) => {
            const cx = (pos.x / 100) * PITCH_W;
            const cy = (pos.y / 100) * PITCH_H;
            const r = 1.6 + (p.minutes / maxMin) * 1.8;
            return (
              <g key={p.key} className="cursor-pointer" onClick={() => onOpen(p)}>
                <title>{`${displayName(p)} · ${p.minutes}'`}</title>
                <circle cx={cx} cy={cy} r={r} fill={ROLE_COLOR[p.role]} stroke="#fff" strokeWidth={0.4} fillOpacity={0.95} />
                <text x={cx} y={cy + 0.9} textAnchor="middle" fontSize={2.4} fontWeight={900} fill="#fff">{p.dorsal}</text>
                <text x={cx} y={cy + r + 2.6} textAnchor="middle" fontSize={1.9} fontWeight={800} fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.55)', strokeWidth: 0.5 }}>
                  {displayName(p).split(' ').slice(-1)[0]}
                </text>
              </g>
            );
          })}
      </svg>
      <div className="flex flex-wrap gap-4 mt-3 text-[11px] font-bold text-gray-500">
        {(['P', 'D', 'C', 'A'] as Role[]).map((r) => (
          <span key={r} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: ROLE_COLOR[r] }} /> {t(`playerStats.roles.${r}`)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default PlayerStatsHub;
