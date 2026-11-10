import TranslatedText from '../../components/common/TranslatedText';
import { useEffect, useState } from 'react';
import { LogOut, Target, ListChecks, Film, MessageSquareText, CalendarDays, BarChart2, Weight, Stethoscope, FileText, Loader2, Globe, ClipboardList } from 'lucide-react';
import PlayerForms from '../../components/forms/PlayerForms';
import NotificationBell from '../../components/notifications/NotificationBell';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import type { MeetingDB, Player, SeasonReport } from '../../components/types';
import { getMeetingsForPlayer } from '../../services/meetings';
import { getSeasonReports } from '../../services/playerObjectives';
import PlayerDevelopmentPlan, { type PlanSection } from '../../components/players/development/PlayerDevelopmentPlan';
import PlayerMatchStatsTab from '../../components/players/stats/PlayerMatchStatsTab';
import PlayerWeightTab from '../../components/pro/PlayerWeightTab';
import PlayerInjuriesTab from '../../components/pro/PlayerInjuriesTab';

type Tab = PlanSection | 'partidos' | 'peso' | 'lesiones' | 'informes' | 'forms';

const PLAN_SECTIONS: PlanSection[] = ['what', 'how', 'clips', 'voice', 'calendar'];
const isPlanSection = (tab: Tab): tab is PlanSection => (PLAN_SECTIONS as Tab[]).includes(tab);

const MEETING_SECTIONS: (keyof MeetingDB)[] = ['objective', 'development', 'positive_points', 'improvements', 'agreements', 'next_steps'];

const fmtDate = (d: string, lang: 'it' | 'en') =>
  new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

function MeetingsList({ playerId, lang }: { playerId: string; lang: 'it' | 'en' }) {
  const [meetings, setMeetings] = useState<MeetingDB[] | null>(null);
  const { t } = useTranslation();
  useEffect(() => { getMeetingsForPlayer(playerId).then(setMeetings).catch(() => setMeetings([])); }, [playerId]);
  if (!meetings) return <Loader2 className="animate-spin text-gray-400 mx-auto" />;
  if (!meetings.length) return <p className="text-sm text-gray-400">{t('playerPortal.noMeetings')}</p>;

  return (
    <div className="space-y-4">
      {meetings.map((m) => (
        <article key={m.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <header className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h3 className="font-extrabold text-gray-900">{fmtDate(m.date, lang)}{m.time ? ` · ${m.time}` : ''}</h3>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {t(m.type === 'grupal' ? 'playerPortal.group' : 'playerPortal.individual')}{m.location ? ` · ${m.location}` : ''}
            </span>
          </header>
          <div className="grid sm:grid-cols-2 gap-4">
            {MEETING_SECTIONS.map((key) => {
              const v = m[key];
              if (!v || typeof v !== 'string') return null;
              return (
                <div key={key}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">{t(`playerPortal.meetingSections.${key}`)}</p>
                  <TranslatedText html={v} className="text-sm text-gray-700 prose prose-sm max-w-none" />
                </div>
              );
            })}
          </div>
          {m.follow_up_date && <p className="mt-3 text-xs font-bold text-[#db0030]">{t('playerPortal.followUp')}: {fmtDate(m.follow_up_date, lang)}</p>}
        </article>
      ))}
    </div>
  );
}

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
    { id: 'forms', icon: ClipboardList },
    { id: 'what', icon: Target },
    { id: 'how', icon: ListChecks },
    { id: 'clips', icon: Film },
    { id: 'voice', icon: MessageSquareText },
    { id: 'calendar', icon: CalendarDays },
    { id: 'partidos', icon: BarChart2 },
    { id: 'peso', icon: Weight },
    { id: 'lesiones', icon: Stethoscope },
    { id: 'informes', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-[#111114] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/escudo.png" alt="" className="w-9 h-9 object-contain" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff4d6d] leading-none">{t('playerPortal.title')}</p>
              <p className="font-extrabold truncate">{name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell
              audience="player"
              dark
              onOpen={(n) => {
                const map: Record<string, Tab> = {
                  form_assigned: 'forms', objective: 'what', objective_comment: 'what', focus: 'how',
                  clip: 'clips', clip_comment: 'clips', video_note: 'clips', self_assessment: 'voice',
                  meeting: 'calendar', report: 'informes',
                };
                selectTab(map[n.kind] ?? 'what');
              }}
            />
            {/* Selector de idioma sólo IT / EN para el jugador */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-black uppercase tracking-wider text-white transition-all"
              title="Cambia lingua / Switch language"
            >
              <Globe size={14} className="text-[#ff4d6d]" />
              <span>{activeLang === 'it' ? '🇮🇹 IT' : '🇬🇧 EN'}</span>
            </button>

            <button onClick={signOut} className="flex items-center gap-2 text-xs font-bold text-white/70 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10">
              <LogOut size={16} /> <span className="hidden sm:inline">{t('playerPortal.exit')}</span>
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-2 flex gap-1 overflow-x-auto">
          {tabItems.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={(e) => {
                selectTab(id);
                e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'center' });
              }}
              aria-current={tab === id ? 'page' : undefined}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition-colors ${tab === id ? 'border-[#db0030] text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
            >
              <Icon size={14} /> {t(`playerPortal.tabs.${id}`)}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
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
            {tab === 'calendar' && (
              <div className="mt-8">
                <MeetingsList playerId={playerId} lang={activeLang} />
              </div>
            )}
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
