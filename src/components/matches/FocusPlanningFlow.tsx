import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Target, Users, User, ShieldAlert, UsersRound, Plus, Pencil, Trash2, X, Check, Activity, Shield, Flag, Sparkles } from 'lucide-react';
import type { MatchDB, MatchFocus, FocusDetails } from '../types';
import { getMatchFocuses, getAllMatchFocuses, createMatchFocus, updateMatchFocus, deleteMatchFocus } from '../../services/matches';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import UpcomingMatchPicker, { matchLabel, MY_TEAM_NAME } from './UpcomingMatchPicker';
import { getFocusRole, getFocusDetails } from './MatchLiveRegistrationView';

type FocusType = 'Colectivo' | 'Grupal' | 'Individual' | 'Rival';
type Phase = 'Ofensivo' | 'Defensivo' | 'ABP';

const FOCUS_TYPES: { key: FocusType; icon: any; active: string; badge: string; chip: string; dot: string; solid: string }[] = [
  { key: 'Colectivo', icon: Users, active: 'border-blue-600 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg ring-4 ring-blue-200', badge: 'text-blue-700', chip: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', solid: 'from-blue-500 to-blue-600' },
  { key: 'Grupal', icon: UsersRound, active: 'border-teal-600 bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg ring-4 ring-teal-200', badge: 'text-teal-700', chip: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500', solid: 'from-teal-500 to-teal-600' },
  { key: 'Individual', icon: User, active: 'border-emerald-600 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg ring-4 ring-emerald-200', badge: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', solid: 'from-emerald-500 to-emerald-600' },
  { key: 'Rival', icon: ShieldAlert, active: 'border-rose-600 bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg ring-4 ring-rose-200', badge: 'text-rose-700', chip: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', solid: 'from-rose-500 to-rose-600' },
];

const PHASES: { key: Phase; icon: any; chip: string; active: string; badge: string; bar: string }[] = [
  { key: 'Ofensivo', icon: Activity, bar: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700 border-blue-200', active: 'bg-gradient-to-br from-blue-500 to-blue-700 border-blue-600 text-white shadow-lg ring-4 ring-blue-200', badge: 'text-blue-700' },
  { key: 'Defensivo', icon: Shield, bar: 'bg-red-500', chip: 'bg-red-50 text-red-700 border-red-200', active: 'bg-gradient-to-br from-red-500 to-red-700 border-red-600 text-white shadow-lg ring-4 ring-red-200', badge: 'text-red-700' },
  { key: 'ABP', icon: Flag, bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200', active: 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-500 text-white shadow-lg ring-4 ring-amber-200', badge: 'text-amber-700' },
];

const typeMeta = (t?: string) => FOCUS_TYPES.find(x => x.key === t) || FOCUS_TYPES[0];
const phaseMeta = (p?: string) => PHASES.find(x => x.key === p) || PHASES[0];

const PHASE_ORDER: Record<string, number> = { Ofensivo: 0, Defensivo: 1, ABP: 2 };
const TYPE_ORDER: Record<string, number> = { Colectivo: 0, Grupal: 1, Individual: 2, Rival: 3 };

const focusPhases = (d: FocusDetails): Phase[] => (d.phases?.length ? d.phases : (d.phase ? [d.phase] : [])) as Phase[];
const phaseRank = (d: FocusDetails) => {
  const ps = focusPhases(d);
  return ps.length ? Math.min(...ps.map(p => PHASE_ORDER[p] ?? 9)) : 9;
};

interface Props {
  matches: MatchDB[];
  onBack: () => void;
}

export default function FocusPlanningFlow({ matches, onBack }: Props) {
  const [step, setStep] = useState<'match' | 'role' | 'focuses'>('match');
  const [match, setMatch] = useState<MatchDB | null>(null);
  const [focuses, setFocuses] = useState<MatchFocus[]>([]);
  const [allFocuses, setAllFocuses] = useState<MatchFocus[]>([]);
  const [role, setRole] = useState('');
  const [newRole, setNewRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [editorFocus, setEditorFocus] = useState<MatchFocus | 'new' | null>(null);

  const { data: dbPlayers } = useSupabaseData<any>('players');
  const { data: profiles } = useSupabaseData<any>('profiles');

  useEffect(() => { getAllMatchFocuses().then(setAllFocuses).catch(() => setAllFocuses([])); }, []);

  const loadFocuses = (matchId: string) => getMatchFocuses(matchId).then(setFocuses).catch(() => setFocuses([]));

  const selectMatch = async (m: MatchDB) => {
    setLoading(true);
    setMatch(m);
    setRole('');
    setNewRole('');
    await loadFocuses(m.id);
    setLoading(false);
    setStep('role');
  };

  const focusCountByMatch = useMemo(() => {
    const map = new Map<string, number>();
    allFocuses.forEach(f => map.set(f.match_id, (map.get(f.match_id) || 0) + 1));
    return map;
  }, [allFocuses]);

  const rolesInMatch = useMemo(() => {
    const map = new Map<string, number>();
    focuses.forEach(f => { const r = getFocusRole(f); map.set(r, (map.get(r) || 0) + 1); });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [focuses]);

  // Sugerencias: responsables usados en otros partidos + miembros del cuerpo técnico
  const roleSuggestions = useMemo(() => {
    const used = new Set(rolesInMatch.map(([r]) => r));
    const set = new Set<string>();
    allFocuses.forEach(f => { const r = getFocusRole(f); if (r && r !== 'General' && !used.has(r)) set.add(r); });
    (profiles || []).forEach((p: any) => {
      const name = (p.full_name || '').trim();
      if (name && !used.has(name)) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allFocuses, profiles, rolesInMatch]);

  // Orden: fase (Ofensivo → Defensivo → ABP) y dentro, tipo (Colectivo → Grupal → Individual → Rival)
  const myFocuses = useMemo(
    () => focuses
      .filter(f => getFocusRole(f) === role)
      .sort((a, b) => {
        const da = getFocusDetails(a) as FocusDetails;
        const db = getFocusDetails(b) as FocusDetails;
        const byPhase = phaseRank(da) - phaseRank(db);
        if (byPhase !== 0) return byPhase;
        const byType = (TYPE_ORDER[da.focusType ?? ''] ?? 9) - (TYPE_ORDER[db.focusType ?? ''] ?? 9);
        if (byType !== 0) return byType;
        return a.title.localeCompare(b.title);
      }),
    [focuses, role]
  );

  const countsByType = useMemo(() => {
    const c: Record<string, number> = {};
    myFocuses.forEach(f => { const t = getFocusDetails(f).focusType || 'Colectivo'; c[t] = (c[t] || 0) + 1; });
    return c;
  }, [myFocuses]);

  const playerById = (id: string) => (dbPlayers || []).find((x: any) => x.id === id);
  const playerName = (id: string) => {
    const p = playerById(id);
    return p ? `${p.first_name} ${p.last_name}` : '';
  };

  const removeFocus = async (f: MatchFocus) => {
    if (!window.confirm(`¿Eliminar el foco "${f.title}"?`)) return;
    await deleteMatchFocus(f.id);
    if (match) loadFocuses(match.id);
  };

  // ---------- Paso 1: elegir partido ----------
  if (step === 'match') {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
          <ChevronLeft size={16} /> Volver a Partidos
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shadow-inner"><Target size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Planificar Focos</h2>
            <p className="text-sm text-gray-500 font-bold">Paso 1 de 2 · Elige el partido por jugar</p>
          </div>
        </div>

        <UpcomingMatchPicker
          matches={matches}
          onSelect={selectMatch}
          highlight={(m) => (focusCountByMatch.get(m.id) || 0) > 0}
          renderBadge={(m) => {
            const n = focusCountByMatch.get(m.id) || 0;
            return n > 0 ? (
              <span className="text-sm font-extrabold px-3 py-1 rounded-lg shadow-sm border uppercase flex items-center gap-1.5 text-white bg-indigo-600 border-indigo-600">
                <Check size={14} strokeWidth={3} /> {n} foco{n === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="text-sm font-extrabold px-3 py-1 rounded-lg shadow-sm border uppercase flex items-center gap-1.5 text-amber-700 bg-amber-50 border-amber-200">
                <Target size={14} /> Sin focos
              </span>
            );
          }}
        />
      </div>
    );
  }

  // ---------- Paso 2: elegir entrenador ----------
  if (step === 'role' && match) {
    const startWithRole = (r: string) => {
      const clean = r.trim();
      if (!clean) return;
      setRole(clean);
      setStep('focuses');
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => { setStep('match'); setMatch(null); setFocuses([]); }} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
          <ChevronLeft size={16} /> Cambiar de partido
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shadow-inner"><Target size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{matchLabel(match)}</h2>
            <p className="text-sm text-gray-500 font-bold">Paso 2 de 2 · ¿Para qué entrenador planificas?</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 font-bold py-10 text-center">Cargando focos...</p>
        ) : (
          <div className="space-y-6">
            {rolesInMatch.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {rolesInMatch.map(([r, count]) => (
                  <button
                    key={r}
                    onClick={() => startWithRole(r)}
                    className="text-left bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-indigo-400 transition-all active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                        <User size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-gray-900 text-lg leading-tight truncate group-hover:text-indigo-700 transition-colors">{r}</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{count} foco{count === 1 ? '' : 's'} planificado{count === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-500" />
                <h3 className="font-black text-gray-900">Añadir otro entrenador</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej. 2º Entrenador, Analista, Preparador Físico..."
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') startWithRole(newRole); }}
                />
                <button
                  onClick={() => startWithRole(newRole)}
                  disabled={!newRole.trim()}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-black disabled:opacity-40 text-white rounded-xl text-sm font-bold shadow-md"
                >
                  Empezar
                </button>
              </div>
              {roleSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {roleSuggestions.map(r => (
                    <button key={r} onClick={() => startWithRole(r)} className="text-xs font-bold text-gray-600 bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- Paso 3: focos del entrenador ----------
  if (step === 'focuses' && match) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => { setStep('role'); setRole(''); }} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
          <ChevronLeft size={16} /> Cambiar de entrenador
        </button>

        {/* Cabecera */}
        <div className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-900 rounded-3xl p-6 md:p-8 shadow-xl overflow-hidden">
          <div className="absolute -top-24 -right-16 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-14 h-14 rounded-2xl bg-white/95 flex items-center justify-center p-2 shadow-lg">
                  {match.home_logo ? <img src={match.home_logo} alt="" className="w-full h-full object-contain" /> : <div className="w-7 h-7 rounded-full bg-gray-200" />}
                </div>
                <span className="text-white/40 font-black text-sm">VS</span>
                <div className="w-14 h-14 rounded-2xl bg-white/95 flex items-center justify-center p-2 shadow-lg">
                  {match.away_logo ? <img src={match.away_logo} alt="" className="w-full h-full object-contain" /> : <div className="w-7 h-7 rounded-full bg-gray-200" />}
                </div>
              </div>
              <div className="text-white">
                <p className="text-[11px] font-black uppercase tracking-widest text-indigo-300">{match.competition || 'Partido Oficial'}</p>
                <h2 className="text-xl md:text-2xl font-black leading-tight">
                  {match.is_home ? MY_TEAM_NAME : match.opponent} <span className="text-white/40">vs</span> {match.is_home ? match.opponent : MY_TEAM_NAME}
                </h2>
                <p className="text-sm font-bold text-gray-400 capitalize">
                  {match.date ? new Date(match.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Sin fecha'}
                  {match.time ? ` · ${match.time}` : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-5 py-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-indigo-300">Entrenador</p>
                <p className="text-lg font-black text-white leading-tight">{role}</p>
              </div>
              <button
                onClick={() => setEditorFocus('new')}
                className="px-5 py-3 bg-white text-gray-900 rounded-2xl text-sm font-black shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} strokeWidth={3} /> Nuevo Foco
              </button>
            </div>
          </div>

          {myFocuses.length > 0 && (
            <div className="relative flex flex-wrap gap-2 mt-6">
              <span className="text-xs font-black uppercase tracking-widest text-white bg-white/10 border border-white/15 px-3 py-1.5 rounded-lg">{myFocuses.length} foco{myFocuses.length === 1 ? '' : 's'}</span>
              {FOCUS_TYPES.filter(t => countsByType[t.key]).map(t => (
                <span key={t.key} className="text-xs font-black uppercase tracking-widest text-white/90 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${t.dot}`} /> {t.key} · {countsByType[t.key]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Focos */}
        {myFocuses.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center flex flex-col items-center gap-3">
            <div className="p-4 bg-indigo-50 text-indigo-500 rounded-2xl"><Target size={32} /></div>
            <p className="text-lg font-black text-gray-700">Aún no hay focos para {role}</p>
            <p className="text-sm text-gray-500 font-medium max-w-md">Crea los focos que este entrenador va a analizar en el partido. Cómo se registra cada foco se configura después, en Registro en Vivo.</p>
            <button onClick={() => setEditorFocus('new')} className="mt-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2">
              <Plus size={16} strokeWidth={3} /> Crear el primer foco
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {myFocuses.map(f => {
              const d = getFocusDetails(f) as FocusDetails;
              const meta = typeMeta(d.focusType);
              const TypeIcon = meta.icon;
              const phases: Phase[] = d.phases?.length ? d.phases : (d.phase ? [d.phase] : []);
              const players = d.focusType === 'Individual'
                ? (d.playerId ? [playerName(d.playerId)] : [])
                : (d.playerIds || []).map(playerName).filter(Boolean);

              const targetPlayer = d.focusType === 'Individual' && d.playerId ? playerById(d.playerId) : undefined;
              const mainPhase = phases.length ? phases.slice().sort((x, y) => (PHASE_ORDER[x] ?? 9) - (PHASE_ORDER[y] ?? 9))[0] : undefined;
              const mainPhaseMeta = mainPhase ? phaseMeta(mainPhase) : null;

              return (
                <div key={f.id} className="relative bg-white border border-gray-200 rounded-3xl shadow-sm hover:shadow-lg transition-all group overflow-hidden flex flex-col text-center">
                  <div className={`h-1.5 w-full bg-gradient-to-r ${meta.solid}`} />

                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={() => setEditorFocus(f)} className="p-1.5 text-gray-400 hover:text-indigo-600 bg-white/90 hover:bg-indigo-50 rounded-lg shadow-sm transition-colors" title="Editar foco"><Pencil size={16} /></button>
                    <button onClick={() => removeFocus(f)} className="p-1.5 text-gray-400 hover:text-red-600 bg-white/90 hover:bg-red-50 rounded-lg shadow-sm transition-colors" title="Eliminar foco"><Trash2 size={16} /></button>
                  </div>

                  <div className="p-5 flex flex-col items-center gap-3">
                    {targetPlayer ? (
                      <div className={`relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-br ${meta.solid} shadow-md`}>
                        {targetPlayer.photo_url ? (
                          <img
                            src={targetPlayer.photo_url}
                            alt={`${targetPlayer.first_name} ${targetPlayer.last_name}`}
                            className="w-full h-full rounded-full object-cover object-top bg-white"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-black text-gray-500 text-lg">
                            {`${targetPlayer.first_name?.[0] || ''}${targetPlayer.last_name?.[0] || ''}`.toUpperCase()}
                          </div>
                        )}
                        <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br ${meta.solid} text-white flex items-center justify-center shadow-sm border-2 border-white`}>
                          <TypeIcon size={12} />
                        </span>
                      </div>
                    ) : (
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.solid} text-white flex items-center justify-center shadow-md`}>
                        <TypeIcon size={22} />
                      </div>
                    )}

                    <h4 className="font-black text-gray-900 text-lg leading-tight px-2">{f.title}</h4>

                    <div className="flex flex-wrap justify-center gap-1.5">
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${meta.chip}`}>
                        <TypeIcon size={11} /> {d.focusType || 'Colectivo'}
                      </span>
                      {phases.map(ph => {
                        const pm = phaseMeta(ph);
                        const PhIcon = pm.icon;
                        return (
                          <span key={ph} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${pm.chip}`}>
                            <PhIcon size={11} /> {ph}
                          </span>
                        );
                      })}
                    </div>

                    {players.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {players.map(p => (
                          <span key={p} className="text-[11px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">{p}</span>
                        ))}
                      </div>
                    )}

                    {d.text && <p className="text-sm text-gray-500 leading-relaxed line-clamp-4">{d.text}</p>}
                  </div>

                  {mainPhaseMeta && <div className={`h-1 w-full ${mainPhaseMeta.bar} mt-auto`} />}
                </div>
              );
            })}

            <button
              onClick={() => setEditorFocus('new')}
              className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-3xl p-5 min-h-[180px] flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-all"
            >
              <Plus size={28} strokeWidth={3} />
              <span className="font-black text-sm uppercase tracking-wider">Nuevo foco</span>
            </button>
          </div>
        )}

        {editorFocus && (
          <FocusEditorModal
            focus={editorFocus === 'new' ? null : editorFocus}
            matchId={match.id}
            role={role}
            order={focuses.length}
            players={dbPlayers || []}
            onClose={() => setEditorFocus(null)}
            onSaved={() => { setEditorFocus(null); loadFocuses(match.id); getAllMatchFocuses().then(setAllFocuses).catch(() => {}); }}
          />
        )}
      </div>
    );
  }

  return null;
}

// ===================== Editor de foco =====================

interface EditorProps {
  focus: MatchFocus | null;
  matchId: string;
  role: string;
  order: number;
  players: any[];
  onClose: () => void;
  onSaved: () => void;
}

function FocusEditorModal({ focus, matchId, role, order, players, onClose, onSaved }: EditorProps) {
  const existing = focus ? (getFocusDetails(focus) as FocusDetails) : ({} as FocusDetails);
  const [title, setTitle] = useState(focus?.title || '');
  const [text, setText] = useState(existing.text || '');
  const [type, setType] = useState<FocusType>((existing.focusType as FocusType) || 'Colectivo');
  const [phases, setPhases] = useState<Phase[]>(existing.phases?.length ? existing.phases : (existing.phase ? [existing.phase] : ['Ofensivo']));
  const [playerId, setPlayerId] = useState(existing.playerId || '');
  const [playerIds, setPlayerIds] = useState<string[]>(existing.playerIds || []);
  const [needsPitch, setNeedsPitch] = useState(existing.needs_pitch || false);
  const [needsZones, setNeedsZones] = useState(existing.needs_zones || false);
  const [needsPlayers, setNeedsPlayers] = useState(existing.needs_players || false);
  const [needsPlayerSelection, setNeedsPlayerSelection] = useState(existing.needs_player_selection || false);
  const [needsComments, setNeedsComments] = useState(existing.needs_comments || false);
  const [needsOutcome, setNeedsOutcome] = useState(existing.needs_outcome || false);
  const [assignedTo, setAssignedTo] = useState(existing.assignedTo || role);
  const [playerSearch, setPlayerSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => (a.first_name || '').localeCompare(b.first_name || '')),
    [players]
  );
  const shownPlayers = useMemo(() => {
    const term = playerSearch.trim().toLowerCase();
    if (!term) return sortedPlayers;
    return sortedPlayers.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(term));
  }, [sortedPlayers, playerSearch]);

  const selectedPlayer = playerId ? players.find((p: any) => p.id === playerId) : undefined;

  const togglePhase = (p: Phase) => setPhases(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const togglePlayer = (id: string) => setPlayerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const save = async () => {
    if (!title.trim()) return alert('El título es obligatorio.');
    if (phases.length === 0) return alert('Selecciona al menos una fase del juego.');
    if (!assignedTo.trim()) return alert('El entrenador responsable es obligatorio.');
    if (type === 'Individual' && !playerId) return alert('Selecciona el jugador objetivo.');
    if (type === 'Grupal' && playerIds.length === 0) return alert('Selecciona al menos un jugador implicado.');

    // Se conserva la configuración de "cómo registrar", que se edita en Registro en Vivo
    const details: FocusDetails = {
      text: text.trim(),
      focusType: type,
      phases,
      assignedTo: assignedTo.trim(),
      playerId: type === 'Individual' ? playerId : '',
      playerIds: type === 'Grupal' ? playerIds : [],
      needs_pitch: needsPitch,
      needs_zones: needsZones,
      needs_players: needsPlayers,
      needs_player_selection: needsPlayerSelection,
      needs_comments: needsComments,
      needs_outcome: needsOutcome,
    };

    setSaving(true);
    try {
      if (focus) {
        await updateMatchFocus(focus.id, { title: title.trim(), description: JSON.stringify(details) });
      } else {
        await createMatchFocus({ match_id: matchId, title: title.trim(), description: JSON.stringify(details), order });
      }
      onSaved();
    } catch (e) {
      console.error(e);
      alert('No se ha podido guardar el foco.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 pt-12 md:pt-20">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col my-8">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl z-10">
          <div>
            <h3 className="font-black text-gray-900 text-xl">{focus ? 'Editar foco' : 'Nuevo foco'}</h3>
            <p className="text-sm font-bold text-gray-400">Responsable: {assignedTo || role}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">Título del foco</label>
            <input
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Ej. Salida de balón bajo presión"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-800 uppercase tracking-wider block mb-2">Cómo registrar en vivo (Características)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer hover:bg-slate-100 p-2.5 rounded-xl transition-colors text-slate-900 border border-slate-100">
                <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 border-slate-300" checked={needsOutcome} onChange={(e) => setNeedsOutcome(e.target.checked)} />
                <span>Pedir Valoración (Bien/Mal)</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer hover:bg-slate-100 p-2.5 rounded-xl transition-colors text-slate-900 border border-slate-100">
                <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 border-slate-300" checked={needsPitch} onChange={(e) => setNeedsPitch(e.target.checked)} />
                <span>Pedir Campo</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer hover:bg-slate-100 p-2.5 rounded-xl transition-colors text-slate-900 border border-slate-100">
                <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 border-slate-300" checked={needsZones} onChange={(e) => setNeedsZones(e.target.checked)} />
                <span>Pedir Zonas</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer hover:bg-slate-100 p-2.5 rounded-xl transition-colors text-slate-900 border border-slate-100">
                <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 border-slate-300" checked={needsPlayers} onChange={(e) => setNeedsPlayers(e.target.checked)} />
                <span>Nº Jugadores</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer hover:bg-slate-100 p-2.5 rounded-xl transition-colors text-slate-900 border border-slate-100">
                <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 border-slate-300" checked={needsPlayerSelection} onChange={(e) => setNeedsPlayerSelection(e.target.checked)} />
                <span>Pedir Jugador</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer hover:bg-slate-100 p-2.5 rounded-xl transition-colors text-slate-900 border border-slate-100">
                <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 border-slate-300" checked={needsComments} onChange={(e) => setNeedsComments(e.target.checked)} />
                <span>Observaciones</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">Tipo de foco</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {FOCUS_TYPES.map(t => {
                const Icon = t.icon;
                const active = type === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setType(t.key)}
                    className={`relative flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 text-xs font-black uppercase tracking-wider transition-all ${active ? `${t.active} scale-[1.03]` : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600'}`}
                  >
                    {active && (
                      <span className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center ${t.badge}`}>
                        <Check size={14} strokeWidth={4} />
                      </span>
                    )}
                    <Icon size={22} /> {t.key}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">Fases del juego</label>
            <div className="flex flex-wrap gap-3">
              {PHASES.map(p => {
                const Icon = p.icon;
                const active = phases.includes(p.key);
                return (
                  <button
                    key={p.key}
                    onClick={() => togglePhase(p.key)}
                    className={`relative flex items-center gap-2 px-5 py-3 rounded-xl border-2 text-sm font-black transition-all ${active ? `${p.active} scale-[1.03]` : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600'}`}
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center border-2 ${active ? 'bg-white/95 border-white/95' : 'border-gray-300'} ${active ? p.badge : ''}`}>
                      {active && <Check size={13} strokeWidth={4} />}
                    </span>
                    <Icon size={16} /> {p.key}
                  </button>
                );
              })}
            </div>
          </div>

          {type === 'Individual' && (
            <div>
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">Jugador objetivo</label>
              <select
                className={`w-full rounded-xl px-4 py-3 text-sm font-bold outline-none border-2 transition-colors ${playerId ? 'border-emerald-500 bg-emerald-50 text-emerald-800 focus:ring-2 focus:ring-emerald-400' : 'border-gray-200 focus:ring-2 focus:ring-indigo-500'}`}
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
              >
                <option value="">Selecciona jugador...</option>
                {sortedPlayers.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
              {selectedPlayer && (
                <div className="flex items-center gap-3 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  {selectedPlayer.photo_url ? (
                    <img src={selectedPlayer.photo_url} alt="" className="w-12 h-12 rounded-full object-cover object-top bg-white border-2 border-white shadow-sm" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center font-black text-emerald-700">
                      {`${selectedPlayer.first_name?.[0] || ''}${selectedPlayer.last_name?.[0] || ''}`.toUpperCase()}
                    </div>
                  )}
                  <span className="font-black text-emerald-800 text-sm">{selectedPlayer.first_name} {selectedPlayer.last_name}</span>
                </div>
              )}
            </div>
          )}

          {type === 'Grupal' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-wider">Jugadores implicados</label>
                <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">{playerIds.length} seleccionado{playerIds.length === 1 ? '' : 's'}</span>
              </div>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm mb-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Buscar jugador..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {shownPlayers.map(p => {
                  const active = playerIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlayer(p.id)}
                      className={`flex items-center gap-2 text-sm font-bold p-2.5 rounded-lg text-left transition-all border-2 ${active ? 'bg-teal-600 border-teal-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 border-transparent'}`}
                    >
                      <span className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 ${active ? 'bg-white border-white text-teal-700' : 'border-gray-300'}`}>
                        {active && <Check size={12} strokeWidth={4} />}
                      </span>
                      {p.first_name} {p.last_name}
                    </button>
                  );
                })}
                {shownPlayers.length === 0 && <p className="text-xs text-gray-400 font-bold p-2">Sin jugadores.</p>}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">Entrenador responsable</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">Descripción / qué observar</label>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              rows={4}
              placeholder="Detalle del foco: qué se busca, referencias, criterios..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <span className="text-[11px] font-black uppercase tracking-widest text-gray-400 mr-1">Seleccionado</span>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-black uppercase tracking-wider ${typeMeta(type).chip}`}>
              <Check size={12} strokeWidth={4} /> {type}
            </span>
            {phases.map(ph => {
              const pm = PHASES.find(x => x.key === ph)!;
              return (
                <span key={ph} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-black uppercase tracking-wider ${pm.chip}`}>
                  <Check size={12} strokeWidth={4} /> {ph}
                </span>
              );
            })}
            {phases.length === 0 && <span className="text-[11px] font-black uppercase tracking-wider text-red-500">Falta la fase</span>}
            {type === 'Individual' && (
              <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-black uppercase tracking-wider ${playerId ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-red-500 border-red-200 bg-red-50'}`}>
                {playerId ? (sortedPlayers.find(p => p.id === playerId) ? `${sortedPlayers.find(p => p.id === playerId).first_name} ${sortedPlayers.find(p => p.id === playerId).last_name}` : 'Jugador') : 'Falta el jugador'}
              </span>
            )}
            {type === 'Grupal' && (
              <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-black uppercase tracking-wider ${playerIds.length ? 'bg-teal-50 text-teal-700 border-teal-200' : 'text-red-500 border-red-200 bg-red-50'}`}>
                {playerIds.length ? `${playerIds.length} jugador${playerIds.length === 1 ? '' : 'es'}` : 'Faltan jugadores'}
              </span>
            )}
          </div>

          <p className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-100 rounded-xl p-3">
            Cómo registrar este foco (campo, zonas, nº de jugadores, jugador implicado, observaciones) se configura en <span className="text-gray-600">Registro en Vivo</span>, con el icono de ajustes de cada foco.
          </p>
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-3xl sticky bottom-0">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-md">
            <Check size={16} /> {saving ? 'Guardando...' : 'Guardar foco'}
          </button>
        </div>
      </div>
    </div>
  );
}
