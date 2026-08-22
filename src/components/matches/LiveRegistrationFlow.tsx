import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Radio, UserCheck, Users, CheckCircle2, Target } from 'lucide-react';
import type { MatchDB, MatchFocus, MatchDataPoint } from '../types';
import { getMatch, getMatchFocuses, getAllMatchFocuses, getMatchDataPoints, updateMatch } from '../../services/matches';
import MatchLiveRegistrationView, { getFocusRole, getFocusDetails } from './MatchLiveRegistrationView';
import UpcomingMatchPicker, { matchLabel } from './UpcomingMatchPicker';

interface Props {
  matches: MatchDB[];
  onBack: () => void;
}

export default function LiveRegistrationFlow({ matches, onBack }: Props) {
  const [step, setStep] = useState<'match' | 'role' | 'live'>('match');
  const [match, setMatch] = useState<MatchDB | null>(null);
  const [focuses, setFocuses] = useState<MatchFocus[]>([]);
  const [dataPoints, setDataPoints] = useState<MatchDataPoint[]>([]);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusCountByMatch, setFocusCountByMatch] = useState<Map<string, number>>(new Map());

  // Solo se puede registrar en partidos que ya tengan focos planificados
  useEffect(() => {
    getAllMatchFocuses()
      .then(all => {
        const map = new Map<string, number>();
        all.forEach(f => map.set(f.match_id, (map.get(f.match_id) || 0) + 1));
        setFocusCountByMatch(map);
      })
      .catch(() => setFocusCountByMatch(new Map()));
  }, []);

  const matchesWithFocuses = useMemo(
    () => matches.filter(m => (focusCountByMatch.get(m.id) || 0) > 0),
    [matches, focusCountByMatch]
  );

  const loadFocuses = (matchId: string) => getMatchFocuses(matchId).then(setFocuses).catch(() => setFocuses([]));
  const loadDataPoints = (matchId: string) => getMatchDataPoints(matchId).then(setDataPoints).catch(() => setDataPoints([]));
  const reloadMatch = async (matchId: string) => {
    const fresh = await getMatch(matchId).catch(() => null);
    if (fresh) setMatch(fresh);
  };

  const selectMatch = async (m: MatchDB) => {
    setLoading(true);
    setMatch(m);
    setRole('');
    await Promise.all([loadFocuses(m.id), loadDataPoints(m.id), reloadMatch(m.id)]);
    setLoading(false);
    setStep('role');
  };

  // Refresco periódico de los focos por si otro miembro del cuerpo técnico los edita
  useEffect(() => {
    if (step !== 'live' || !match) return;
    const id = setInterval(() => { loadFocuses(match.id); }, 30000);
    return () => clearInterval(id);
  }, [step, match?.id]);

  const roleSummary = useMemo(() => {
    const map = new Map<string, { count: number; types: Set<string> }>();
    focuses.forEach(f => {
      const r = getFocusRole(f);
      const entry = map.get(r) || { count: 0, types: new Set<string>() };
      entry.count++;
      entry.types.add(getFocusDetails(f).focusType || 'Colectivo');
      map.set(r, entry);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [focuses]);


  // ---------- Paso 1: elegir partido ----------
  if (step === 'match') {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
          <ChevronLeft size={16} /> Volver a Partidos
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 text-red-600 rounded-xl shadow-inner"><Radio size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Registro en Vivo</h2>
            <p className="text-sm text-gray-500 font-bold">Paso 1 de 2 · Elige el partido por jugar</p>
          </div>
        </div>

        <UpcomingMatchPicker
          matches={matchesWithFocuses}
          onSelect={selectMatch}
          emptyMessage="No hay partidos por jugar con focos planificados. Crea los focos desde Planificar Focos."
          renderBadge={(m) => {
            const n = focusCountByMatch.get(m.id) || 0;
            return (
              <span className="text-sm font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg shadow-sm uppercase flex items-center gap-1.5">
                <Target size={14} /> {n} foco{n === 1 ? '' : 's'}
              </span>
            );
          }}
        />
      </div>
    );
  }

  // ---------- Paso 2: elegir entrenador ----------
  if (step === 'role' && match) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => { setStep('match'); setMatch(null); setFocuses([]); setDataPoints([]); }} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
          <ChevronLeft size={16} /> Cambiar de partido
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-inner"><UserCheck size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{matchLabel(match)}</h2>
            <p className="text-sm text-gray-500 font-bold">Paso 2 de 2 · ¿Qué entrenador eres?</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 font-bold py-10 text-center">Cargando focos...</p>
        ) : roleSummary.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-2">
            <p className="font-black text-amber-800">Este partido no tiene focos creados.</p>
            <p className="text-sm text-amber-700 font-medium">Crea focos desde la ficha del partido (pestaña Focos) y asigna un responsable a cada uno.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {roleSummary.map(([r, info]) => (
              <button
                key={r}
                onClick={() => { setRole(r); setStep('live'); }}
                className="text-left bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-400 transition-all active:scale-[0.99] space-y-3"
              >
                <div className="flex items-center gap-2 text-blue-600"><Users size={18} /><span className="font-black text-gray-900 text-lg leading-tight">{r}</span></div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">{info.count} foco{info.count === 1 ? '' : 's'}</span>
                  {Array.from(info.types).map(t => (
                    <span key={t} className="text-[11px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-1 rounded-lg">{t}</span>
                  ))}
                </div>
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400"><CheckCircle2 size={14} /> Empezar a registrar</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------- Paso 3: registro en directo ----------
  if (step === 'live' && match) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">{matchLabel(match)}</h2>
          <span className="text-xs font-black uppercase tracking-widest text-gray-400">{match.competition || 'Partido Oficial'}</span>
        </div>
        <MatchLiveRegistrationView
          match={match}
          focuses={focuses}
          dataPoints={dataPoints}
          role={role}
          onChangeRole={setRole}
          onExit={() => setStep('role')}
          onUpdateMatch={async (updates) => {
            await updateMatch(match.id, updates);
            setMatch(prev => (prev ? { ...prev, ...updates } : prev));
          }}
          onRefreshDataPoints={() => loadDataPoints(match.id)}
          onRefreshFocuses={() => loadFocuses(match.id)}
        />
      </div>
    );
  }

  return null;
}
