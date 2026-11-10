import { useEffect, useState } from 'react';
import { ArrowUpRight, User, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { usePlayerSeasonStats } from '../../../hooks/usePlayerSeasonStats';
import { translatePosition } from '../../../utils/positionTranslations';
import PlayerDevelopmentSectionsList from './PlayerDevelopmentSectionsList';

import {
  getDevItems,
  getDevItemComments,
  type DevItem,
  type DevItemComment,
} from '../../../services/playerDevelopmentSections';

type Mode = 'staff' | 'player';
export type PlanSection = 'what' | 'how' | 'clips' | 'voice' | 'calendar';

interface DbPlayer {
  id: string;
  first_name?: string;
  last_name?: string;
  football_name?: string;
  main_position?: string;
  category?: string;
  photo_url?: string;
  dorsal?: number;
  kit_number?: number;
  tutor_id?: string | null;
}

const display = 'font-[family-name:var(--font-display)]';

export default function PlayerDevelopmentPlan({ player, mode, section, hideHero, onViewStats }: {
  player: DbPlayer;
  mode: Mode;
  section?: PlanSection;
  hideHero?: boolean;
  onViewStats?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isStaff = mode === 'staff';
  const { user } = useAuth();
  const playerId = player.id;
  const show = (s: PlanSection) => !section || section === s;


  const [devItems, setDevItems] = useState<DevItem[]>([]);
  const [devComments, setDevComments] = useState<DevItemComment[]>([]);
  const [staff, setStaff] = useState<{ id: string; full_name: string | null }[]>([]);
  const [tutorId, setTutorId] = useState<string | null>(player.tutor_id ?? null);
  const [error, setError] = useState<string | null>(null);

  const stats = usePlayerSeasonStats(player);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try { await fn(); return true; } catch (e) { setError(e instanceof Error ? e.message : t('playerPlan.saveError')); return false; }
  };

  const loadDevItems = async () => {
    try {
      const items = await getDevItems(playerId);
      setDevItems(items);
      setDevComments(await getDevItemComments(items.map((i) => i.id)));
    } catch {
      setDevItems([]);
      setDevComments([]);
    }
  };

  useEffect(() => {
    loadDevItems();
    supabase.from('profiles').select('id, full_name, role').neq('role', 'Jugador').neq('role', 'Pendiente')
      .then(({ data }) => setStaff(data ?? []));
    setTutorId(player.tutor_id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const tutorName = staff.find((s) => s.id === tutorId)?.full_name;
  const name = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim();
  const dorsal = player.dorsal ?? (player.kit_number || undefined);

  const heroStats = stats?.role === 'P'
    ? [
        { l: t('playerStats.metrics.saves'), v: stats.total.saves ?? 0 },
        { l: t('playerStats.metrics.conceded'), v: stats.total.conceded ?? 0 },
      ]
    : [
        { l: t('playerPlan.goals'), v: stats?.total.goals ?? 0 },
        { l: t('playerPlan.assists'), v: stats?.total.assists ?? 0 },
      ];

  return (
    <div className="space-y-10 animate-fade-in">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex justify-between">
          {error}<button onClick={() => setError(null)} aria-label={t('playerPlan.cancel')}><X size={16} /></button>
        </div>
      )}

      {/* ===================== CABECERA ===================== */}
      {show('what') && !hideHero && (
        <section className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] bg-black text-white shadow-xl">
          {/* Las franjas rossoneras y el dorsal son la identidad de la ficha */}
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 w-3/4 sm:w-2/3 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(90deg, #db0030 0 36px, #000 36px 72px)',
              maskImage: 'linear-gradient(to left, rgba(0,0,0,.95), transparent)',
              WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,.95), transparent)',
            }}
          />
          {dorsal ? (
            <div
              aria-hidden
              className="absolute right-2 sm:right-12 top-1/2 -translate-y-1/2 select-none pointer-events-none flex items-center justify-center z-0 opacity-40 sm:opacity-100"
            >
              <span
                className={`${display} text-[6rem] sm:text-[13.5rem] font-black tracking-tighter leading-none select-none`}
                style={{
                  color: 'rgba(255, 255, 255, 0.18)',
                  WebkitTextStroke: '2px rgba(255, 255, 255, 0.85)',
                  textShadow: '0 4px 15px rgba(0, 0, 0, 0.9), 0 0 25px rgba(255, 255, 255, 0.25), 0 0 45px rgba(219, 0, 48, 0.4)',
                  filter: 'drop-shadow(3px 5px 2px rgba(0,0,0,0.85)) drop-shadow(-1px -1px 0 rgba(255,255,255,0.4))',
                }}
              >
                {dorsal}
              </span>
            </div>
          ) : null}

          <div className="relative z-10 p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-7 text-center sm:text-left">
              {/* Foto ajustada para llenar el marco con fondo blanco */}
              <div className="w-32 h-40 sm:w-44 sm:h-56 shrink-0 rounded-2xl overflow-hidden bg-white shadow-[0_12px_35px_rgba(0,0,0,0.7)] border-2 border-white/60 flex items-center justify-center">
                {player.photo_url ? (
                  <img
                    src={player.photo_url}
                    alt={name}
                    className="w-full h-full object-cover object-top bg-white"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white">
                    <User size={48} className="text-gray-300" />
                  </div>
                )}
              </div>
              <div className="min-w-0 w-full sm:w-auto sm:pr-48">
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-white/60">{t('playerPlan.badge')}</p>
                <h1 className={`${display} text-2xl sm:text-5xl font-black tracking-tight leading-tight mt-0.5 sm:mt-1 break-words`}>{name || t('playerPlan.player')}</h1>
                <dl className="mt-2.5 sm:mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 sm:gap-x-5 gap-y-1.5 text-xs sm:text-sm">
                  <div className="font-semibold bg-white/10 sm:bg-transparent px-2.5 py-0.5 sm:p-0 rounded-full">{player.main_position ? translatePosition(player.main_position, i18n.language) : t('playerPlan.noPosition')}</div>
                  {player.category && <div className="font-semibold bg-white/10 sm:bg-transparent px-2.5 py-0.5 sm:p-0 rounded-full">{player.category}</div>}
                  <div className="flex items-center gap-1.5">
                    <dt className="text-white/70">{t('playerPlan.tutor')}</dt>
                    <dd className="font-semibold">
                      {isStaff ? (
                        <select
                          aria-label={t('playerPlan.tutor')}
                          className="!w-auto !p-0 !border-0 !bg-transparent !text-white font-semibold outline-none cursor-pointer [&>option]:text-gray-900 focus-visible:underline"
                          value={tutorId ?? ''}
                          onChange={(e) => run(async () => {
                            const v = e.target.value || null;
                            const { error: err } = await supabase.from('players').update({ tutor_id: v }).eq('id', playerId);
                            if (err) throw err;
                            setTutorId(v);
                          })}
                        >
                          <option value="">{t('playerPlan.unassigned')}</option>
                          {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name || t('playerPlan.unnamed')}</option>)}
                        </select>
                      ) : (tutorName || t('playerPlan.unassigned'))}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-5 sm:mt-6 pt-4 border-t border-white/20 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
              <dl className="w-full sm:w-auto grid grid-cols-4 sm:flex sm:flex-wrap gap-2 sm:gap-x-12 text-center sm:text-left">
                {[
                  { l: t('playerPlan.matches'), v: stats?.matches ?? 0 },
                  { l: t('playerPlan.minutes'), v: `${stats?.minutes ?? 0}'` },
                  ...heroStats,
                ].map((k) => (
                  <div key={k.l} className="bg-white/5 sm:bg-transparent rounded-xl py-2 px-1 sm:p-0">
                    <dd className={`${display} text-2xl sm:text-3xl font-black tabular-nums leading-none`}>{k.v}</dd>
                    <dt className="text-[11px] sm:text-xs text-white/70 mt-1 truncate">{k.l}</dt>
                  </div>
                ))}
              </dl>
              {onViewStats && (
                <button
                  onClick={onViewStats}
                  className="w-full sm:w-auto justify-center flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 active:scale-95 transition-all shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {t('playerPlan.viewStats')} <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===================== SECCIONES INTERACTIVAS (HISTORIAL, INCISOS Y COMENTARIOS) ===================== */}
      {show('what') && (
        <PlayerDevelopmentSectionsList
          playerId={playerId}
          items={devItems}
          comments={devComments}
          isStaff={isStaff}
          myId={user?.id}
          playerName={name}
          onRefresh={loadDevItems}
        />
      )}

    </div>
  );
}
