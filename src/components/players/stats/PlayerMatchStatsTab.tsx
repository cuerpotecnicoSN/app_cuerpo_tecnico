import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bar, CartesianGrid, Cell, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Info, Loader2, ArrowRight, Footprints, FileDown } from 'lucide-react';
import { usePlayerPaniniLines } from '../../../hooks/usePlayerPaniniLines';
import { useSupabaseData } from '../../../hooks/useSupabaseData';
import type { Player } from '../../types';
import {
  METRIC_GROUPS,
  PLAYER_METRICS,
  aggregatePlayer,
  aggregatePlayers,
  averagePosition,
  filterByCompetition,
  formatMetric,
  lineLabel,
  lineValue,
  metricDef,
  normalize,
  partitionPlayerTramos,
  passPartners,
  rankPlayers,
  touchZones,
  type CompetitionFilter,
  type PlayerAggregate,
  type PlayerMatchLine,
  type PlayerMetric,
  type Role,
} from '../../../utils/playerPaniniStats';
import { isLeagueMatch, opponentLogo } from '../../../utils/teamPaniniMetrics';
import PitchHeatmap from './PitchHeatmap';
import PlayerReportPdfModal from './PlayerReportPdfModal';
import type { PaniniMapEvent } from '../../../types/paniniReport';

interface Props {
  playerId: string;
  /** Nombre en BD, para encontrar al jugador si el informe no está vinculado */
  playerName?: string;
  playerDbInfo?: Player;
}

export const card = 'bg-white dark:bg-neutral-900 rounded-3xl ring-1 ring-gray-200/80 dark:ring-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.15)]';

export const KEY_METRICS: Record<Role, string[]> = {
  P: ['saves', 'conceded', 'shots_on_faced', 'high_claims', 'long_kicks_pct', 'pass_acc', 'balls', 'recoveries'],
  D: ['recoveries', 'interceptions', 'tackles_pct', 'rec_air', 'pass_acc', 'passes_ok', 'useful', 'losses'],
  C: ['useful', 'passes_ok', 'pass_acc', 'recoveries', 'key_passes', 'dribbles', 'balls', 'losses'],
  A: ['goals', 'shots', 'shots_on_pct', 'box_balls', 'dribbles', 'key_passes', 'useful', 'fouls_won'],
};

/** Mínimo de minutos para rankings por 90' y en %: un cuarto de los minutos del más utilizado */
export const defaultMinMinutes = (players: PlayerAggregate[]) =>
  Math.max(90, Math.round((Math.max(0, ...players.map((p) => p.minutes)) * 0.25) / 5) * 5);

export const Segmented = <T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) => (
  <div className="flex p-1 rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-gray-200/80 dark:ring-white/10 shadow-sm">
    {options.map(([k, l]) => (
      <button
        key={k}
        type="button"
        onClick={() => onChange(k)}
        className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all ${
          value === k ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        {l}
      </button>
    ))}
  </div>
);

const Kpi = ({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) => (
  <div className={`rounded-2xl p-4 ring-1 ${
    accent
      ? 'bg-gradient-to-br from-[#db0030] to-[#8a001e] text-white ring-transparent shadow-[0_12px_28px_-12px_rgba(219,0,48,0.7)]'
      : 'bg-white dark:bg-neutral-900 ring-gray-200/80 dark:ring-white/10 shadow-sm'
  }`}>
    <div className={`text-[10px] font-black uppercase tracking-[0.14em] ${accent ? 'text-white/70' : 'text-gray-400'}`}>{label}</div>
    <div className={`mt-1 text-2xl font-black tabular-nums tracking-tight ${accent ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{value}</div>
    {sub && <div className={`text-[11px] font-semibold ${accent ? 'text-white/70' : 'text-gray-500'}`}>{sub}</div>}
  </div>
);

const Bars = ({ items }: { items: [string, number][] }) => (
  <div className="space-y-2">
    {items.map(([label, pct]) => (
      <div key={label}>
        <div className="flex justify-between text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">
          <span>{label}</span>
          <span className="tabular-nums text-gray-900 dark:text-white">{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#f97316] to-[#db0030]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    ))}
  </div>
);

/** Líneas de este jugador: por id de BD o, si el informe no está vinculado, por nombre */
const linesForPlayer = (lines: PlayerMatchLine[], playerId: string, playerName?: string) => {
  const byId = lines.filter((l) => l.playerId === playerId);
  if (byId.length || !playerName) return byId;
  const tokens = normalize(playerName).split(' ').filter((t) => t.length > 2);
  return lines.filter((l) => !l.playerId && tokens.length > 0 && tokens.every((t) => normalize(l.stats?.nombre ?? l.name).includes(t)));
};



interface PlayerPitchCardProps {
  touches: PaniniMapEvent[];
  avgPos: { x: number; y: number } | null;
  title: string;
  subtitle: string;
  badge: string;
  isGeneral?: boolean;
  matches: number;
  showTouches: boolean;
  period: 'all' | '1T' | '2T';
}

const PlayerPitchCard: React.FC<PlayerPitchCardProps> = ({
  touches,
  avgPos,
  title,
  subtitle,
  badge,
  isGeneral,
  matches,
  showTouches,
  period,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl p-3 transition-all ${
        isGeneral
          ? 'bg-red-50/40 dark:bg-neutral-800/90 ring-2 ring-[#db0030]/60 dark:ring-[#db0030]/70 shadow-md'
          : 'bg-white dark:bg-neutral-900 ring-1 ring-gray-200/80 dark:ring-white/10 shadow-xs'
      }`}
    >
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
          {matches} PJ
        </span>
      </div>

      <div className="w-full my-0.5">
        {touches.length && matches > 0 ? (
          <PitchHeatmap
            touches={touches}
            avgPosition={period === 'all' ? avgPos : null}
            showTouches={showTouches}
            label={title}
          />
        ) : (
          <div className="aspect-[105/68] rounded-2xl bg-gray-100 dark:bg-neutral-800/60 flex flex-col items-center justify-center p-3 text-center">
            <Footprints size={20} className="text-gray-400 mb-1" />
            <span className="text-[11px] font-bold text-gray-400">{t('playerStats.heatmap.noTouches', 'Sin toques registrados')}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-white/5 text-[10px] font-bold text-gray-500">
        <span className="tabular-nums">
          {t('playerStats.heatmap.touches', { count: touches.length })}
        </span>
        {avgPos && period === 'all' && (
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-white ring-1 ring-gray-900 shadow-2xs" />
            {t('playerStats.tramos.avgPositionShort', 'Pos. media')}
          </span>
        )}
      </div>
    </div>
  );
};

const PlayerMatchStatsTab: React.FC<Props> = ({ playerId, playerName, playerDbInfo }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: dbPlayers } = useSupabaseData<any>('players');
  const { lines, loading, error } = usePlayerPaniniLines();

  const resolvedDbPlayer = useMemo<Player | undefined>(() => {
    if (playerDbInfo) return playerDbInfo;
    const p = dbPlayers?.find((x: any) => x.id === playerId);
    if (!p) return undefined;
    return {
      id: p.id,
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.nombre || '',
      position: p.main_position || p.posicion || 'Sin definir',
      age: p.birth_date ? new Date().getFullYear() - new Date(p.birth_date).getFullYear() : 0,
      weight: p.weight_kg || 0,
      height: p.height_cm || 0,
      bodyFat: 0,
      history: p.history || '',
      strengths: [],
      weaknesses: [],
      goals: [],
      status: p.medical_status || 'Apto',
      nationality: p.nationality || '',
      dominantFoot: p.dominant_foot,
      avatar: p.photo_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    };
  }, [playerDbInfo, dbPlayers, playerId]);
  const [competition, setCompetition] = useState<CompetitionFilter>('all');
  const [matchFilter, setMatchFilter] = useState<string>('all');
  const [period, setPeriod] = useState<'all' | '1T' | '2T'>('all');
  const [showTouches, setShowTouches] = useState(false);
  const [evoMetric, setEvoMetric] = useState<string>('');
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const heatRef = useRef<HTMLDivElement>(null);

  const pool = useMemo(() => filterByCompetition(lines ?? [], competition), [lines, competition]);
  const mine = useMemo(() => linesForPlayer(pool, playerId, playerName), [pool, playerId, playerName]);
  const squad = useMemo(() => aggregatePlayers(pool), [pool]);
  const me = useMemo(() => (mine.length ? aggregatePlayer(mine) : null), [mine]);
  const minMinutes = useMemo(() => defaultMinMinutes(squad), [squad]);
  const hasCup = useMemo(() => (lines ?? []).some((l) => !isLeagueMatch(l.entry)), [lines]);
  const hasLeague = useMemo(() => (lines ?? []).some((l) => isLeagueMatch(l.entry)), [lines]);

  const heatLines = matchFilter === 'all' ? mine : mine.filter((l) => l.entry.match.id === matchFilter);
  const touches = useMemo(
    () => heatLines.flatMap((l) => l.touches).filter((tc) => period === 'all' || tc.periodo === period),
    [heatLines, period],
  );
  const zones = useMemo(() => touchZones(touches), [touches]);
  const avgPos = useMemo(() => averagePosition(heatLines), [heatLines]);
  const playerTramos = useMemo(() => partitionPlayerTramos(mine, period, t), [mine, period, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={20} /> {t('playerStats.loading')}
      </div>
    );
  }
  if (error) return <div className="rounded-2xl bg-red-50 p-6 text-sm font-semibold text-red-700">{t('playerStats.error')}</div>;
  if (!me) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10 p-12 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center mb-4">
          <Footprints size={24} />
        </div>
        <h3 className="text-lg font-black text-gray-900 dark:text-white">{t('playerStats.empty')}</h3>
        <p className="text-sm text-gray-500 mt-1">{t('playerStats.emptyPlayer')}</p>
      </div>
    );
  }

  const isGK = me.role === 'P';
  const role = me.role;
  const ranked = (m: PlayerMetric) => {
    const vm = m.kind === 'count' && m.per90 ? 'per90' : 'total';
    const rows = rankPlayers(squad, m, vm, minMinutes);
    const row = rows.find((r) => r.player.key === me.key);
    return { rows, row, vm } as const;
  };

  const evo = metricDef(evoMetric) ?? metricDef(KEY_METRICS[role][0])!;
  const evoData = mine.map((l) => ({
    label: lineLabel(l),
    rival: l.entry.rival.nombre || l.entry.match.opponent,
    value: lineValue(evo, l),
  }));
  const evoValues = evoData.map((d) => d.value).filter((v): v is number => v !== null);
  const evoMean = evoValues.length ? evoValues.reduce((a, b) => a + b, 0) / evoValues.length : null;

  const groups = METRIC_GROUPS.filter((g) => (g === 'goalkeeper' ? isGK : true));
  const cards = me.total.yellow ?? 0;
  const reds = me.total.red ?? 0;

  const openHeat = (matchId: string) => {
    setMatchFilter(matchId);
    heatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Filtros y Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{t('playerStats.tab')}</h2>
          <p className="text-xs text-gray-500">
            #{me.dorsal} · {t(`playerStats.roles.${role}`)} · {t('playerStats.hub.reports', { count: mine.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasCup && hasLeague && (
            <Segmented<CompetitionFilter>
              value={competition}
              onChange={(v) => {
                setCompetition(v);
                setMatchFilter('all');
              }}
              options={[['all', t('playerStats.competition.all')], ['league', t('playerStats.competition.league')], ['cup', t('playerStats.competition.cup')]]}
            />
          )}
          <button
            type="button"
            onClick={() => setPdfModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#db0030] hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <FileDown size={14} />
            <span>{t('playerStats.exportPdf', 'Exportar PDF')}</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi accent label={t('playerStats.kpi.matches')} value={String(me.matches)} sub={t('playerStats.kpi.starts', { count: me.total.starts ?? 0 })} />
        <Kpi label={t('playerStats.kpi.minutes')} value={`${me.minutes}'`} sub={t('playerStats.kpi.minutesPerMatch', { value: me.matches ? Math.round(me.minutes / me.matches) : 0 })} />
        {isGK ? (
          <>
            <Kpi label={t('playerStats.metrics.saves')} value={formatMetric(me.total.saves, metricDef('saves')!)} />
            <Kpi label={t('playerStats.metrics.conceded')} value={formatMetric(me.total.conceded, metricDef('conceded')!)} />
          </>
        ) : (
          <>
            <Kpi label={t('playerStats.kpi.goals')} value={String(me.total.goals ?? 0)} />
            <Kpi label={t('playerStats.kpi.assists')} value={String(me.total.assists ?? 0)} sub={t('playerStats.kpi.keyPasses', { count: me.total.key_passes ?? 0 })} />
          </>
        )}
        <Kpi label={t('playerStats.kpi.useful')} value={formatMetric(me.per90.useful, metricDef('useful')!, 'per90')} />
        <Kpi label={t('playerStats.kpi.cards')} value={`${cards} / ${reds}`} sub={`${t('playerStats.metrics.yellow')} / ${t('playerStats.metrics.red')}`} />
      </div>

      {/* Mapa de calor + Evolución por Tramos + Zonas + Socios */}
      <div ref={heatRef} className="space-y-4 scroll-mt-24">
        <div className={`${card} p-5 space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 dark:border-white/5 pb-3">
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                {t('playerStats.heatmap.title', 'Mapa de calor y Evolución por Tramos')}
              </h3>
              <p className="text-xs text-gray-500">
                {t('playerStats.heatmap.subtitle', 'Densidad de toques del jugador (ataque hacia la derecha) · Comparativa general y evolución en 3 tramos de la temporada')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={matchFilter}
                onChange={(e) => setMatchFilter(e.target.value)}
                className="!rounded-xl !py-1.5 !px-3 text-xs font-bold dark:!bg-neutral-800 dark:!text-white dark:!border-white/10 shadow-xs"
              >
                <option value="all">{t('playerStats.allMatches', 'Todos los partidos')}</option>
                {mine.map((l) => (
                  <option key={l.entry.match.id} value={l.entry.match.id}>
                    {lineLabel(l)} · {l.entry.rival.nombre || l.entry.match.opponent} ({l.minutes}')
                  </option>
                ))}
              </select>
              <Segmented<'all' | '1T' | '2T'>
                value={period}
                onChange={setPeriod}
                options={[
                  ['all', t('playerStats.period.all', 'Partido')],
                  ['1T', t('playerStats.period.1T', '1ª parte')],
                  ['2T', t('playerStats.period.2T', '2ª parte')],
                ]}
              />
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-neutral-800 text-xs font-bold text-gray-600 dark:text-gray-300 ring-1 ring-gray-200/60 dark:ring-white/10 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showTouches}
                  onChange={(e) => setShowTouches(e.target.checked)}
                  className="accent-[#db0030]"
                />
                <span>{t('playerStats.heatmap.showTouches', 'Ver toques')}</span>
              </label>
            </div>
          </div>

          {matchFilter === 'all' ? (
            /* Vista General + 3 Tramos de la temporada */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Campograma General */}
              <PlayerPitchCard
                touches={touches}
                avgPos={avgPos}
                title={t('playerStats.tramos.general', 'General')}
                subtitle={t('playerStats.tramos.allSeason', 'Toda la temporada')}
                badge={t('playerStats.tramos.global', 'Global')}
                isGeneral={true}
                matches={mine.length}
                showTouches={showTouches}
                period={period}
              />

              {/* 2, 3, 4. Campogramas de los 3 Tramos */}
              {playerTramos.map((tr) => (
                <PlayerPitchCard
                  key={tr.index}
                  touches={tr.touches}
                  avgPos={tr.avgPos}
                  title={tr.name}
                  subtitle={tr.label}
                  badge={t('playerStats.tramos.tramoBadge', { n: tr.index })}
                  isGeneral={false}
                  matches={tr.matchCount}
                  showTouches={showTouches}
                  period={period}
                />
              ))}
            </div>
          ) : (
            /* Vista de partido individual */
            <div className="max-w-[500px] mx-auto py-2">
              <PlayerPitchCard
                touches={touches}
                avgPos={avgPos}
                title={mine.find((l) => l.entry.match.id === matchFilter) ? lineLabel(mine.find((l) => l.entry.match.id === matchFilter)!) : t('playerStats.tramos.singleMatch', 'Partido seleccionado')}
                subtitle={mine.find((l) => l.entry.match.id === matchFilter)?.entry.rival.nombre || t('playerStats.tramos.singleMatchSub', 'Partido individual')}
                badge={t('playerStats.tramos.badgeMatch', 'Partido')}
                isGeneral={true}
                matches={1}
                showTouches={showTouches}
                period={period}
              />
            </div>
          )}
        </div>

        {/* Zonas (Dónde actúa) y Socios habituales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`${card} p-5`}>
            <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight mb-3">{t('playerStats.zones.title', 'Dónde actúa')}</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">{t('playerStats.zones.thirds', 'Por tercios')}</div>
                <Bars
                  items={[
                    [t('playerStats.zones.defense', 'Defensa'), zones.thirds[0]],
                    [t('playerStats.zones.middle', 'Medio'), zones.thirds[1]],
                    [t('playerStats.zones.attack', 'Ataque'), zones.thirds[2]],
                  ]}
                />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">{t('playerStats.zones.lanes', 'Por carriles')}</div>
                <Bars
                  items={[
                    [t('playerStats.zones.left', 'Izquierda'), zones.lanes[0]],
                    [t('playerStats.zones.center', 'Centro'), zones.lanes[1]],
                    [t('playerStats.zones.right', 'Derecha'), zones.lanes[2]],
                  ]}
                />
              </div>
            </div>
          </div>

          <div className={`${card} p-5`}>
            <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight mb-3">{t('playerStats.partners.title', 'Socios habituales')}</h3>
            <div className="grid grid-cols-2 gap-5">
              {(['to', 'from'] as const).map((dir) => {
                const list = passPartners(heatLines, dir, 5);
                const max = Math.max(1, ...list.map((p) => p.passes));
                return (
                  <div key={dir}>
                    <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">{t(`playerStats.partners.${dir}`)}</div>
                    <div className="space-y-1.5">
                      {list.map((p) => (
                        <div key={p.name} title={t('playerStats.partners.passes', { count: p.passes })}>
                          <div className="flex justify-between text-[11px] font-bold text-gray-700 dark:text-gray-200">
                            <span className="truncate">{p.name.split(' ')[0]}</span>
                            <span className="tabular-nums">{p.passes}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-gray-900 dark:bg-white" style={{ width: `${(p.passes / max) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                      {!list.length && <span className="text-xs text-gray-400">–</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Posición en la plantilla */}
      <div className={`${card} p-5`}>
        <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">{t('playerStats.squadRank.title')}</h3>
        <p className="text-xs text-gray-500 mb-4">{t('playerStats.squadRank.subtitle', { min: minMinutes })}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {KEY_METRICS[role].map((key) => {
            const m = metricDef(key);
            if (!m) return null;
            const { rows, row, vm } = ranked(m);
            const pct = row && rows.length > 1 ? 100 - ((row.rank - 1) / (rows.length - 1)) * 100 : row ? 100 : 0;
            return (
              <button
                key={key}
                type="button"
                onClick={() => navigate(`/players?view=stats&metric=${key}`)}
                title={t(`playerStats.metricDesc.${key}`)}
                className="text-left p-3 rounded-2xl bg-gray-50 dark:bg-white/5 ring-1 ring-gray-100 dark:ring-white/5 hover:ring-[#db0030]/40 transition-all group"
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 truncate">{t(`playerStats.metrics.${key}`)}</div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
                    {row ? `${row.rank}º` : '–'}
                    <span className="text-xs font-bold text-gray-400 ml-1">{t('playerStats.squadRank.of', { count: rows.length })}</span>
                  </span>
                  <span className="text-xs font-black tabular-nums text-[#db0030]">{formatMetric(me && (vm === 'per90' ? me.per90[key] : me.total[key]), m, vm)}</span>
                </div>
                <div className="h-1.5 mt-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#f97316] to-[#db0030]" style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Evolución */}
      <div className={`${card} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">{t('playerStats.evolution.title')}</h3>
            <p className="text-xs text-gray-500">{t('playerStats.evolution.subtitle')}</p>
          </div>
          <select
            value={evo.key}
            onChange={(e) => setEvoMetric(e.target.value)}
            className="!rounded-xl !py-2 !px-3 text-sm font-bold dark:!bg-neutral-800 dark:!text-white dark:!border-white/10"
          >
            {groups.map((g) => (
              <optgroup key={g} label={t(`playerStats.groups.${g}`)}>
                {PLAYER_METRICS.filter((m) => m.group === g && !['matches', 'starts'].includes(m.key)).map((m) => (
                  <option key={m.key} value={m.key}>{t(`playerStats.metrics.${m.key}`)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={evoData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.2} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              cursor={{ fill: 'rgba(156,163,175,0.12)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof evoData)[number];
                return (
                  <div className="bg-gray-900/95 text-white rounded-xl px-3 py-2 shadow-xl text-xs">
                    <div className="font-black">{p.label} · {p.rival}</div>
                    <div className="font-bold tabular-nums mt-0.5">{formatMetric(p.value, evo)}</div>
                  </div>
                );
              }}
            />
            {evoMean !== null && (
              <ReferenceLine
                y={evoMean}
                stroke="#111827"
                strokeOpacity={0.5}
                strokeDasharray="6 4"
                label={{ value: formatMetric(evoMean, evo), position: 'insideTopRight', fontSize: 11, fontWeight: 800, fill: '#6b7280' }}
              />
            )}
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {evoData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.value === null || evoMean === null ? '#9ca3af' : (evo.better === 'high') === d.value >= evoMean ? '#10b981' : '#db0030'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Partido a partido */}
      <MatchTable lines={mine} me={me} isGK={isGK} onOpen={openHeat} />

      {/* Estadísticas completas */}
      <div>
        <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">{t('playerStats.metricsTitle')}</h3>
        <p className="text-xs text-gray-500 mb-3">{t('playerStats.metricsSubtitle')}</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div key={g} className={`${card} overflow-hidden`}>
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                <span className="w-1 h-4 rounded-full bg-[#db0030]" />
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-700 dark:text-gray-200">{t(`playerStats.groups.${g}`)}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="text-left px-4 py-2">{t('playerStats.col.metric')}</th>
                    <th className="text-right px-2 py-2">{t('playerStats.col.total')}</th>
                    <th className="text-right px-2 py-2">{t('playerStats.col.per90')}</th>
                    <th className="text-right px-4 py-2">{t('playerStats.col.rank')}</th>
                  </tr>
                </thead>
                <tbody>
                  {PLAYER_METRICS.filter((m) => m.group === g).map((m) => {
                    const { rows, row } = ranked(m);
                    const att = me.attempts[m.key];
                    const isPresence = ['matches', 'starts'].includes(m.key);
                    return (
                      <tr key={m.key} className="border-t border-gray-100 dark:border-white/5 hover:bg-gray-50/70 dark:hover:bg-white/5">
                        <td className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200">
                          <span className="inline-flex items-center gap-1.5" title={t(`playerStats.metricDesc.${m.key}`)}>
                            {t(`playerStats.metrics.${m.key}`)}
                            <Info size={12} className="text-gray-300 shrink-0" />
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums font-black text-gray-900 dark:text-white">
                          {formatMetric(me.total[m.key], m)}
                          {m.kind === 'ratio' && att?.total ? <span className="block text-[10px] font-bold text-gray-400">{Math.round(att.ok)}/{att.total}</span> : null}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-gray-600 dark:text-gray-300">
                          {m.kind === 'count' && m.per90 ? formatMetric(me.per90[m.key], m, 'per90') : '–'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {!isPresence && row ? (
                            <span className={`inline-flex items-center justify-center min-w-[44px] px-1.5 py-0.5 rounded-lg text-[11px] font-black tabular-nums ${
                              row.rank <= 3 ? 'bg-[#db0030] text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                            }`}>
                              {row.rank}º/{rows.length}
                            </span>
                          ) : (
                            <span className="text-gray-300">–</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      <PlayerReportPdfModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        player={me}
        playerDbInfo={resolvedDbPlayer}
        lines={mine}
        competitionFilter={competition}
      />
    </div>
  );
};

const MATCH_COLS: { key: string; gk?: boolean; outfield?: boolean }[] = [
  { key: 'goals', outfield: true },
  { key: 'balls' },
  { key: 'passes_ok' },
  { key: 'pass_acc' },
  { key: 'useful' },
  { key: 'losses' },
  { key: 'recoveries' },
  { key: 'interceptions', outfield: true },
  { key: 'dribbles', outfield: true },
  { key: 'key_passes', outfield: true },
  { key: 'shots', outfield: true },
  { key: 'saves', gk: true },
  { key: 'conceded', gk: true },
  { key: 'high_claims', gk: true },
];

const MatchTable: React.FC<{ lines: PlayerMatchLine[]; me: PlayerAggregate; isGK: boolean; onOpen: (matchId: string) => void }> = ({ lines, me, isGK, onOpen }) => {
  const { t } = useTranslation();
  const cols = MATCH_COLS.filter((c) => (isGK ? !c.outfield : !c.gk)).map((c) => metricDef(c.key)!);

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10">
        <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">{t('playerStats.matchTable.title')}</h3>
        <p className="text-xs text-gray-500">{t('playerStats.matchTable.subtitle')}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-50 dark:bg-white/5">
              <th className="text-left px-4 py-2.5 sticky left-0 bg-gray-50 dark:bg-neutral-800">{t('playerStats.matchTable.match')}</th>
              <th className="px-2 py-2.5 text-center">{t('playerStats.matchTable.min')}</th>
              {cols.map((m) => (
                <th key={m.key} className="px-2 py-2.5 text-center max-w-[90px] truncate" title={t(`playerStats.metricDesc.${m.key}`)}>
                  {t(`playerStats.metrics.${m.key}`)}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center">{t('playerStats.kpi.cards')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const e = l.entry;
              const logo = opponentLogo(e);
              const res = e.our.goles > e.rival.goles ? 'bg-emerald-500' : e.our.goles < e.rival.goles ? 'bg-[#db0030]' : 'bg-gray-400';
              return (
                <tr
                  key={e.match.id}
                  onClick={() => onOpen(e.match.id)}
                  className="border-t border-gray-100 dark:border-white/5 hover:bg-red-50/40 dark:hover:bg-white/5 cursor-pointer group"
                >
                  <td className="px-4 py-2 sticky left-0 bg-white dark:bg-neutral-900 group-hover:bg-red-50/40 dark:group-hover:bg-neutral-800">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-black w-9 ${isLeagueMatch(e) ? 'text-gray-500' : 'text-amber-600'}`}>{lineLabel(l)}</span>
                      {logo ? <img src={logo} alt="" className="w-6 h-6 object-contain" /> : <span className="w-6 h-6 rounded-full bg-gray-200" />}
                      <span className="font-bold text-gray-800 dark:text-gray-100 max-w-[140px] truncate">{e.rival.nombre || e.match.opponent}</span>
                      <span className={`${res} text-white text-[10px] font-black px-1.5 py-0.5 rounded-md tabular-nums`}>{e.our.goles}–{e.rival.goles}</span>
                      <ArrowRight size={12} className="text-gray-300 opacity-0 group-hover:opacity-100" />
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums font-bold">
                    {l.minutes}'
                    <span className={`ml-1 text-[9px] font-black uppercase ${l.starter ? 'text-[#db0030]' : 'text-gray-400'}`}>
                      {l.starter ? t('playerStats.matchTable.start') : t('playerStats.matchTable.sub')}
                    </span>
                  </td>
                  {cols.map((m) => {
                    const v = lineValue(m, l);
                    return (
                      <td key={m.key} className="px-2 py-2 text-center tabular-nums text-gray-700 dark:text-gray-200">
                        {m.key === 'goals' && v ? <span className="font-black text-[#db0030]">{v}</span> : formatMetric(v, m)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    {l.yellow > 0 && <span className="inline-block w-2.5 h-3.5 rounded-[2px] bg-yellow-400 mr-0.5" />}
                    {l.red > 0 && <span className="inline-block w-2.5 h-3.5 rounded-[2px] bg-red-600" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {(['total', 'per90'] as const).map((vm) => (
              <tr key={vm} className="border-t-2 border-gray-900 dark:border-white/30 bg-gray-50 dark:bg-white/5 font-black">
                <td className="px-4 py-2 sticky left-0 bg-gray-50 dark:bg-neutral-800 text-[11px] uppercase tracking-wider">{t(`playerStats.matchTable.${vm}`)}</td>
                <td className="px-2 py-2 text-center tabular-nums">{vm === 'total' ? `${me.minutes}'` : ''}</td>
                {cols.map((m) => (
                  <td key={m.key} className="px-2 py-2 text-center tabular-nums">
                    {vm === 'per90' && !(m.kind === 'count' && m.per90) ? '' : formatMetric(vm === 'per90' ? me.per90[m.key] : me.total[m.key], m, vm)}
                  </td>
                ))}
                <td className="px-3 py-2 text-center tabular-nums">{vm === 'total' ? `${me.total.yellow ?? 0}/${me.total.red ?? 0}` : ''}</td>
              </tr>
            ))}
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default PlayerMatchStatsTab;
