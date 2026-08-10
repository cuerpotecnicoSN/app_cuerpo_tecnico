import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronLeft, MapPin, Swords } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { MatchDB, MatchFocus, MatchDataPoint } from '../../components/types';
import { getMatches, createMatch, deleteMatch, updateMatch, getMatchFocuses, createMatchFocus, deleteMatchFocus, getMatchDataPoints, createMatchDataPoint, deleteMatchDataPoint } from '../../services/matches';
import { exportMatchesListPdf } from '../../utils/matchesPdf';
import { useSupabaseData } from '../../hooks/useSupabaseData';

export default function MatchesPage() {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<MatchDB[]>([]);
  const [activeMatch, setActiveMatch] = useState<MatchDB | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [competition, setCompetition] = useState('');
  const [stadium, setStadium] = useState('');
  const [isHome, setIsHome] = useState(true);

  const [closestMatchId, setClosestMatchId] = useState<string | null>(null);
  const closestRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState<'all' | 'league' | 'cup' | 'friendly'>('all');
  const [exporting, setExporting] = useState(false);

  const load = () => getMatches().then(setMatches).catch(() => setMatches([]));
  useEffect(() => { load(); }, []);

  const filteredMatches = matches
    .filter(m => m.date >= '2026-08-01')
    .filter(m => {
      if (filterType === 'all') return true;
      const comp = (m.competition || '').toLowerCase();
      if (filterType === 'friendly') return comp.includes('amistoso');
      if (filterType === 'cup') return comp.includes('copa') || comp.includes('coppa');
      if (filterType === 'league') return !comp.includes('amistoso') && !comp.includes('copa') && !comp.includes('coppa');
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  useEffect(() => {
    if (filteredMatches.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const upcoming = filteredMatches.find(m => m.date >= today);
      const closest = upcoming || filteredMatches[filteredMatches.length - 1];
      if (closest) setClosestMatchId(closest.id);
    }
  }, [matches]);

  useEffect(() => {
    if (closestRef.current) {
      setTimeout(() => {
        closestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [closestMatchId]);

  const handleAdd = async () => {
    if (!opponent.trim() || !date) return;
    await createMatch({ opponent, date, time: time || undefined, competition, stadium, is_home: isHome, status: 'Scheduled' });
    setOpponent(''); setDate(''); setTime(''); setCompetition(''); setStadium(''); setIsHome(true); setShowForm(false);
    load();
  };

  const handleExport = async () => {
    if (exporting || filteredMatches.length === 0) return;
    setExporting(true);
    try {
      const labels = {
        all: 'Todos los partidos',
        league: 'Liga',
        cup: 'Copa',
        friendly: 'Amistosos'
      };
      await exportMatchesListPdf(filteredMatches, labels[filterType]);
    } catch (e) {
      console.error(e);
      alert('Error al exportar PDF');
    } finally {
      setExporting(false);
    }
  };

  if (activeMatch) {
    return <MatchDetail match={activeMatch} onBack={() => { setActiveMatch(null); load(); }} onUpdate={load} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-gray-900">{t('matchesPage.title')}</h1>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${filterType === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Todos</button>
            <button onClick={() => setFilterType('league')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${filterType === 'league' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Liga</button>
            <button onClick={() => setFilterType('cup')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${filterType === 'cup' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Copa</button>
            <button onClick={() => setFilterType('friendly')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${filterType === 'friendly' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Amistosos</button>
          </div>
          <button 
            onClick={handleExport}
            disabled={exporting || filteredMatches.length === 0}
            className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {exporting ? 'Exportando...' : 'Exportar PDF'}
          </button>
          <button onClick={() => setShowForm((v) => !v)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md hover:bg-blue-700 transition-colors">
            <Plus size={16} /> {t('matchesPage.newMatch')}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 shadow-sm">
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('matchesPage.opponent') as string} value={opponent} onChange={(e) => setOpponent(e.target.value)} />
          <div className="flex gap-2">
            <input type="date" className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
            <input type="time" className="w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('matchesPage.competition') as string} value={competition} onChange={(e) => setCompetition(e.target.value)} />
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('matchesPage.stadium') as string} value={stadium} onChange={(e) => setStadium(e.target.value)} />
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-1"><input type="radio" checked={isHome} onChange={() => setIsHome(true)} /> {t('matchesPage.home')}</label>
            <label className="flex items-center gap-1"><input type="radio" checked={!isHome} onChange={() => setIsHome(false)} /> {t('matchesPage.away')}</label>
          </div>
          <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">{t('common.save')}</button>
        </div>
      )}

      {filteredMatches.length === 0 && <p className="text-sm text-gray-400">{t('matchesPage.noMatches')}</p>}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {filteredMatches.map((m) => {
          const theme = (() => {
            const comp = (m.competition || '').toLowerCase();
            if (comp.includes('amistoso')) return { border: 'bg-orange-500', icon: 'text-orange-50', bg: 'bg-orange-50', text: 'text-orange-600', borderLight: 'border-orange-100', hoverText: 'group-hover:text-orange-600' };
            if (comp.includes('copa')) return { border: 'bg-purple-500', icon: 'text-purple-50', bg: 'bg-purple-50', text: 'text-purple-600', borderLight: 'border-purple-100', hoverText: 'group-hover:text-purple-600' };
            return { border: 'bg-blue-500', icon: 'text-blue-50', bg: 'bg-blue-50', text: 'text-blue-600', borderLight: 'border-blue-100', hoverText: 'group-hover:text-blue-600' };
          })();

          const myTeamName = "Milan Futuro";
          const homeTeamName = m.is_home ? myTeamName : m.opponent;
          const awayTeamName = m.is_home ? m.opponent : myTeamName;

          return (
          <div key={m.id} ref={m.id === closestMatchId ? closestRef : null} className="relative bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group" onClick={() => setActiveMatch(m)}>
            <div className={`absolute top-0 left-0 w-2 h-full ${theme.border} rounded-l-[28px]`} />
            <div className={`absolute -right-10 -top-10 ${theme.icon} opacity-50 pointer-events-none group-hover:scale-110 transition-transform duration-500`}>
              <Swords size={160} />
            </div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-extrabold ${theme.text} ${theme.bg} border ${theme.borderLight} px-3 py-1 rounded-lg shadow-sm uppercase`}>
                      {m.competition || 'Partido'}
                    </span>
                    <span className="text-sm font-bold text-gray-600 flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg shadow-sm">
                      {new Date(m.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {m.time && ` | ${m.time}`}
                    </span>
                    {m.stadium && (
                      <span className="text-sm font-bold text-gray-600 flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg shadow-sm">
                        <MapPin size={14} className="text-gray-400" />
                        {m.stadium}
                      </span>
                    )}
                  </div>
                </div>

                {/* Equipos y Escudos Gigantes */}
                <div className="flex items-center justify-center gap-2 sm:gap-6 mt-4">
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gray-50 flex items-center justify-center p-4 border border-gray-100 shadow-sm relative z-10 group-hover:-translate-y-1 transition-transform duration-300">
                      {m.home_logo ? <img src={m.home_logo} alt="Home" className="w-full h-full object-contain drop-shadow-sm" /> : <div className="w-12 h-12 rounded-full bg-gray-200" />}
                    </div>
                    <span className={`mt-4 text-center font-black text-lg sm:text-xl text-gray-900 leading-tight line-clamp-2 ${theme.hoverText} transition-colors`}>{homeTeamName}</span>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center px-1 sm:px-4">
                    {(m.result_home != null && m.result_away != null) ? (
                      <div className="bg-gray-900 text-white font-black text-3xl sm:text-4xl px-5 py-3 rounded-2xl shadow-lg relative z-20">
                        {m.result_home} - {m.result_away}
                      </div>
                    ) : (
                      <span className="text-xl font-black text-gray-300 uppercase tracking-widest">vs</span>
                    )}
                  </div>

                  <div className="flex flex-col items-center flex-1">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gray-50 flex items-center justify-center p-4 border border-gray-100 shadow-sm relative z-10 group-hover:-translate-y-1 transition-transform duration-300">
                      {m.away_logo ? <img src={m.away_logo} alt="Away" className="w-full h-full object-contain drop-shadow-sm" /> : <div className="w-12 h-12 rounded-full bg-gray-200" />}
                    </div>
                    <span className={`mt-4 text-center font-black text-lg sm:text-xl text-gray-900 leading-tight line-clamp-2 ${theme.hoverText} transition-colors`}>{awayTeamName}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchDetail({ match, onBack, onUpdate }: { match: MatchDB; onBack: () => void; onUpdate: () => void }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('view') as 'info' | 'focuses' | 'data') || 'info';
  const [tab, setTab] = useState<'info' | 'focuses' | 'data'>(initialTab);
  
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editDate, setEditDate] = useState(match.date);
  const [editTime, setEditTime] = useState(match.time || '');
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

      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">{match.is_home ? 'vs' : '@'} {match.opponent}</h2>
          
          {isEditingInfo ? (
            <div className="flex gap-2 mt-2">
              <input type="date" className="border border-gray-200 rounded-lg px-2 py-1 text-sm" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              <input type="time" className="border border-gray-200 rounded-lg px-2 py-1 text-sm" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
              <button 
                onClick={async () => {
                  await updateMatch(match.id, { date: editDate, time: editTime || undefined });
                  setIsEditingInfo(false);
                  onUpdate();
                  match.date = editDate; // optimistically update local object
                  match.time = editTime || undefined;
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-bold"
              >
                {t('common.save')}
              </button>
              <button onClick={() => setIsEditingInfo(false)} className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-sm font-bold">
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <span>{match.date} {match.time ? `| ${match.time}` : ''} {match.competition ? `· ${match.competition}` : ''}</span>
              <button onClick={() => setIsEditingInfo(true)} className="text-blue-500 hover:text-blue-700 text-xs font-bold underline">
                {t('common.edit')}
              </button>
            </p>
          )}
        </div>
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
