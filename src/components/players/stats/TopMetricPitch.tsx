import React, { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crosshair, Info, ShieldCheck } from 'lucide-react';
import type { PlayerAggregate, ValueMode } from '../../../utils/playerPaniniStats';
import { aggValue, averagePosition, formatMetric, metricDef, touchDensity, touchZones } from '../../../utils/playerPaniniStats';
import { Grass, PitchLines, PITCH_H, PITCH_W } from './PitchHeatmap';
import type { HubPlayer } from './PlayerStatsHub';
import { PitchPlayerTooltip, type PlayerTooltipData } from './PitchPlayerTooltip';

export type TopMetricType = 'recoveries' | 'crosses';

interface PlayerColorConfig {
  badge: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
  bgBadge: string;
  borderBadge: string;
  textBadge: string;
}

const PLAYER_COLORS: PlayerColorConfig[] = [
  {
    badge: '🥇 1º',
    name: 'Oro',
    hex: '#eab308', // Amarillo / Oro
    rgb: [234, 179, 8],
    bgBadge: 'bg-amber-500/15 dark:bg-amber-500/25',
    borderBadge: 'border-amber-500/40',
    textBadge: 'text-amber-600 dark:text-amber-400',
  },
  {
    badge: '🥈 2º',
    name: 'Cyan',
    hex: '#06b6d4', // Cyan / Azul eléctrico
    rgb: [6, 182, 212],
    bgBadge: 'bg-cyan-500/15 dark:bg-cyan-500/25',
    borderBadge: 'border-cyan-500/40',
    textBadge: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    badge: '🥉 3º',
    name: 'Naranja',
    hex: '#f97316', // Naranja / Coral intenso
    rgb: [249, 115, 22],
    bgBadge: 'bg-orange-500/15 dark:bg-orange-500/25',
    borderBadge: 'border-orange-500/40',
    textBadge: 'text-orange-600 dark:text-orange-400',
  },
];

interface Props {
  metricType: TopMetricType;
  squad: PlayerAggregate[];
  vm: ValueMode;
  minMinutes?: number;
  info?: Map<string, HubPlayer>;
  displayName: (p: PlayerAggregate) => string;
  onOpen: (p: PlayerAggregate) => void;
}

export const TopMetricPitch: React.FC<Props> = ({
  metricType,
  squad,
  vm,
  info,
  displayName,
  onOpen,
}) => {
  const { t } = useTranslation();
  const id = useId().replace(/:/g, '');
  const [selectedRank, setSelectedRank] = useState<'all' | 0 | 1 | 2>('all');
  const [playerTooltip, setPlayerTooltip] = useState<{ data: PlayerTooltipData; coords: { x: number; y: number } } | null>(null);

  const metricKey = metricType === 'recoveries' ? 'recoveries' : 'crosses';
  const metric = useMemo(() => metricDef(metricKey)!, [metricKey]);

  // Ranking de los 3 mejores jugadores en esta métrica
  const topPlayers = useMemo(() => {
    const list = squad
      .map((p) => {
        const val = aggValue(p, metric, vm);
        const totalVal = p.total[metricKey] || 0;
        const avgPos = averagePosition(p.lines);
        const touches = p.lines.flatMap((l) => l.touches);
        const zones = touchZones(touches);
        return {
          player: p,
          value: val || 0,
          totalVal,
          avgPos,
          touches,
          zones,
        };
      })
      .filter((x) => x.totalVal > 0);

    // Priorizar minutos para desempates
    list.sort((a, b) => b.value - a.value || b.player.minutes - a.player.minutes);
    return list.slice(0, 3);
  }, [squad, metric, vm, metricKey]);

  // Total acumulado por todo el equipo para calcular porcentaje
  const teamTotalMetric = useMemo(() => {
    return squad.reduce((acc, p) => acc + (p.total[metricKey] || 0), 0);
  }, [squad, metricKey]);

  // Densidad de calor por jugador
  const playerGrids = useMemo(() => {
    return topPlayers.map((tp) => touchDensity(tp.touches, 1.6));
  }, [topPlayers]);

  const HEAT_COLS = 30;
  const HEAT_ROWS = 20;
  const cw = PITCH_W / HEAT_COLS;
  const ch = PITCH_H / HEAT_ROWS;

  const isRecovery = metricType === 'recoveries';
  const title = isRecovery
    ? t('playerStats.hub.recoveriesTitle', 'Top 3 Jugadores en Recuperaciones')
    : t('playerStats.hub.crossesTitle', 'Top 3 Jugadores en Centros');
  const subtitle = isRecovery
    ? t('playerStats.hub.recoveriesSubtitle', 'Campograma con las zonas de influencia y posiciones de los 3 máximos recuperadores')
    : t('playerStats.hub.crossesSubtitle', 'Campograma con las zonas de llegada y centros de los 3 jugadores más activos en banda');

  if (topPlayers.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl ring-1 ring-gray-200/80 dark:ring-white/10 text-center text-gray-500">
        <Info size={24} className="mx-auto text-gray-400 mb-2" />
        <p className="font-bold text-sm">{t('playerStats.hub.noDataForMetric', 'No hay suficientes registros en los informes seleccionados.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Barra superior de controles */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3.5 rounded-2xl ring-1 ring-gray-200/80 dark:ring-white/10 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/50 text-[#db0030]">
              {isRecovery ? <ShieldCheck size={14} strokeWidth={2.4} /> : <Crosshair size={14} strokeWidth={2.4} />}
            </span>
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{title}</h3>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Selector de foco (Todos o jugador individual) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-neutral-800 ring-1 ring-gray-200/60 dark:ring-white/10">
          <button
            type="button"
            onClick={() => setSelectedRank('all')}
            className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
              selectedRank === 'all'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t('playerStats.hub.top3Combined', 'Todos (Top 3)')}
          </button>
          {topPlayers.map((tp, idx) => {
            const isSelected = selectedRank === idx;
            const config = PLAYER_COLORS[idx];
            return (
              <button
                key={tp.player.key}
                type="button"
                onClick={() => setSelectedRank(idx as 0 | 1 | 2)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-black rounded-lg transition-all ${
                  isSelected
                    ? 'text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
                }`}
                style={{ backgroundColor: isSelected ? config.hex : undefined }}
              >
                <span>{config.badge}</span>
                <span className="truncate max-w-[80px]">{displayName(tp.player).split(' ').slice(-1)[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Campograma con dimensiones ajustadas para encajar en pantalla */}
      <div className="w-full max-w-[760px] mx-auto">
        <div className="relative aspect-[105/68] w-full max-h-[420px] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/10 dark:ring-white/10 bg-[#0a1f14]">
          <svg viewBox={`0 0 ${PITCH_W} ${PITCH_H}`} className="w-full h-full block select-none">
            <defs>
              <Grass id={`topmetric-${id}`} />
              <filter id={`blur-${id}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.9" />
              </filter>
            </defs>

            <use href={`#topmetric-${id}`} />

            {/* Capas de calor por jugador con sus colores específicos */}
            {topPlayers.map((tp, idx) => {
              if (selectedRank !== 'all' && selectedRank !== idx) return null;
              const grid = playerGrids[idx];
              const config = PLAYER_COLORS[idx];
              const [r, g, b] = config.rgb;

              return (
                <g key={`heat-${tp.player.key}`} filter={`url(#blur-${id})`}>
                  {grid.map((row, rIdx) =>
                    row.map((v, cIdx) => {
                      if (v < 0.05) return null;
                      const opacity = Math.min(0.88, 0.2 + v * 0.7);
                      return (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx * cw}
                          y={rIdx * ch}
                          width={cw + 0.2}
                          height={ch + 0.2}
                          fill={`rgb(${r}, ${g}, ${b})`}
                          fillOpacity={opacity}
                        />
                      );
                    }),
                  )}
                </g>
              );
            })}

            <PitchLines stroke="rgba(255,255,255,0.75)" />

            {/* Marcadores de posiciones medias y badges de ranking */}
            {topPlayers.map((tp, idx) => {
              if (!tp.avgPos) return null;
              if (selectedRank !== 'all' && selectedRank !== idx) return null;
              const config = PLAYER_COLORS[idx];
              const cx = (tp.avgPos.x / 100) * PITCH_W;
              const cy = (tp.avgPos.y / 100) * PITCH_H;
              const pctOfTeam = teamTotalMetric > 0 ? Math.round((tp.totalVal / teamTotalMetric) * 100) : 0;

              return (
                <g
                  key={`marker-${tp.player.key}`}
                  className="cursor-pointer group"
                  onClick={() => onOpen(tp.player)}
                  onMouseEnter={(e) => {
                    setPlayerTooltip({
                      data: {
                        player: tp.player,
                        hubInfo: tp.player.playerId ? info?.get(tp.player.playerId) : undefined,
                        context: metricType,
                        extra: {
                          rankBadge: config.badge,
                          metricLabel: isRecovery ? t('playerStats.hub.recoveries', 'Recuperaciones') : t('playerStats.hub.crosses', 'Centros'),
                          metricValue: tp.totalVal,
                          pctOfTeam,
                        },
                      },
                      coords: { x: e.clientX, y: e.clientY },
                    });
                  }}
                  onMouseMove={(e) => {
                    setPlayerTooltip((prev) => (prev ? { ...prev, coords: { x: e.clientX, y: e.clientY } } : null));
                  }}
                  onMouseLeave={() => setPlayerTooltip(null)}
                >
                  <title>{`${displayName(tp.player)} · ${formatMetric(tp.value, metric, vm)} ${metricType}`}</title>

                  {/* Resplandor del color asignado */}
                  <circle cx={cx} cy={cy} r={4.5} fill={config.hex} fillOpacity={0.25} />

                  {/* Círculo del jugador con el color distintivo */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={2.8}
                    fill={config.hex}
                    stroke="#ffffff"
                    strokeWidth={0.6}
                    fillOpacity={0.98}
                    className="transition-transform group-hover:scale-115"
                  />

                  {/* Dorsal del jugador */}
                  <text
                    x={cx}
                    y={cy + 0.9}
                    textAnchor="middle"
                    fontSize={2.3}
                    fontWeight={900}
                    fill="#111827"
                  >
                    {tp.player.dorsal}
                  </text>

                  {/* Badge de Posición / Ranking arriba del círculo */}
                  <g transform={`translate(${cx}, ${cy - 4.2})`}>
                    <rect
                      x={-4.5}
                      y={-1.5}
                      width={9}
                      height={3}
                      rx={0.8}
                      fill="#111827"
                      fillOpacity={0.92}
                      stroke={config.hex}
                      strokeWidth={0.35}
                    />
                    <text
                      x={0}
                      y={0.6}
                      textAnchor="middle"
                      fontSize={1.7}
                      fontWeight={900}
                      fill={config.hex}
                    >
                      {config.badge} · {tp.totalVal}
                    </text>
                  </g>

                  {/* Nombre del jugador debajo */}
                  <text
                    x={cx}
                    y={cy + 5.2}
                    textAnchor="middle"
                    fontSize={1.9}
                    fontWeight={800}
                    fill="#ffffff"
                    style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.9)', strokeWidth: 0.6 }}
                  >
                    {displayName(tp.player).split(' ').slice(-1)[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Tooltip interactivo flotante */}
      <PitchPlayerTooltip data={playerTooltip?.data ?? null} coords={playerTooltip?.coords ?? null} />

      {/* Tarjetas comparativas de los 3 jugadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {topPlayers.map((tp, idx) => {
          const config = PLAYER_COLORS[idx];
          const pctOfTeam = teamTotalMetric > 0 ? Math.round((tp.totalVal / teamTotalMetric) * 100) : 0;

          // Estadísticas específicas
          const recAttack = tp.player.total['rec_attack'] || 0;
          const usefulCrosses = tp.player.attempts?.['crosses']?.ok || 0;
          const totalCrosses = tp.player.attempts?.['crosses']?.total || tp.totalVal || 0;

          return (
            <div
              key={tp.player.key}
              onClick={() => setSelectedRank(selectedRank === idx ? 'all' : (idx as 0 | 1 | 2))}
              className={`p-4 rounded-2xl transition-all cursor-pointer border ${
                selectedRank === idx
                  ? 'bg-white dark:bg-neutral-900 ring-2 ring-offset-2 ring-gray-900 dark:ring-white border-transparent shadow-md'
                  : 'bg-white dark:bg-neutral-900 ring-1 ring-gray-200/80 dark:ring-white/10 hover:border-gray-300 shadow-xs'
              }`}
            >
              {/* Cabecera de la tarjeta con color y ranking */}
              <div className="flex items-center justify-between mb-2.5">
                <span className={`px-2 py-0.5 rounded-md text-xs font-black uppercase border ${config.bgBadge} ${config.borderBadge} ${config.textBadge}`}>
                  {config.badge} {isRecovery ? t('playerStats.hub.topRecoverer', 'Recuperador') : t('playerStats.hub.topCrosser', 'Centrador')}
                </span>
                <span className="text-[11px] font-bold text-gray-400">
                  {t('playerStats.hub.ofTeam', { pct: pctOfTeam })}
                </span>
              </div>

              {/* Nombre y posición */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                  style={{ background: config.hex }}
                >
                  {tp.player.dorsal}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-gray-900 dark:text-white truncate">{displayName(tp.player)}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">
                    {t('playerStats.hub.playedMatches', { minutes: tp.player.minutes, matches: tp.player.matches })}
                  </div>
                </div>
              </div>

              {/* Métricas clave */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
                <div className="p-2 rounded-xl bg-gray-50 dark:bg-neutral-800">
                  <div className="text-[10px] font-black uppercase text-gray-400">
                    {vm === 'per90' ? t('playerStats.mode.per90') : t('playerStats.mode.total')}
                  </div>
                  <div className="text-lg font-black text-gray-900 dark:text-white tabular-nums">
                    {formatMetric(tp.value, metric, vm)}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-gray-50 dark:bg-neutral-800">
                  <div className="text-[10px] font-black uppercase text-gray-400">
                    {isRecovery ? t('playerStats.hub.oppHalf', 'En campo rival') : t('playerStats.hub.efficiency', 'Eficacia')}
                  </div>
                  <div className="text-lg font-black text-gray-900 dark:text-white tabular-nums">
                    {isRecovery ? recAttack : totalCrosses > 0 ? `${Math.round((usefulCrosses / totalCrosses) * 100)}%` : '–'}
                  </div>
                </div>
              </div>

              {/* Distribución por zonas */}
              <div className="mt-3 pt-2 text-[10px] font-bold text-gray-500 flex justify-between items-center">
                <span>{t('playerStats.hub.mainZone', 'Zona principal:')}</span>
                <span className="font-extrabold text-gray-800 dark:text-gray-200">
                  {tp.zones.lanes[0] > 40 ? t('playerStats.hub.leftWing', 'Banda izquierda') : tp.zones.lanes[2] > 40 ? t('playerStats.hub.rightWing', 'Banda derecha') : t('playerStats.hub.centerZone', 'Zona central')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopMetricPitch;
