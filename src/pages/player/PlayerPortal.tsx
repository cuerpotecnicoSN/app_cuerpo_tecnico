import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { LogOut, Target, Activity, Weight, Stethoscope, Users2, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { MeetingDB, Player, SeasonReport } from '../../components/types';
import { getMeetingsForPlayer } from '../../services/meetings';
import { getSeasonReports } from '../../services/playerObjectives';
import PlayerDevelopmentPlan from '../../components/players/development/PlayerDevelopmentPlan';
import PlayerMatchStatsTab from '../../components/players/stats/PlayerMatchStatsTab';
import PlayerWeightTab from '../../components/pro/PlayerWeightTab';
import PlayerInjuriesTab from '../../components/pro/PlayerInjuriesTab';

type Tab = 'plan' | 'partidos' | 'peso' | 'lesiones' | 'reuniones' | 'informes';

const TABS: { id: Tab; label: string; icon: typeof Target }[] = [
  { id: 'plan', label: 'Mi plan', icon: Target },
  { id: 'partidos', label: 'Partidos', icon: Activity },
  { id: 'peso', label: 'Peso', icon: Weight },
  { id: 'lesiones', label: 'Lesiones', icon: Stethoscope },
  { id: 'reuniones', label: 'Reuniones', icon: Users2 },
  { id: 'informes', label: 'Informes', icon: FileText },
];

const fmtDate = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

function MeetingsList({ playerId }: { playerId: string }) {
  const [meetings, setMeetings] = useState<MeetingDB[] | null>(null);
  useEffect(() => { getMeetingsForPlayer(playerId).then(setMeetings).catch(() => setMeetings([])); }, [playerId]);
  if (!meetings) return <Loader2 className="animate-spin text-gray-400 mx-auto" />;
  if (!meetings.length) return <p className="text-sm text-gray-400">Todavía no hay reuniones registradas.</p>;

  const sections: { key: keyof MeetingDB; label: string }[] = [
    { key: 'objective', label: 'Objetivo' },
    { key: 'development', label: 'Desarrollo' },
    { key: 'positive_points', label: 'Puntos positivos' },
    { key: 'improvements', label: 'A mejorar' },
    { key: 'agreements', label: 'Acuerdos' },
    { key: 'next_steps', label: 'Próximos pasos' },
  ];

  return (
    <div className="space-y-4">
      {meetings.map((m) => (
        <article key={m.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <header className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h3 className="font-extrabold text-gray-900">{fmtDate(m.date)}{m.time ? ` · ${m.time}` : ''}</h3>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{m.type === 'grupal' ? 'Grupal' : 'Individual'}{m.location ? ` · ${m.location}` : ''}</span>
          </header>
          <div className="grid sm:grid-cols-2 gap-4">
            {sections.map(({ key, label }) => {
              const v = m[key];
              if (!v || typeof v !== 'string') return null;
              return (
                <div key={key}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">{label}</p>
                  <div className="text-sm text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(v) }} />
                </div>
              );
            })}
          </div>
          {m.follow_up_date && <p className="mt-3 text-xs font-bold text-[#db0030]">Seguimiento: {fmtDate(m.follow_up_date)}</p>}
        </article>
      ))}
    </div>
  );
}

function ReportsList({ playerId }: { playerId: string }) {
  const [reports, setReports] = useState<SeasonReport[] | null>(null);
  useEffect(() => { getSeasonReports(playerId).then(setReports).catch(() => setReports([])); }, [playerId]);
  if (!reports) return <Loader2 className="animate-spin text-gray-400 mx-auto" />;
  if (!reports.length) return <p className="text-sm text-gray-400">No hay informes todavía.</p>;
  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <p className="text-sm text-gray-700 whitespace-pre-line">{r.summary}</p>
          {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#db0030] underline mt-2 inline-block">Ver documento</a>}
        </div>
      ))}
    </div>
  );
}

export default function PlayerPortal() {
  const { playerId, profile, signOut } = useAuth();
  const [player, setPlayer] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('plan');

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-[#111114] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/escudo.png" alt="" className="w-9 h-9 object-contain" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff4d6d] leading-none">Portal del jugador</p>
              <p className="font-extrabold truncate">{name}</p>
            </div>
          </div>
          <button onClick={signOut} className="flex items-center gap-2 text-xs font-bold text-white/70 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10">
            <LogOut size={16} /> <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
        <nav className="max-w-6xl mx-auto px-2 flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition-colors ${tab === id ? 'border-[#db0030] text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : !player || !playerId ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
            Tu cuenta todavía no está vinculada a una ficha de jugador. Contacta con el cuerpo técnico.
          </div>
        ) : (
          <>
            {tab === 'plan' && <PlayerDevelopmentPlan player={player as { id: string }} mode="player" />}
            {tab === 'partidos' && <PlayerMatchStatsTab playerId={playerId} playerName={name} playerDbInfo={playerForStats} />}
            {tab === 'peso' && <PlayerWeightTab playerId={playerId} readOnly />}
            {tab === 'lesiones' && <PlayerInjuriesTab playerId={playerId} readOnly />}
            {tab === 'reuniones' && <MeetingsList playerId={playerId} />}
            {tab === 'informes' && <ReportsList playerId={playerId} />}
          </>
        )}
      </main>
    </div>
  );
}
