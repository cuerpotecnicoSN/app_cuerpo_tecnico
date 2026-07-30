import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronLeft } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { MatchDB, MatchFocus, MatchDataPoint } from '../../components/types';
import { getMatches, createMatch, deleteMatch, updateMatch, getMatchFocuses, createMatchFocus, deleteMatchFocus, getMatchDataPoints, createMatchDataPoint, deleteMatchDataPoint } from '../../services/matches';
import { useSupabaseData } from '../../hooks/useSupabaseData';

export default function MatchesPage() {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<MatchDB[]>([]);
  const [activeMatch, setActiveMatch] = useState<MatchDB | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState('');
  const [competition, setCompetition] = useState('');
  const [stadium, setStadium] = useState('');
  const [isHome, setIsHome] = useState(true);

  const load = () => getMatches().then(setMatches).catch(() => setMatches([]));
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!opponent.trim() || !date) return;
    await createMatch({ opponent, date, competition, stadium, is_home: isHome, status: 'Scheduled' });
    setOpponent(''); setDate(''); setCompetition(''); setStadium(''); setIsHome(true); setShowForm(false);
    load();
  };

  if (activeMatch) {
    return <MatchDetail match={activeMatch} onBack={() => { setActiveMatch(null); load(); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold text-gray-900">{t('matchesPage.title')}</h1>
        <button onClick={() => setShowForm((v) => !v)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2">
          <Plus size={16} /> {t('matchesPage.newMatch')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 shadow-sm">
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('matchesPage.opponent') as string} value={opponent} onChange={(e) => setOpponent(e.target.value)} />
          <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('matchesPage.competition') as string} value={competition} onChange={(e) => setCompetition(e.target.value)} />
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('matchesPage.stadium') as string} value={stadium} onChange={(e) => setStadium(e.target.value)} />
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-1"><input type="radio" checked={isHome} onChange={() => setIsHome(true)} /> {t('matchesPage.home')}</label>
            <label className="flex items-center gap-1"><input type="radio" checked={!isHome} onChange={() => setIsHome(false)} /> {t('matchesPage.away')}</label>
          </div>
          <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">{t('common.save')}</button>
        </div>
      )}

      {matches.length === 0 && <p className="text-sm text-gray-400">{t('matchesPage.noMatches')}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {matches.map((m) => (
          <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md" onClick={() => setActiveMatch(m)}>
            <div className="flex justify-between items-start">
              <p className="font-bold text-gray-800">{m.is_home ? 'vs' : '@'} {m.opponent}</p>
              <button onClick={(e) => { e.stopPropagation(); deleteMatch(m.id).then(load); }} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
            <p className="text-xs text-gray-400 mt-1">{m.date} {m.competition ? `· ${m.competition}` : ''}</p>
            {(m.result_home != null && m.result_away != null) && <p className="text-sm font-bold text-gray-700 mt-1">{m.result_home} - {m.result_away}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchDetail({ match, onBack }: { match: MatchDB; onBack: () => void }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('view') as 'info' | 'focuses' | 'data') || 'info';
  const [tab, setTab] = useState<'info' | 'focuses' | 'data'>(initialTab);
  const [scoutingNotes, setScoutingNotes] = useState(match.scouting_notes || '');
  const [focuses, setFocuses] = useState<MatchFocus[]>([]);
  const [dataPoints, setDataPoints] = useState<MatchDataPoint[]>([]);
  const { data: dbPlayers } = useSupabaseData<any>('players');

  const [focusTitle, setFocusTitle] = useState('');
  const [focusDesc, setFocusDesc] = useState('');

  const [dpPlayer, setDpPlayer] = useState('');
  const [dpMinute, setDpMinute] = useState('');
  const [dpType, setDpType] = useState('');
  const [dpOutcome, setDpOutcome] = useState<'Success' | 'Failure' | 'Neutral'>('Neutral');
  const [dpComments, setDpComments] = useState('');

  const loadFocuses = () => getMatchFocuses(match.id).then(setFocuses).catch(() => setFocuses([]));
  const loadDataPoints = () => getMatchDataPoints(match.id).then(setDataPoints).catch(() => setDataPoints([]));

  useEffect(() => { loadFocuses(); loadDataPoints(); }, [match.id]);

  useEffect(() => {
    const viewParam = searchParams.get('view') as 'info' | 'focuses' | 'data';
    if (viewParam && ['info', 'focuses', 'data'].includes(viewParam)) {
      setTab(viewParam);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: 'info' | 'focuses' | 'data') => {
    setTab(newTab);
    setSearchParams({ view: newTab });
  };

  return (
    <div className="space-y-4">
      <button onClick={() => { setSearchParams({}); onBack(); }} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800">
        <ChevronLeft size={16} /> {t('common.back')}
      </button>

      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-gray-900">{match.is_home ? 'vs' : '@'} {match.opponent}</h2>
        <p className="text-sm text-gray-400">{match.date} {match.competition ? `· ${match.competition}` : ''}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => handleTabChange('info')} className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${tab === 'info' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>{t('matchesPage.info')}</button>
        <button onClick={() => handleTabChange('focuses')} className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${tab === 'focuses' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>{t('matchesPage.focuses')}</button>
        <button onClick={() => handleTabChange('data')} className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${tab === 'data' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>{t('matchesPage.dataCollection')}</button>
      </div>

      {tab === 'info' && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 shadow-sm">
          <label className="text-xs font-bold text-gray-400 uppercase">{t('matchesPage.scoutingNotes')}</label>
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[120px]" value={scoutingNotes} onChange={(e) => setScoutingNotes(e.target.value)} onBlur={() => updateMatch(match.id, { scouting_notes: scoutingNotes })} />
        </div>
      )}

      {tab === 'focuses' && (
        <div className="space-y-3">
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2 shadow-sm">
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('common.title') as string} value={focusTitle} onChange={(e) => setFocusTitle(e.target.value)} />
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('common.description') as string} value={focusDesc} onChange={(e) => setFocusDesc(e.target.value)} />
            <button
              onClick={async () => { if (!focusTitle.trim()) return; await createMatchFocus({ match_id: match.id, title: focusTitle, description: focusDesc, order: focuses.length }); setFocusTitle(''); setFocusDesc(''); loadFocuses(); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"
            ><Plus size={16} /> {t('matchesPage.newFocus')}</button>
          </div>
          {focuses.map((f) => (
            <div key={f.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex justify-between items-start">
              <div><p className="font-bold text-gray-800">{f.title}</p>{f.description && <p className="text-sm text-gray-500">{f.description}</p>}</div>
              <button onClick={async () => { await deleteMatchFocus(f.id); loadFocuses(); }} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'data' && (
        <div className="space-y-3">
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2 shadow-sm">
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={dpPlayer} onChange={(e) => setDpPlayer(e.target.value)}>
              <option value="">—</option>
              {(dbPlayers || []).map((p: any) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="number" className="w-1/3 border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('matchesPage.minute') as string} value={dpMinute} onChange={(e) => setDpMinute(e.target.value)} />
              <input className="w-1/3 border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('matchesPage.type') as string} value={dpType} onChange={(e) => setDpType(e.target.value)} />
              <select className="w-1/3 border border-gray-200 rounded-lg px-3 py-2 text-sm" value={dpOutcome} onChange={(e) => setDpOutcome(e.target.value as any)}>
                <option value="Success">Success</option>
                <option value="Neutral">Neutral</option>
                <option value="Failure">Failure</option>
              </select>
            </div>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('matchesPage.comments') as string} value={dpComments} onChange={(e) => setDpComments(e.target.value)} />
            <button
              onClick={async () => {
                if (!dpType.trim()) return;
                await createMatchDataPoint({ match_id: match.id, player_id: dpPlayer || null, minute: dpMinute ? Number(dpMinute) : undefined, type: dpType, outcome: dpOutcome, comments: dpComments });
                setDpPlayer(''); setDpMinute(''); setDpType(''); setDpOutcome('Neutral'); setDpComments('');
                loadDataPoints();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"
            ><Plus size={16} /> {t('matchesPage.newDataPoint')}</button>
          </div>
          {dataPoints.map((dp) => (
            <div key={dp.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex justify-between items-start">
              <div>
                <p className="font-bold text-gray-800">{dp.minute != null ? `${dp.minute}' ` : ''}{dp.type} — {dp.outcome}</p>
                {dp.comments && <p className="text-sm text-gray-500">{dp.comments}</p>}
              </div>
              <button onClick={async () => { await deleteMatchDataPoint(dp.id); loadDataPoints(); }} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
