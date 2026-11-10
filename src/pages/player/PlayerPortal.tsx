import TranslatedText from '../../components/common/TranslatedText';
import { useEffect, useState } from 'react';
import { LogOut, Target, ListChecks, Film, MessageSquareText, BarChart2, Weight, Stethoscope, FileText, Loader2, Globe, ClipboardList, Menu, X } from 'lucide-react';
import PlayerForms from '../../components/forms/PlayerForms';
import NotificationBell from '../../components/notifications/NotificationBell';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import type { Player, SeasonReport } from '../../components/types';
import { getSeasonReports } from '../../services/playerObjectives';
import PlayerDevelopmentPlan, { type PlanSection } from '../../components/players/development/PlayerDevelopmentPlan';
import PlayerMatchStatsTab from '../../components/players/stats/PlayerMatchStatsTab';
import PlayerWeightTab from '../../components/pro/PlayerWeightTab';
import PlayerInjuriesTab from '../../components/pro/PlayerInjuriesTab';

type Tab = PlanSection | 'partidos' | 'peso' | 'lesiones' | 'informes' | 'forms';

const PLAN_SECTIONS: PlanSection[] = ['what', 'how', 'clips', 'voice'];
const isPlanSection = (tab: Tab): tab is PlanSection => (PLAN_SECTIONS as Tab[]).includes(tab);

function ReportsList({ playerId }: { playerId: string }) {
  const [reports, setReports] = useState<SeasonReport[] | null>(null);
  const { t } = useTranslation();
  useEffect(() => { getSeasonReports(playerId).then(setReports).catch(() => setReports([])); }, [playerId]);
  if (!reports) return <Loader2 className="animate-spin text-gray-400 mx-auto" />;
  if (!reports.length) return <p className="text-sm text-gray-400">{t('playerPortal.noReports')}</p>;
  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <TranslatedText text={r.summary} as="p" className="text-sm text-gray-700 whitespace-pre-line" />
          {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#db0030] underline mt-2 inline-block">{t('playerPortal.viewDocument')}</a>}
        </div>
      ))}
    </div>
  );
}

export default function PlayerPortal() {
  const { playerId, profile, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const [player, setPlayer] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('what');
  const [menuOpen, setMenuOpen] = useState(false);

  // Si el idioma actual no es ni 'it' ni 'en', forzar 'it' por defecto para el jugador
  const activeLang: 'it' | 'en' = i18n.language?.startsWith('en') ? 'en' : 'it';

  const selectTab = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  const toggleLanguage = () => {
    const next = activeLang === 'it' ? 'en' : 'it';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  };

  useEffect(() => {
    if (!i18n.language || (!i18n.language.startsWith('it') && !i18n.language.startsWith('en'))) {
      i18n.changeLanguage('it');
      localStorage.setItem('language', 'it');
    }
  }, [i18n]);

  useEffect(() => {
    if (!playerId) { setLoading(false); return; }
    supabase.from('players').select('*').eq('id', playerId).single()
      .then(({ data }) => { setPlayer(data); setLoading(false); });
  }, [playerId]);

  const name = player ? `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() : profile?.full_name ?? '';
  const playerForStats: Player | undefined = player ? {
    id: player.id, name, position: player.main_position ?? '', age: 0, weight: player.weight_kg ?? 0, height: player.height_cm ?? 0,
    bodyFat: 0, history: '', strengths: [], weaknesses: [], goals: [], status: player.medical_status ?? 'Apto', avatar: player.photo_url ?? '',
  } : undefined;

  const tabItems: { id: Tab; icon: typeof Target }[] = [
    { id: 'what', icon: Target },
    { id: 'forms', icon: ClipboardList },
    { id: 'how', icon: ListChecks },
    { id: 'clips', icon: Film },
    { id: 'voice', icon: MessageSquareText },
    { id: 'partidos', icon: BarChart2 },
    { id: 'peso', icon: Weight },
    { id: 'lesiones', icon: Stethoscope },
    { id: 'informes', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-[#111114] text-white shadow-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <img src="/escudo.png" alt="" className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0" />
            <div className="min-w-0 flex-1 pr-1">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-[#ff4d6d] leading-none">{t('playerPortal.title')}</p>
              <p className="font-extrabold text-sm sm:text-base leading-tight break-words sm:truncate">{name}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <NotificationBell
              audience="player"
              dark
              onOpen={(n) => {
                const map: Record<string, Tab> = {
                  form_assigned: 'forms', objective: 'what', objective_comment: 'what', focus: 'how',
                  clip: 'clips', clip_comment: 'clips', video_note: 'clips', self_assessment: 'voice',
                  report: 'informes',
                };
                selectTab(map[n.kind] ?? 'what');
              }}
            />
            {/* Selector de idioma sólo IT / EN para el jugador */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black uppercase tracking-wider text-white transition-all active:scale-95"
              title="Cambia lingua / Switch language"
            >
              <Globe size={13} className="text-[#ff4d6d]" />
              <span>{activeLang === 'it' ? 'IT' : 'EN'}</span>
            </button>

            {/* Menú de 3 rayas (hamburguesa) con todas las páginas y salir */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1.5 ${menuOpen ? 'bg-white/15 text-white' : ''}`}
                aria-label="Menu"
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 max-h-[85vh] overflow-y-auto rounded-2xl bg-[#18181c] border border-white/10 shadow-2xl p-2 z-40 animate-fade-in text-white divide-y divide-white/10">
                    <div className="px-3 py-2.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff4d6d]">{t('playerPortal.title')}</p>
                      <p className="text-sm font-extrabold truncate text-white mt-0.5">{name}</p>
                    </div>

                    <div className="py-1.5 space-y-0.5">
                      {tabItems.map(({ id, icon: Icon }) => {
                        const active = tab === id;
                        return (
                          <button
                            key={id}
                            onClick={() => {
                              selectTab(id);
                              setMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                              active
                                ? 'bg-[#db0030] text-white shadow-md font-extrabold'
                                : 'text-white/75 hover:text-white hover:bg-white/10 active:bg-white/15'
                            }`}
                          >
                            <Icon size={16} className={active ? 'text-white' : 'text-[#ff4d6d]'} />
                            <span className="truncate">{t(`playerPortal.tabs.${id}`)}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1.5">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 active:bg-red-500/20 transition-all text-left"
                      >
                        <LogOut size={16} />
                        <span>{t('playerPortal.exit')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : !player || !playerId ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
            {t('playerPortal.notLinked')}
          </div>
        ) : (
          <>
            {/* Siempre montado: al cambiar de sección no se recarga ni se pierde lo que estaba escribiendo */}
            <div hidden={!isPlanSection(tab)}>
              <PlayerDevelopmentPlan
                player={player as { id: string }}
                mode="player"
                section={isPlanSection(tab) ? tab : 'what'}
                onViewStats={() => selectTab('partidos')}
              />
            </div>
            {tab === 'partidos' && <PlayerMatchStatsTab playerId={playerId} playerName={name} playerDbInfo={playerForStats} />}
            {tab === 'peso' && <PlayerWeightTab playerId={playerId} readOnly />}
            {tab === 'lesiones' && <PlayerInjuriesTab playerId={playerId} readOnly />}
            {tab === 'informes' && <ReportsList playerId={playerId} />}
            {tab === 'forms' && <PlayerForms playerId={playerId} mode="player" />}
          </>
        )}
      </main>
    </div>
  );
}
