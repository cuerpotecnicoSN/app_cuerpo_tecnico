import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { LogOut, Target, Activity, Weight, Stethoscope, Users2, FileText, Loader2, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import type { MeetingDB, Player, SeasonReport } from '../../components/types';
import { getMeetingsForPlayer } from '../../services/meetings';
import { getSeasonReports } from '../../services/playerObjectives';
import PlayerDevelopmentPlan from '../../components/players/development/PlayerDevelopmentPlan';
import PlayerMatchStatsTab from '../../components/players/stats/PlayerMatchStatsTab';
import PlayerWeightTab from '../../components/pro/PlayerWeightTab';
import PlayerInjuriesTab from '../../components/pro/PlayerInjuriesTab';

type Tab = 'plan' | 'partidos' | 'peso' | 'lesiones' | 'reuniones' | 'informes';

const TRANSLATIONS: Record<'it' | 'en', {
  portalTitle: string;
  exit: string;
  tabs: Record<Tab, string>;
  noMeetings: string;
  noReports: string;
  viewDocument: string;
  notLinked: string;
  meetingSections: Record<string, string>;
  group: string;
  individual: string;
  followUp: string;
}> = {
  it: {
    portalTitle: 'Portale del Giocatore',
    exit: 'Esci',
    tabs: {
      plan: 'Il mio piano',
      partidos: 'Partite',
      peso: 'Peso',
      lesiones: 'Infortuni',
      reuniones: 'Riunioni',
      informes: 'Rapporti',
    },
    noMeetings: 'Non ci sono ancora riunioni registrate.',
    noReports: 'Non ci sono ancora rapporti disponibili.',
    viewDocument: 'Vedi documento',
    notLinked: 'Il tuo account non è ancora collegato alla scheda di un giocatore. Contatta lo staff tecnico.',
    meetingSections: {
      objective: 'Obiettivo',
      development: 'Sviluppo',
      positive_points: 'Punti positivi',
      improvements: 'Da migliorare',
      agreements: 'Accordi',
      next_steps: 'Prossimi passi',
    },
    group: 'Gruppo',
    individual: 'Individuale',
    followUp: 'Seguito',
  },
  en: {
    portalTitle: 'Player Portal',
    exit: 'Log out',
    tabs: {
      plan: 'My Plan',
      partidos: 'Matches',
      peso: 'Weight',
      lesiones: 'Injuries',
      reuniones: 'Meetings',
      informes: 'Reports',
    },
    noMeetings: 'No meetings registered yet.',
    noReports: 'No reports available yet.',
    viewDocument: 'View document',
    notLinked: 'Your account is not linked to any player profile yet. Please contact the coaching staff.',
    meetingSections: {
      objective: 'Objective',
      development: 'Development',
      positive_points: 'Key strengths',
      improvements: 'Areas of improvement',
      agreements: 'Agreements',
      next_steps: 'Next steps',
    },
    group: 'Group',
    individual: 'Individual',
    followUp: 'Follow-up',
  },
};

const fmtDate = (d: string, lang: 'it' | 'en') =>
  new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });

function MeetingsList({ playerId, lang }: { playerId: string; lang: 'it' | 'en' }) {
  const [meetings, setMeetings] = useState<MeetingDB[] | null>(null);
  const t = TRANSLATIONS[lang];
  useEffect(() => { getMeetingsForPlayer(playerId).then(setMeetings).catch(() => setMeetings([])); }, [playerId]);
  if (!meetings) return <Loader2 className="animate-spin text-gray-400 mx-auto" />;
  if (!meetings.length) return <p className="text-sm text-gray-400">{t.noMeetings}</p>;

  const sectionKeys: (keyof MeetingDB)[] = ['objective', 'development', 'positive_points', 'improvements', 'agreements', 'next_steps'];

  return (
    <div className="space-y-4">
      {meetings.map((m) => (
        <article key={m.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <header className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h3 className="font-extrabold text-gray-900">{fmtDate(m.date, lang)}{m.time ? ` · ${m.time}` : ''}</h3>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {m.type === 'grupal' ? t.group : t.individual}{m.location ? ` · ${m.location}` : ''}
            </span>
          </header>
          <div className="grid sm:grid-cols-2 gap-4">
            {sectionKeys.map((key) => {
              const v = m[key];
              if (!v || typeof v !== 'string') return null;
              return (
                <div key={key}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">{t.meetingSections[key] ?? key}</p>
                  <div className="text-sm text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(v) }} />
                </div>
              );
            })}
          </div>
          {m.follow_up_date && <p className="mt-3 text-xs font-bold text-[#db0030]">{t.followUp}: {fmtDate(m.follow_up_date, lang)}</p>}
        </article>
      ))}
    </div>
  );
}

function ReportsList({ playerId, lang }: { playerId: string; lang: 'it' | 'en' }) {
  const [reports, setReports] = useState<SeasonReport[] | null>(null);
  const t = TRANSLATIONS[lang];
  useEffect(() => { getSeasonReports(playerId).then(setReports).catch(() => setReports([])); }, [playerId]);
  if (!reports) return <Loader2 className="animate-spin text-gray-400 mx-auto" />;
  if (!reports.length) return <p className="text-sm text-gray-400">{t.noReports}</p>;
  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <p className="text-sm text-gray-700 whitespace-pre-line">{r.summary}</p>
          {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#db0030] underline mt-2 inline-block">{t.viewDocument}</a>}
        </div>
      ))}
    </div>
  );
}

export default function PlayerPortal() {
  const { playerId, profile, signOut } = useAuth();
  const { i18n } = useTranslation();
  const [player, setPlayer] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('plan');

  // Si el idioma actual no es ni 'it' ni 'en', forzar 'it' por defecto para el jugador
  const activeLang: 'it' | 'en' = i18n.language?.startsWith('en') ? 'en' : 'it';
  const t = TRANSLATIONS[activeLang];

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
    { id: 'plan', icon: Target },
    { id: 'partidos', icon: Activity },
    { id: 'peso', icon: Weight },
    { id: 'lesiones', icon: Stethoscope },
    { id: 'reuniones', icon: Users2 },
    { id: 'informes', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-[#111114] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/escudo.png" alt="" className="w-9 h-9 object-contain" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff4d6d] leading-none">{t.portalTitle}</p>
              <p className="font-extrabold truncate">{name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              <LogOut size={16} /> <span className="hidden sm:inline">{t.exit}</span>
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-2 flex gap-1 overflow-x-auto">
          {tabItems.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition-colors ${tab === id ? 'border-[#db0030] text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
            >
              <Icon size={14} /> {t.tabs[id]}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : !player || !playerId ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
            {t.notLinked}
          </div>
        ) : (
          <>
            {tab === 'plan' && <PlayerDevelopmentPlan player={player as { id: string }} mode="player" />}
            {tab === 'partidos' && <PlayerMatchStatsTab playerId={playerId} playerName={name} playerDbInfo={playerForStats} />}
            {tab === 'peso' && <PlayerWeightTab playerId={playerId} readOnly />}
            {tab === 'lesiones' && <PlayerInjuriesTab playerId={playerId} readOnly />}
            {tab === 'reuniones' && <MeetingsList playerId={playerId} lang={activeLang} />}
            {tab === 'informes' && <ReportsList playerId={playerId} lang={activeLang} />}
          </>
        )}
      </main>
    </div>
  );
}
