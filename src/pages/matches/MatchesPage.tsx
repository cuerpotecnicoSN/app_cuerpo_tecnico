import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronLeft, MapPin, Swords, Pencil, User } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { MatchDB, MatchFocus, MatchDataPoint } from '../../components/types';
import { getMatches, createMatch, updateMatch, getMatchFocuses, createMatchFocus, updateMatchFocus, deleteMatchFocus, getMatchDataPoints, createMatchDataPoint, deleteMatchDataPoint } from '../../services/matches';
import { exportMatchesListPdf } from '../../utils/matchesPdf';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import GlobalFocusesView from '../../components/matches/GlobalFocusesView';
import type { FocusDetails } from '../../components/types';

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
  const [showGlobalFocuses, setShowGlobalFocuses] = useState(false);

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

  if (showGlobalFocuses) {
    return <GlobalFocusesView matches={matches} onBack={() => setShowGlobalFocuses(false)} />;
  }

  return (
    <div className="space-y-4">
      {/* Header Container */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Left Side: Title & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h1 className="text-2xl font-extrabold text-gray-900 shrink-0">{t('matchesPage.title')}</h1>
          
          <div className="flex bg-gray-100 p-1.5 rounded-xl gap-1 overflow-x-auto w-full sm:w-auto shadow-inner">
            <button 
              onClick={() => setFilterType('all')} 
              className={`px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${filterType === 'all' ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterType('league')} 
              className={`px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${filterType === 'league' ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'}`}
            >
              Liga
            </button>
            <button 
              onClick={() => setFilterType('cup')} 
              className={`px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${filterType === 'cup' ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'}`}
            >
              Copa
            </button>
            <button 
              onClick={() => setFilterType('friendly')} 
              className={`px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${filterType === 'friendly' ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'}`}
            >
              Amistosos
            </button>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-start sm:justify-end">
          <button 
            onClick={() => setShowGlobalFocuses(true)}
            className="px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold shadow-sm border border-indigo-200 hover:bg-indigo-100 transition-all flex-1 sm:flex-none text-center"
          >
            Focos Globales
          </button>
          <button 
            onClick={handleExport}
            disabled={exporting || filteredMatches.length === 0}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex-1 sm:flex-none text-center"
          >
            {exporting ? 'Exportando...' : 'Exportar PDF'}
          </button>
          <button 
            onClick={() => setShowForm((v) => !v)} 
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 flex-1 sm:flex-none"
          >
            <Plus size={16} strokeWidth={3} /> {t('matchesPage.newMatch')}
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
  const [focusType, setFocusType] = useState<'Colectivo' | 'Grupal' | 'Individual' | 'Rival'>('Colectivo');
  const [focusPhases, setFocusPhases] = useState<('Ofensivo' | 'Defensivo' | 'ABP')[]>(['Ofensivo']);
  const [focusAssignedTo, setFocusAssignedTo] = useState('');
  const [focusPlayerId, setFocusPlayerId] = useState('');
  const [focusPlayerIds, setFocusPlayerIds] = useState<string[]>([]);
  const [editingFocusId, setEditingFocusId] = useState<string | null>(null);

  const toggleFocusPlayer = (id: string) => {
    setFocusPlayerIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const toggleFocusPhase = (p: 'Ofensivo' | 'Defensivo' | 'ABP') => {
    setFocusPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

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
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4 shadow-sm" id="focus-form">
            <h3 className="font-bold text-gray-900 text-sm">{editingFocusId ? 'Editar Foco' : 'Añadir Nuevo Foco'}</h3>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder={t('common.title') as string} value={focusTitle} onChange={(e) => setFocusTitle(e.target.value)} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tipo de Foco</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={focusType} onChange={(e) => setFocusType(e.target.value as any)}>
                  <option value="Colectivo">Colectivo</option>
                  <option value="Grupal">Grupal</option>
                  <option value="Individual">Individual</option>
                  <option value="Rival">Rival</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Fases del Juego</label>
                <div className="flex gap-2 flex-wrap">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded-md transition-colors border border-gray-100">
                    <input type="checkbox" checked={focusPhases.includes('Ofensivo')} onChange={() => toggleFocusPhase('Ofensivo')} className="rounded text-blue-600 focus:ring-blue-500" /> Ofensivo
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded-md transition-colors border border-gray-100">
                    <input type="checkbox" checked={focusPhases.includes('Defensivo')} onChange={() => toggleFocusPhase('Defensivo')} className="rounded text-blue-600 focus:ring-blue-500" /> Defensivo
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded-md transition-colors border border-gray-100">
                    <input type="checkbox" checked={focusPhases.includes('ABP')} onChange={() => toggleFocusPhase('ABP')} className="rounded text-blue-600 focus:ring-blue-500" /> ABP
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {focusType === 'Individual' && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Jugador Objetivo</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={focusPlayerId} onChange={(e) => setFocusPlayerId(e.target.value)}>
                    <option value="">Selecciona Jugador...</option>
                    {(dbPlayers || []).sort((a:any, b:any) => a.first_name.localeCompare(b.first_name)).map((p: any) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                  </select>
                </div>
              )}
              {focusType === 'Grupal' && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Jugadores Implicados</label>
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {(dbPlayers || []).sort((a:any, b:any) => a.first_name.localeCompare(b.first_name)).map((p: any) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded-md transition-colors">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" checked={focusPlayerIds.includes(p.id)} onChange={() => toggleFocusPlayer(p.id)} />
                        <span className="text-gray-700">{p.first_name} {p.last_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className={(focusType === 'Colectivo' || focusType === 'Rival') ? 'md:col-span-2' : ''}>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Responsable / Controlador</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. 2º Entrenador, Analista..." value={focusAssignedTo} onChange={(e) => setFocusAssignedTo(e.target.value)} />
              </div>
            </div>

            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Descripción detallada del foco..." value={focusDesc} onChange={(e) => setFocusDesc(e.target.value)} rows={3} />
            
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={async () => { 
                  if (!focusTitle.trim()) return alert("El título es obligatorio.");
                  if (focusPhases.length === 0) return alert("Debes seleccionar al menos una fase del juego.");
                  if (!focusAssignedTo.trim()) return alert("El responsable o controlador es obligatorio.");
                  if (focusType === 'Individual' && !focusPlayerId) return alert("Debes seleccionar un jugador objetivo.");
                  if (focusType === 'Grupal' && focusPlayerIds.length === 0) return alert("Debes seleccionar al menos un jugador implicado.");
                  if (!focusDesc.trim()) return alert("La descripción es obligatoria.");

                  const details: FocusDetails = { text: focusDesc, focusType, phases: focusPhases, assignedTo: focusAssignedTo, playerId: focusPlayerId, playerIds: focusPlayerIds };
                  
                  if (editingFocusId) {
                    await updateMatchFocus(editingFocusId, { title: focusTitle, description: JSON.stringify(details) });
                  } else {
                    await createMatchFocus({ match_id: match.id, title: focusTitle, description: JSON.stringify(details), order: focuses.length }); 
                  }

                  setEditingFocusId(null);
                  setFocusTitle(''); setFocusDesc(''); setFocusAssignedTo(''); setFocusPlayerId(''); setFocusPlayerIds([]); loadFocuses(); 
                }}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center justify-center w-full sm:w-auto gap-2 hover:bg-blue-700 transition-colors"
              >
                {editingFocusId ? <Pencil size={16} /> : <Plus size={16} />} 
                {editingFocusId ? 'Guardar Cambios' : 'Guardar Foco'}
              </button>
              {editingFocusId && (
                <button
                  onClick={() => {
                    setEditingFocusId(null);
                    setFocusTitle(''); setFocusDesc(''); setFocusAssignedTo(''); setFocusPlayerId(''); setFocusPlayerIds([]);
                  }}
                  className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold flex items-center justify-center w-full sm:w-auto hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <div className="mt-8">
            {(() => {
              const parsedFocuses = focuses.map(f => {
                let details: FocusDetails | null = null;
                let plainDesc = f.description;
                try {
                  if (f.description && f.description.startsWith('{')) {
                    details = JSON.parse(f.description);
                    plainDesc = details?.text || '';
                  }
                } catch (e) {
                  // legacy format
                }
                return { ...f, details, plainDesc };
              });

              const groupedByRole = new Map<string, typeof parsedFocuses>();
              parsedFocuses.forEach(f => {
                const role = f.details?.assignedTo?.trim() || 'Sin asignar / General';
                if (!groupedByRole.has(role)) groupedByRole.set(role, []);
                groupedByRole.get(role)!.push(f);
              });

              if (parsedFocuses.length === 0) return <p className="text-sm text-gray-400 text-center py-6">No hay focos registrados para este partido.</p>;

              return (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {Array.from(groupedByRole.entries()).map(([role, roleFocuses]) => (
                    <div key={role} className="bg-gray-50/50 border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-blue-500" />
                      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-200 ml-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner">
                          <User size={16} />
                        </div>
                        <h4 className="font-extrabold text-gray-900 text-sm uppercase tracking-tight">{role}</h4>
                        <span className="ml-auto bg-white border border-gray-200 text-gray-600 text-xs font-black px-2 py-0.5 rounded-full shadow-sm">{roleFocuses.length}</span>
                      </div>
                      
                      <div className="space-y-4 ml-2">
                        {roleFocuses.map(f => {
                          const details = f.details;
                          const plainDesc = f.plainDesc;

                          const typeColors = {
                            Colectivo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                            Grupal: 'bg-teal-100 text-teal-700 border-teal-200',
                            Individual: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                            Rival: 'bg-rose-100 text-rose-700 border-rose-200'
                          };
                          
                          const phaseColors = {
                            Ofensivo: 'bg-blue-100 text-blue-700 border-blue-200',
                            Defensivo: 'bg-red-100 text-red-700 border-red-200',
                            ABP: 'bg-amber-100 text-amber-700 border-amber-200'
                          };

                          let playerName = '';
                          if (details?.focusType === 'Individual' && details?.playerId && dbPlayers) {
                            const player = dbPlayers.find((p:any) => p.id === details?.playerId);
                            if (player) playerName = `${player.first_name} ${player.last_name}`;
                          } else if (details?.focusType === 'Grupal' && details?.playerIds && dbPlayers) {
                            playerName = dbPlayers.filter((p:any) => details.playerIds?.includes(p.id)).map((p:any) => p.first_name).join(', ');
                          }

                          return (
                            <div key={f.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 relative group">
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    {details?.focusType && (
                                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${typeColors[details.focusType as keyof typeof typeColors] || 'bg-gray-100'}`}>
                                        {details.focusType} {playerName ? `(${playerName})` : ''}
                                      </span>
                                    )}
                                    {details?.phases?.map(ph => (
                                      <span key={ph} className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${phaseColors[ph as keyof typeof phaseColors] || 'bg-gray-100'}`}>
                                        {ph}
                                      </span>
                                    ))}
                                  </div>
                                  <h4 className="font-bold text-gray-900 text-lg leading-tight">{f.title}</h4>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-md">
                                  <button 
                                    onClick={() => {
                                      setEditingFocusId(f.id);
                                      setFocusTitle(f.title);
                                      setFocusDesc(plainDesc);
                                      setFocusType((details?.focusType as 'Colectivo' | 'Grupal' | 'Individual' | 'Rival') || 'Colectivo');
                                      setFocusPhases(details?.phases || []);
                                      setFocusAssignedTo(details?.assignedTo || '');
                                      setFocusPlayerId(details?.playerId || '');
                                      setFocusPlayerIds(details?.playerIds || []);
                                      document.getElementById('focus-form')?.scrollIntoView({ behavior: 'smooth' });
                                    }} 
                                    className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                                    title="Editar foco"
                                  >
                                    <Pencil size={18} />
                                  </button>
                                  <button 
                                    onClick={async () => { 
                                      if (window.confirm('¿Estás seguro de que quieres eliminar este foco?')) {
                                        await deleteMatchFocus(f.id); 
                                        loadFocuses(); 
                                      }
                                    }} 
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    title="Eliminar foco"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                              {plainDesc && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{plainDesc}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
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
