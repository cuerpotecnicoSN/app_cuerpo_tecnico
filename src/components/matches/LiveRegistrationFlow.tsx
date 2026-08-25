import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Radio, UserCheck, Users, CheckCircle2, Target } from 'lucide-react';
import type { MatchDB, MatchFocus, MatchDataPoint } from '../types';
import { getMatch, getMatchFocuses, getAllMatchFocuses, getMatchDataPoints, updateMatch } from '../../services/matches';
import MatchLiveRegistrationView, { getFocusRole, getFocusDetails } from './MatchLiveRegistrationView';
import UpcomingMatchPicker, { matchLabel } from './UpcomingMatchPicker';

const TRAINER_COLORS = [
  { bg: 'bg-emerald-50/60 hover:bg-emerald-50/90 border-emerald-200 hover:border-emerald-400', text: 'text-emerald-950', iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', typeBg: 'bg-emerald-100/50 text-emerald-800 border-emerald-150' },
  { bg: 'bg-blue-50/60 hover:bg-blue-50/90 border-blue-200 hover:border-blue-400', text: 'text-blue-950', iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600', badge: 'bg-blue-100 text-blue-800 border-blue-200', typeBg: 'bg-blue-100/50 text-blue-800 border-blue-150' },
  { bg: 'bg-amber-50/60 hover:bg-amber-50/90 border-amber-200 hover:border-amber-400', text: 'text-amber-950', iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600', badge: 'bg-amber-100 text-amber-800 border-amber-200', typeBg: 'bg-amber-100/50 text-amber-800 border-amber-150' },
  { bg: 'bg-rose-50/60 hover:bg-rose-50/90 border-rose-200 hover:border-rose-400', text: 'text-rose-950', iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600', badge: 'bg-rose-100 text-rose-800 border-rose-200', typeBg: 'bg-rose-100/50 text-rose-800 border-rose-150' },
  { bg: 'bg-purple-50/60 hover:bg-purple-50/90 border-purple-200 hover:border-purple-400', text: 'text-purple-950', iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600', badge: 'bg-purple-100 text-purple-800 border-purple-200', typeBg: 'bg-purple-100/50 text-purple-800 border-purple-150' },
  { bg: 'bg-cyan-50/60 hover:bg-cyan-50/90 border-cyan-200 hover:border-cyan-400', text: 'text-cyan-950', iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', typeBg: 'bg-cyan-100/50 text-cyan-800 border-cyan-150' },
  { bg: 'bg-indigo-50/60 hover:bg-indigo-50/90 border-indigo-200 hover:border-indigo-400', text: 'text-indigo-950', iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-600', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', typeBg: 'bg-indigo-100/50 text-indigo-800 border-indigo-150' },
];

function getTrainerColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TRAINER_COLORS.length;
  return TRAINER_COLORS[index];
}

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
      <div className="space-y-8 animate-fade-in">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {roleSummary.map(([r, info]) => {
              const colors = getTrainerColor(r);
              const trainerFocuses = focuses.filter(f => getFocusRole(f) === r);
              const TYPE_ORDER: Record<string, number> = { Colectivo: 0, Grupal: 1, Individual: 2, Rival: 3 };
              const sortedTrainerFocuses = [...trainerFocuses].sort((a, b) => {
                const ta = getFocusDetails(a).focusType || 'Colectivo';
                const tb = getFocusDetails(b).focusType || 'Colectivo';
                return (TYPE_ORDER[ta] ?? 9) - (TYPE_ORDER[tb] ?? 9);
              });

              return (
                <button
                  key={r}
                  onClick={() => { setRole(r); setStep('live'); }}
                  className={`text-left bg-white border ${colors.bg} rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all active:scale-[0.98] group flex flex-col justify-between min-h-[140px]`}
                >
                  <div className="w-full space-y-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl ${colors.iconBg} text-white flex items-center justify-center shadow-md shrink-0`}>
                        <UserCheck size={24} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-black text-xl leading-snug truncate ${colors.text} group-hover:scale-[1.01] transition-transform`}>{r}</p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                          {Array.from(info.types).map(t => (
                            <span key={t} className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${colors.typeBg}`}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* List of focuses grouped/sorted by type */}
                    {sortedTrainerFocuses.length > 0 && (
                      <div className="space-y-2 w-full pt-1">
                        {sortedTrainerFocuses.map(f => {
                          const type = getFocusDetails(f).focusType || 'Colectivo';
                          return (
                            <div key={f.id} className="flex items-center justify-between text-xs bg-white/70 border border-gray-150 rounded-xl p-2.5 shadow-sm">
                              <span className="font-bold text-gray-800 truncate pr-2">{f.title}</span>
                              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${colors.typeBg} shrink-0`}>
                                {type}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100/60 flex justify-between items-center w-full">
                    <span className={`text-xs font-black px-3 py-1.5 rounded-xl ${colors.badge} shadow-sm`}>
                      {info.count} foco{info.count === 1 ? '' : 's'}
                    </span>
                    <span className="text-xs font-extrabold text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Empezar a registrar &rarr;
                    </span>
                  </div>
                </button>
              );
            })}
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
