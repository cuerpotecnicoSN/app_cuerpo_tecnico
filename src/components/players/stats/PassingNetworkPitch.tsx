import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Share2, Sparkles, X, Users } from 'lucide-react';
import type { PlayerAggregate, Role } from '../../../utils/playerPaniniStats';
import { averagePosition } from '../../../utils/playerPaniniStats';
import { Grass, PitchLines, PITCH_H, PITCH_W } from './PitchHeatmap';
import type { HubPlayer } from './PlayerStatsHub';
import { PitchPlayerTooltip, PitchConnectionTooltip, type PlayerTooltipData, type ConnectionTooltipData } from './PitchPlayerTooltip';

const ROLE_COLOR: Record<Role, string> = { P: '#f59e0b', D: '#3b82f6', C: '#10b981', A: '#db0030' };

export interface PassConnection {
  id: string;
  fromDorsal: number;
  toDorsal: number;
  fromPlayer: PlayerAggregate;
  toPlayer: PlayerAggregate;
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  passes: number;
}

type ConnectionLimit = 11 | 15 | 20 | 'all';

interface Props {
  squad: PlayerAggregate[];
  info?: Map<string, HubPlayer>;
  displayName: (p: PlayerAggregate) => string;
  onOpen: (p: PlayerAggregate) => void;
}

export const PassingNetworkPitch: React.FC<Props> = ({ squad, info, displayName, onOpen }) => {
  const { t } = useTranslation();
  // Por defecto se muestran las 11 conexiones más repetidas
  const [limitMode, setLimitMode] = useState<ConnectionLimit>(11);
  const [selectedPlayerKey, setSelectedPlayerKey] = useState<string | null>(null);
  const [hoveredPlayerKey, setHoveredPlayerKey] = useState<string | null>(null);
  const [hoveredConnId, setHoveredConnId] = useState<string | null>(null);
  const [playerTooltip, setPlayerTooltip] = useState<{ data: PlayerTooltipData; coords: { x: number; y: number } } | null>(null);
  const [connectionTooltip, setConnectionTooltip] = useState<{ data: ConnectionTooltipData; coords: { x: number; y: number } } | null>(null);

  // Mostrar todos los jugadores con minutos y posición en el campo
  const activeSquad = useMemo(() => {
    return squad.filter((p) => p.minutes > 0);
  }, [squad]);

  const activeKeys = useMemo(() => new Set(activeSquad.map((p) => p.key)), [activeSquad]);

  // Mapa de jugadores por dorsal
  const playerByDorsal = useMemo(() => {
    const map = new Map<number, PlayerAggregate>();
    activeSquad.forEach((p) => map.set(p.dorsal, p));
    return map;
  }, [activeSquad]);

  // Posiciones medias calculadas para todos los jugadores
  const playerPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    activeSquad.forEach((p) => {
      const pos = averagePosition(p.lines);
      if (pos) map.set(p.key, pos);
    });
    return map;
  }, [activeSquad]);

  // Extraer todas las conexiones de pases entre compañeros
  const allConnections = useMemo<PassConnection[]>(() => {
    const map = new Map<string, number>();

    activeSquad.forEach((p) => {
      p.lines.forEach((l) => {
        if (!l.passesTo) return;
        Object.entries(l.passesTo).forEach(([targetDorsalStr, count]) => {
          const targetDorsal = Number(targetDorsalStr);
          const numCount = Number(count) || 0;
          if (numCount > 0 && targetDorsal !== l.dorsal) {
            const toPlayer = playerByDorsal.get(targetDorsal);
            if (toPlayer && activeKeys.has(toPlayer.key)) {
              const key = `${l.dorsal}->${targetDorsal}`;
              map.set(key, (map.get(key) || 0) + numCount);
            }
          }
        });
      });
    });

    const list: PassConnection[] = [];
    map.forEach((passes, key) => {
      const [fromStr, toStr] = key.split('->');
      const fromDorsal = Number(fromStr);
      const toDorsal = Number(toStr);

      const fromPlayer = playerByDorsal.get(fromDorsal);
      const toPlayer = playerByDorsal.get(toDorsal);

      if (fromPlayer && toPlayer) {
        const fromPos = playerPositions.get(fromPlayer.key);
        const toPos = playerPositions.get(toPlayer.key);

        if (fromPos && toPos) {
          list.push({
            id: key,
            fromDorsal,
            toDorsal,
            fromPlayer,
            toPlayer,
            fromPos,
            toPos,
            passes,
          });
        }
      }
    });

    // Ordenar de mayor a menor número de pases
    return list.sort((a, b) => b.passes - a.passes);
  }, [activeSquad, activeKeys, playerByDorsal, playerPositions]);

  const maxPasses = useMemo(() => Math.max(1, ...allConnections.map((c) => c.passes)), [allConnections]);

  // Jugador enfocado (por clic o por hover)
  const focusedPlayerKey = selectedPlayerKey || hoveredPlayerKey;

  // Conexiones visibles: por defecto las 11 más repetidas, o las del jugador seleccionado
  const visibleConnections = useMemo(() => {
    if (selectedPlayerKey) {
      return allConnections.filter(
        (c) => c.fromPlayer.key === selectedPlayerKey || c.toPlayer.key === selectedPlayerKey
      );
    }

    if (limitMode === 'all') {
      return allConnections;
    }

    return allConnections.slice(0, limitMode);
  }, [allConnections, limitMode, selectedPlayerKey]);

  // Jugadores activos con su posición media
  const activeNodes = useMemo(() => {
    return activeSquad
      .map((p) => {
        const pos = playerPositions.get(p.key);
        if (!pos) return null;
        const totalGiven = allConnections.filter((c) => c.fromPlayer.key === p.key).reduce((a, b) => a + b.passes, 0);
        const totalReceived = allConnections.filter((c) => c.toPlayer.key === p.key).reduce((a, b) => a + b.passes, 0);
        return {
          player: p,
          pos,
          totalGiven,
          totalReceived,
          totalTraffic: totalGiven + totalReceived,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      // Ordenamos para renderizar primero los de menos minutos y arriba los de más minutos
      .sort((a, b) => a.player.minutes - b.player.minutes);
  }, [activeSquad, playerPositions, allConnections]);

  const selectedNode = activeNodes.find((n) => n.player.key === selectedPlayerKey);

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Barra de control y selector de conexiones */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3.5 rounded-2xl ring-1 ring-gray-200/80 dark:ring-white/10 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/50 text-[#db0030]">
              <Share2 size={13} strokeWidth={2.4} />
            </span>
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {t('playerStats.hub.passingNetwork', 'Red de Pases entre Compañeros')}
            </h3>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#db0030] border border-red-200/60 dark:border-red-800/40">
              {t('playerStats.hub.passesCount', { count: visibleConnections.length })} · {t('playerStats.hub.allSquadCount', { count: activeNodes.length })}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {t('playerStats.hub.passingNetworkSubtitle', 'Las 11 conexiones más repetidas del equipo sobre las posiciones medias de todos los jugadores')}
          </p>
        </div>

        {/* Filtros de conexiones */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedPlayerKey && (
            <button
              type="button"
              onClick={() => setSelectedPlayerKey(null)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-colors shadow-xs"
            >
              <X size={12} />
              <span>{t('playerStats.hub.closeFocus', 'Ver todas las líneas')}</span>
            </button>
          )}

          {/* Selector de volumen de conexiones */}
          {!selectedPlayerKey && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-50 dark:bg-neutral-800 text-xs font-bold text-gray-600 dark:text-gray-300 ring-1 ring-gray-200/60 dark:ring-white/10">
              <Sparkles size={12} className="text-amber-500" />
              <span>{t('playerStats.hub.connections', 'Conexiones')}:</span>
              <div className="flex gap-1 ml-0.5">
                {([11, 15, 20, 'all'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setLimitMode(mode)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-black transition-all ${
                      limitMode === mode
                        ? 'bg-[#db0030] text-white shadow-xs'
                        : 'bg-white dark:bg-neutral-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {mode === 'all' ? t('playerStats.competition.all', 'Todas') : `Top ${mode}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400 bg-gray-100 dark:bg-neutral-800/80 px-2.5 py-1 rounded-xl ring-1 ring-gray-200/60 dark:ring-white/10">
            <Users size={12} className="text-gray-500" />
            <span>{t('playerStats.hub.allSquadCount', { count: activeNodes.length })}</span>
          </div>
        </div>
      </div>

      {/* Campograma con tamaño controlado y centrado para encajar en pantalla */}
      <div className="w-full max-w-[760px] mx-auto">
        <div className="relative aspect-[105/68] w-full max-h-[420px] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/10 dark:ring-white/10 bg-[#0a1f14]">
          <svg viewBox={`0 0 ${PITCH_W} ${PITCH_H}`} className="w-full h-full block select-none">
            <defs>
              <Grass id="passnet" />
              
              {/* Marcadores sutiles de flecha */}
              <marker
                id="arrow-subtle"
                viewBox="0 0 6 6"
                refX="4.8"
                refY="3"
                markerUnits="userSpaceOnUse"
                markerWidth="1.4"
                markerHeight="1.4"
                orient="auto-start-reverse"
              >
                <path d="M 0 0.8 L 4.8 3 L 0 5.2 z" fill="#ffffff" fillOpacity="0.85" />
              </marker>

              <marker
                id="arrow-hover"
                viewBox="0 0 6 6"
                refX="4.8"
                refY="3"
                markerUnits="userSpaceOnUse"
                markerWidth="1.8"
                markerHeight="1.8"
                orient="auto-start-reverse"
              >
                <path d="M 0 0.6 L 5 3 L 0 5.4 z" fill="#ffffff" />
              </marker>

              <marker
                id="arrow-given"
                viewBox="0 0 6 6"
                refX="4.8"
                refY="3"
                markerUnits="userSpaceOnUse"
                markerWidth="1.8"
                markerHeight="1.8"
                orient="auto-start-reverse"
              >
                <path d="M 0 0.6 L 5 3 L 0 5.4 z" fill="#facc15" />
              </marker>

              <marker
                id="arrow-received"
                viewBox="0 0 6 6"
                refX="4.8"
                refY="3"
                markerUnits="userSpaceOnUse"
                markerWidth="1.8"
                markerHeight="1.8"
                orient="auto-start-reverse"
              >
                <path d="M 0 0.6 L 5 3 L 0 5.4 z" fill="#38bdf8" />
              </marker>
            </defs>

            <use href="#passnet" />
            <PitchLines stroke="rgba(255,255,255,0.7)" />

            {/* Conexiones de pases directas desde posición media del pasador a posición media del receptor */}
            <g className="pass-links">
              {visibleConnections.map((conn) => {
                const isHovered = hoveredConnId === conn.id;
                const isFromFocused = focusedPlayerKey && conn.fromPlayer.key === focusedPlayerKey;
                const isToFocused = focusedPlayerKey && conn.toPlayer.key === focusedPlayerKey;
                const isRelatedToFocused = isFromFocused || isToFocused;
                const isDimmed = focusedPlayerKey && !isRelatedToFocused;

                const x1 = (conn.fromPos.x / 100) * PITCH_W;
                const y1 = (conn.fromPos.y / 100) * PITCH_H;
                const x2 = (conn.toPos.x / 100) * PITCH_W;
                const y2 = (conn.toPos.y / 100) * PITCH_H;

                const dx = x2 - x1;
                const dy = y2 - y1;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 3) return null;

                const ux = dx / dist;
                const uy = dy / dist;
                const px = -uy;
                const py = ux;

                // Radio de corte en los nodos
                const r1 = 2.1;
                const r2 = 2.1;

                const startX = x1 + ux * r1;
                const startY = y1 + uy * r1;
                const endX = x2 - ux * r2;
                const endY = y2 - uy * r2;

                // Curvatura suave para no solapar pases de ida y vuelta
                const curveOffset = Math.min(1.8, Math.max(0.6, dist * 0.05));
                const midX = (startX + endX) / 2 + px * curveOffset;
                const midY = (startY + endY) / 2 + py * curveOffset;

                // Grosor proporcional a la frecuencia de pases
                const strokeWidth = isRelatedToFocused || isHovered
                  ? 0.5 + (conn.passes / maxPasses) * 0.6
                  : 0.25 + (conn.passes / maxPasses) * 0.45;

                // Color según estado de interacción
                let strokeColor = 'rgba(255, 255, 255, 0.7)';
                let markerEnd = 'url(#arrow-subtle)';
                let opacity = Math.max(0.35, Math.min(0.85, 0.3 + (conn.passes / maxPasses) * 0.5));

                if (isHovered) {
                  strokeColor = '#ffffff';
                  markerEnd = 'url(#arrow-hover)';
                  opacity = 1;
                } else if (isFromFocused) {
                  strokeColor = '#facc15'; // Pases dados: amarillo
                  markerEnd = 'url(#arrow-given)';
                  opacity = 1;
                } else if (isToFocused) {
                  strokeColor = '#38bdf8'; // Pases recibidos: celeste
                  markerEnd = 'url(#arrow-received)';
                  opacity = 1;
                } else if (isDimmed) {
                  opacity = 0.1;
                }

                const pathData = `M ${startX.toFixed(2)} ${startY.toFixed(2)} Q ${midX.toFixed(2)} ${midY.toFixed(2)} ${endX.toFixed(2)} ${endY.toFixed(2)}`;

                return (
                  <g
                    key={conn.id}
                    onMouseEnter={(e) => {
                      setHoveredConnId(conn.id);
                      const passerTotal = conn.fromPlayer.total['passes_given'] || conn.fromPlayer.total['passes_ok'] || 1;
                      const pctOfPasser = Math.round((conn.passes / passerTotal) * 100);
                      setConnectionTooltip({
                        data: {
                          fromPlayer: conn.fromPlayer,
                          toPlayer: conn.toPlayer,
                          fromInfo: conn.fromPlayer.playerId ? info?.get(conn.fromPlayer.playerId) : undefined,
                          toInfo: conn.toPlayer.playerId ? info?.get(conn.toPlayer.playerId) : undefined,
                          passes: conn.passes,
                          pctOfPasser: pctOfPasser > 0 ? pctOfPasser : undefined,
                        },
                        coords: { x: e.clientX, y: e.clientY },
                      });
                    }}
                    onMouseMove={(e) => {
                      setConnectionTooltip((prev) => (prev ? { ...prev, coords: { x: e.clientX, y: e.clientY } } : null));
                    }}
                    onMouseLeave={() => {
                      setHoveredConnId(null);
                      setConnectionTooltip(null);
                    }}
                    className="cursor-pointer transition-opacity duration-150"
                  >
                    {/* Trazo invisible grueso para interacción fácil */}
                    <path d={pathData} fill="none" stroke="transparent" strokeWidth={3.5} />

                    {/* Línea de pase principal */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeOpacity={opacity}
                      strokeLinecap="round"
                      markerEnd={markerEnd}
                    />

                    {/* Badge con el número de pases */}
                    {(isHovered || isRelatedToFocused || (conn.passes >= Math.max(8, maxPasses * 0.7) && !isDimmed)) && (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x={-2.0}
                          y={-1.2}
                          width={4.0}
                          height={2.4}
                          rx={0.6}
                          fill="#0f172a"
                          fillOpacity={0.92}
                          stroke={isHovered ? '#ffffff' : isFromFocused ? '#facc15' : isToFocused ? '#38bdf8' : 'rgba(255,255,255,0.7)'}
                          strokeWidth={0.2}
                        />
                        <text
                          x={0}
                          y={0.5}
                          textAnchor="middle"
                          fontSize={1.4}
                          fontWeight={900}
                          fill="#ffffff"
                        >
                          {conn.passes}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Nodos de todos los jugadores en su posición media */}
            <g className="player-nodes">
              {activeNodes.map(({ player, pos, totalGiven, totalReceived }) => {
                const cx = (pos.x / 100) * PITCH_W;
                const cy = (pos.y / 100) * PITCH_H;
                const isSelected = selectedPlayerKey === player.key;
                const isHovered = hoveredPlayerKey === player.key;
                const isDimmed = focusedPlayerKey && focusedPlayerKey !== player.key;
                const r = 1.9 + Math.min(0.8, (player.minutes / Math.max(1, squad[0]?.minutes || 1)) * 0.6);

                // Top socio para el tooltip
                const playerConns = allConnections.filter((c) => c.fromPlayer.key === player.key);
                const topConn = playerConns[0];
                const topPartner = topConn
                  ? {
                      name: displayName(topConn.toPlayer).split(' ').slice(-1)[0],
                      dorsal: topConn.toDorsal,
                      count: topConn.passes,
                    }
                  : undefined;

                return (
                  <g
                    key={player.key}
                    className="cursor-pointer group"
                    style={{ opacity: isDimmed ? 0.4 : 1, transition: 'opacity 0.2s ease' }}
                    onClick={() => {
                      setSelectedPlayerKey(isSelected ? null : player.key);
                    }}
                    onMouseEnter={(e) => {
                      setHoveredPlayerKey(player.key);
                      setPlayerTooltip({
                        data: {
                          player,
                          hubInfo: player.playerId ? info?.get(player.playerId) : undefined,
                          context: 'passes',
                          extra: {
                            totalGiven,
                            totalReceived,
                            topPartner,
                          },
                        },
                        coords: { x: e.clientX, y: e.clientY },
                      });
                    }}
                    onMouseMove={(e) => {
                      setPlayerTooltip((prev) => (prev ? { ...prev, coords: { x: e.clientX, y: e.clientY } } : null));
                    }}
                    onMouseLeave={() => {
                      setHoveredPlayerKey(null);
                      setPlayerTooltip(null);
                    }}
                  >
                    <title>{`${displayName(player)} · ${t('playerStats.hub.passesGiven', 'Pases dados')}: ${totalGiven} | ${t('playerStats.hub.passesReceived', 'Pases recibidos')}: ${totalReceived}`}</title>

                    {/* Anillo de selección */}
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r + 1.1}
                        fill="none"
                        stroke="#facc15"
                        strokeWidth={0.5}
                        strokeDasharray="1.0 0.8"
                        className="animate-spin-slow origin-center"
                      />
                    )}

                    {/* Círculo base del jugador */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={ROLE_COLOR[player.role]}
                      stroke="#ffffff"
                      strokeWidth={isSelected || isHovered ? 0.6 : 0.35}
                      fillOpacity={0.96}
                      className="transition-transform group-hover:scale-115"
                    />

                    {/* Dorsal */}
                    <text
                      x={cx}
                      y={cy + 0.7}
                      textAnchor="middle"
                      fontSize={1.8}
                      fontWeight={900}
                      fill="#ffffff"
                    >
                      {player.dorsal}
                    </text>

                    {/* Nombre del jugador debajo */}
                    <text
                      x={cx}
                      y={cy + r + 2.0}
                      textAnchor="middle"
                      fontSize={1.5}
                      fontWeight={800}
                      fill="#ffffff"
                      style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.92)', strokeWidth: 0.55 }}
                    >
                      {displayName(player).split(' ').slice(-1)[0]}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Tooltips interactivos flotantes */}
      <PitchPlayerTooltip data={playerTooltip?.data ?? null} coords={playerTooltip?.coords ?? null} />
      <PitchConnectionTooltip data={connectionTooltip?.data ?? null} coords={connectionTooltip?.coords ?? null} />

      {/* Leyenda y Conexiones Top */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Detalle del jugador seleccionado */}
        <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl ring-1 ring-gray-200/80 dark:ring-white/10 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
              {selectedNode ? t('playerStats.hub.selectedPlayer', 'Jugador seleccionado') : t('playerStats.hub.instructions', 'Interacción')}
            </div>
            {selectedNode ? (
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
                    style={{ background: ROLE_COLOR[selectedNode.player.role] }}
                  >
                    {selectedNode.player.dorsal}
                  </span>
                  <span className="font-black text-sm text-gray-900 dark:text-white truncate">
                    {displayName(selectedNode.player)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40">
                    <div className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">{t('playerStats.hub.passesGiven', 'Pases dados')}</div>
                    <div className="text-lg font-black text-amber-900 dark:text-amber-200 tabular-nums">{selectedNode.totalGiven}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40">
                    <div className="text-[10px] font-black uppercase text-sky-700 dark:text-sky-400">{t('playerStats.hub.passesReceived', 'Pases recibidos')}</div>
                    <div className="text-lg font-black text-sky-900 dark:text-sky-200 tabular-nums">{selectedNode.totalReceived}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 leading-relaxed mt-1">
                {t('playerStats.hub.passInstruction', 'Haz clic en cualquier jugador para aislar sus pases salientes y entrantes.')}
              </p>
            )}
          </div>

          {selectedNode && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setSelectedPlayerKey(null)}
                className="flex-1 py-1.5 text-xs font-bold rounded-xl bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 transition-colors"
              >
                {t('playerStats.hub.closeFocus', 'Cerrar foco')}
              </button>
              <button
                type="button"
                onClick={() => onOpen(selectedNode.player)}
                className="flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl bg-gray-900 dark:bg-neutral-700 text-white hover:bg-gray-800 transition-colors"
              >
                {t('playerStats.hub.viewProfile', 'Ver perfil')}
              </button>
            </div>
          )}
        </div>

        {/* Top asociaciones más frecuentes */}
        <div className="md:col-span-2 bg-white dark:bg-neutral-900 p-3.5 rounded-2xl ring-1 ring-gray-200/80 dark:ring-white/10 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {t('playerStats.hub.topConnections', 'Top 11 Conexiones más repetidas')}
            </span>
            <span className="text-[10px] font-bold text-gray-400">
              {t('playerStats.hub.shownOfTotal', { shown: visibleConnections.length, total: allConnections.length })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allConnections.slice(0, 11).map((conn, idx) => (
              <div
                key={conn.id}
                onMouseEnter={() => setHoveredConnId(conn.id)}
                onMouseLeave={() => setHoveredConnId(null)}
                className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all border ${
                  hoveredConnId === conn.id
                    ? 'bg-red-50 dark:bg-red-950/40 border-[#db0030]/40'
                    : 'bg-gray-50 dark:bg-neutral-800/60 border-gray-100 dark:border-white/5 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-[10px] font-black text-gray-400 w-3">#{idx + 1}</span>
                  <span className="font-extrabold text-gray-800 dark:text-gray-200 truncate">
                    #{conn.fromDorsal} {displayName(conn.fromPlayer).split(' ').slice(-1)[0]}
                  </span>
                  <ArrowRight size={11} className="text-[#db0030] shrink-0" />
                  <span className="font-extrabold text-gray-800 dark:text-gray-200 truncate">
                    #{conn.toDorsal} {displayName(conn.toPlayer).split(' ').slice(-1)[0]}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-neutral-700 font-black text-[11px] tabular-nums text-gray-900 dark:text-white shadow-xs ml-2">
                  {t('playerStats.hub.passesCount', { count: conn.passes })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassingNetworkPitch;
