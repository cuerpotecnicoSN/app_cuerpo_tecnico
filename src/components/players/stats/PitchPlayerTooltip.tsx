import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Activity } from 'lucide-react';
import type { PlayerAggregate, Role } from '../../../utils/playerPaniniStats';

const ROLE_COLOR: Record<Role, string> = { P: '#f59e0b', D: '#3b82f6', C: '#10b981', A: '#db0030' };
const PLACEHOLDER = 'unsplash.com';

export interface PlayerTooltipData {
  player: PlayerAggregate;
  hubInfo?: { id: string; name: string; avatar?: string };
  context?: 'positions' | 'passes' | 'recoveries' | 'crosses' | 'heatmaps';
  extra?: {
    totalGiven?: number;
    totalReceived?: number;
    topPartner?: { name: string; dorsal: number; count: number };
    rankBadge?: string;
    metricLabel?: string;
    metricValue?: string | number;
    pctOfTeam?: number;
  };
}

export interface ConnectionTooltipData {
  fromPlayer: PlayerAggregate;
  toPlayer: PlayerAggregate;
  fromInfo?: { id: string; name: string; avatar?: string };
  toInfo?: { id: string; name: string; avatar?: string };
  passes: number;
  pctOfPasser?: number;
}

interface PlayerTooltipProps {
  data: PlayerTooltipData | null;
  coords: { x: number; y: number } | null;
}

interface ConnectionTooltipProps {
  data: ConnectionTooltipData | null;
  coords: { x: number; y: number } | null;
}

/** Avatar con fallback de dorsal si no tiene imagen */
const PlayerAvatar: React.FC<{
  player: PlayerAggregate;
  avatar?: string;
  size?: number;
}> = ({ player, avatar, size = 44 }) => {
  const hasAvatar = avatar && !avatar.includes(PLACEHOLDER);

  if (hasAvatar) {
    return (
      <img
        src={avatar}
        alt={player.name}
        className="rounded-2xl object-cover shrink-0 ring-2 ring-white/20 shadow-md bg-neutral-800"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-2xl flex items-center justify-center text-white font-black shrink-0 ring-2 ring-white/20 shadow-md"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, ${ROLE_COLOR[player.role]}, #111827)`,
      }}
    >
      {player.dorsal}
    </div>
  );
};

export const PitchPlayerTooltip: React.FC<PlayerTooltipProps> = ({ data, coords }) => {
  const { t } = useTranslation();
  if (!data || !coords) return null;

  const { player, hubInfo, context = 'positions', extra } = data;
  const fullName = hubInfo?.name || player.name;
  const roleColor = ROLE_COLOR[player.role];
  const roleName = t(`playerStats.roles.${player.role}`);

  // Ajuste de posición para que no se salga de la pantalla
  const width = 290;
  const height = 240;
  const padding = 15;

  let left = coords.x + padding;
  let top = coords.y + padding;

  if (typeof window !== 'undefined') {
    if (left + width > window.innerWidth - 10) {
      left = coords.x - width - padding;
    }
    if (top + height > window.innerHeight - 10) {
      top = coords.y - height - padding;
    }
  }

  // Métricas específicas
  const passesOk = player.total['passes_ok'] || 0;
  const recTotal = player.total['recoveries'] || 0;
  const recAttack = player.total['rec_attack'] || 0;
  const crossesTotal = player.total['crosses'] || 0;
  const usefulCrosses = player.attempts?.['crosses']?.ok || 0;
  const touchesTotal = player.lines.reduce((a, l) => a + (l.touches?.length || 0), 0);
  const usefulActions = player.total['useful'] || 0;

  return (
    <div
      className="fixed z-50 pointer-events-none transition-transform duration-75 ease-out"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
      }}
    >
      <div className="bg-[#12131a]/95 backdrop-blur-xl border border-white/15 rounded-3xl p-3.5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Resplandor del rol */}
        <div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-30"
          style={{ background: roleColor }}
        />

        {/* Cabecera del jugador con Foto */}
        <div className="relative flex items-center gap-3 pb-3 border-b border-white/10">
          <PlayerAvatar player={player} avatar={hubInfo?.avatar} size={48} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase text-white tracking-wider"
                style={{ background: roleColor }}
              >
                #{player.dorsal} {roleName}
              </span>
              {extra?.rankBadge && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {extra.rankBadge}
                </span>
              )}
            </div>

            <h4 className="text-sm font-black text-white truncate mt-1 tracking-tight">{fullName}</h4>
            <div className="text-[11px] font-bold text-gray-400">
              {t('playerStats.hub.playedMatches', { minutes: player.minutes, matches: player.matches })}
            </div>
          </div>
        </div>

        {/* Bloque de datos según el contexto del campograma */}
        <div className="relative pt-2.5 space-y-2">
          {context === 'passes' && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="p-2 rounded-xl bg-white/[0.05] border border-white/5">
                  <div className="text-[9px] font-black uppercase text-amber-400">{t('playerStats.hub.passesGiven', 'Pases dados')}</div>
                  <div className="text-base font-black text-white tabular-nums">{extra?.totalGiven ?? passesOk}</div>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.05] border border-white/5">
                  <div className="text-[9px] font-black uppercase text-sky-400">{t('playerStats.hub.passesReceived', 'Pases recibidos')}</div>
                  <div className="text-base font-black text-white tabular-nums">{extra?.totalReceived ?? 0}</div>
                </div>
              </div>

              {extra?.topPartner && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/5 text-[11px]">
                  <span className="text-gray-400 font-bold">{t('playerStats.hub.mainPartner', 'Principal socio:')}</span>
                  <span className="font-black text-white flex items-center gap-1">
                    #{extra.topPartner.dorsal} {extra.topPartner.name}
                    <span className="text-amber-400">({extra.topPartner.count})</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {context === 'recoveries' && (
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="text-[9px] font-black uppercase text-amber-400">{t('playerStats.hub.recoveries', 'Recuperaciones')}</div>
                <div className="text-base font-black text-white tabular-nums">{recTotal}</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.05] border border-white/5">
                <div className="text-[9px] font-black uppercase text-gray-400">{t('playerStats.hub.oppHalf', 'En campo rival')}</div>
                <div className="text-base font-black text-white tabular-nums">{recAttack}</div>
              </div>
            </div>
          )}

          {context === 'crosses' && (
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-[9px] font-black uppercase text-emerald-400">{t('playerStats.metrics.crosses', 'Centros totales')}</div>
                <div className="text-base font-black text-white tabular-nums">{crossesTotal}</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.05] border border-white/5">
                <div className="text-[9px] font-black uppercase text-gray-400">{t('playerStats.metrics.crosses_ok', 'Centros útiles')}</div>
                <div className="text-base font-black text-white tabular-nums">
                  {usefulCrosses} {crossesTotal > 0 ? `(${Math.round((usefulCrosses / crossesTotal) * 100)}%)` : ''}
                </div>
              </div>
            </div>
          )}

          {(context === 'positions' || context === 'heatmaps') && (
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-2 rounded-xl bg-white/[0.05] border border-white/5">
                <div className="text-[9px] font-black uppercase text-gray-400">{t('playerStats.hub.ballTouches', 'Toques de balón')}</div>
                <div className="text-base font-black text-white tabular-nums">{touchesTotal}</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.05] border border-white/5">
                <div className="text-[9px] font-black uppercase text-gray-400">{t('playerStats.metrics.useful', 'Acciones útiles')}</div>
                <div className="text-base font-black text-white tabular-nums">{usefulActions}</div>
              </div>
            </div>
          )}
        </div>

        {/* Micro-hint */}
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400 font-bold">
          <span className="flex items-center gap-1 text-[var(--color-primary,#db0030)]">
            <Activity size={12} /> {t('playerStats.hub.clickToOpen', 'Pulsa para abrir ficha')}
          </span>
          <span className="text-gray-500">#{player.dorsal}</span>
        </div>
      </div>
    </div>
  );
};

export const PitchConnectionTooltip: React.FC<ConnectionTooltipProps> = ({ data, coords }) => {
  const { t } = useTranslation();
  if (!data || !coords) return null;

  const { fromPlayer, toPlayer, fromInfo, toInfo, passes, pctOfPasser } = data;
  const fromName = fromInfo?.name || fromPlayer.name;
  const toName = toInfo?.name || toPlayer.name;

  const width = 280;
  const height = 180;
  const padding = 15;

  let left = coords.x + padding;
  let top = coords.y + padding;

  if (typeof window !== 'undefined') {
    if (left + width > window.innerWidth - 10) left = coords.x - width - padding;
    if (top + height > window.innerHeight - 10) top = coords.y - height - padding;
  }

  return (
    <div
      className="fixed z-50 pointer-events-none transition-transform duration-75 ease-out"
      style={{ left: `${left}px`, top: `${top}px`, width: `${width}px` }}
    >
      <div className="bg-[#12131a]/95 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-3.5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera Duo */}
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <PlayerAvatar player={fromPlayer} avatar={fromInfo?.avatar} size={36} />
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase text-amber-400">{t('playerStats.hub.passer', 'Pasador')}</div>
              <div className="text-xs font-black text-white truncate max-w-[80px]">
                #{fromPlayer.dorsal} {fromName.split(' ').slice(-1)[0]}
              </div>
            </div>
          </div>

          <div className="p-1.5 rounded-full bg-white/10 text-amber-400">
            <ArrowRight size={14} strokeWidth={3} />
          </div>

          <div className="flex items-center gap-2 text-right">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase text-sky-400">{t('playerStats.hub.receiver', 'Receptor')}</div>
              <div className="text-xs font-black text-white truncate max-w-[80px]">
                #{toPlayer.dorsal} {toName.split(' ').slice(-1)[0]}
              </div>
            </div>
            <PlayerAvatar player={toPlayer} avatar={toInfo?.avatar} size={36} />
          </div>
        </div>

        {/* Métricas del enlace */}
        <div className="pt-2.5 flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black uppercase text-gray-400">{t('playerStats.hub.connectionVolume', 'Volumen de conexión')}</div>
            <div className="text-xl font-black text-amber-400 tabular-nums">{t('playerStats.hub.passesCount', { count: passes })}</div>
          </div>

          {pctOfPasser !== undefined && (
            <div className="text-right">
              <div className="text-[9px] font-black uppercase text-gray-400">{t('playerStats.hub.frequency', 'Frecuencia')}</div>
              <div className="text-sm font-black text-white tabular-nums">{t('playerStats.hub.pctOfPasser', { pct: pctOfPasser })}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
