import { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, Edit2, Trash2, Check, X, Clock, Filter, Flag, ChevronLeft, AlertTriangle, Sliders, MapPinned, Grid3x3, Hash, UserPlus, MessageSquare, ThumbsUp, ThumbsDown, Minus, BarChart3, FileDown, ChevronDown } from 'lucide-react';
import type { MatchDB, MatchFocus, MatchDataPoint } from '../types';
import { createMatchDataPoint, deleteMatchDataPoint, deleteAllMatchDataPoints, updateMatchDataPoint, updateMatchFocus, isTimerPersistenceAvailable } from '../../services/matches';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import MatchDataEditModal from './MatchDataEditModal';
import PitchGraph from './PitchGraph';
import { exportLiveRegistrationPdf, type FocusStatRow } from '../../utils/liveRegistrationPdf';

interface Props {
  match: MatchDB;
  focuses: MatchFocus[];
  dataPoints: MatchDataPoint[];
  onUpdateMatch: (updates: Partial<MatchDB>) => Promise<void>;
  onRefreshDataPoints: () => void;
  /** Recarga los focos tras cambiar su configuración de registro. */
  onRefreshFocuses?: () => void;
  /** Rol (entrenador) activo controlado desde fuera. Si no se pasa, se gestiona internamente. */
  role?: string;
  onChangeRole?: (role: string) => void;
  /** Si se pasa, se muestra la barra de salida con protección de cronómetro. */
  onExit?: () => void;
}

export const getFocusRole = (f: MatchFocus): string => {
  try {
    const d = JSON.parse(f.description || '{}');
    if (d.assignedTo && String(d.assignedTo).trim()) return String(d.assignedTo).trim();
  } catch (e) { /* descripción en texto plano */ }
  return 'General';
};

export const getFocusDetails = (f: MatchFocus): any => {
  try { return JSON.parse(f.description || '{}'); } catch (e) { return {}; }
};

export default function MatchLiveRegistrationView({ match, focuses, dataPoints, onUpdateMatch, onRefreshDataPoints, onRefreshFocuses, role, onChangeRole, onExit }: Props) {
  const { data: dbPlayers } = useSupabaseData<any>('players');
  const [internalRole, setInternalRole] = useState<string>('');
  const [liveSeconds, setLiveSeconds] = useState(0);
  // El cronómetro se gobierna en local y se persiste en segundo plano: así funciona
  // aunque la base de datos aún no tenga las columnas timer_*
  const [timer, setTimer] = useState(() => ({
    running: !!match.timer_is_running,
    startedAt: match.timer_start_time ? new Date(match.timer_start_time).getTime() : null,
    accumulated: match.timer_accumulated_seconds || 0,
  }));
  const [persistWarning, setPersistWarning] = useState<string | null>(null);
  const [lastPoint, setLastPoint] = useState<{ point: MatchDataPoint; focusTitle: string } | null>(null);
  const [quickComment, setQuickComment] = useState('');
  const [editingPoint, setEditingPoint] = useState<MatchDataPoint | null>(null);
  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [timerDraft, setTimerDraft] = useState('00:00');
  const [logFilterFocusId, setLogFilterFocusId] = useState<string | null>(null);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [configFocus, setConfigFocus] = useState<MatchFocus | null>(null);
  const [activeTab, setActiveTab] = useState<'registro' | 'vision_general'>('registro');
  const [exporting, setExporting] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<string>('1ª Parte');
  const [deletePrompt, setDeletePrompt] = useState<{ type: 'all' | 'single', id?: string } | null>(null);

  const roles = useMemo(
    () => Array.from(new Set(focuses.map(getFocusRole))).sort((a, b) => a.localeCompare(b)),
    [focuses]
  );

  const activeRole = role !== undefined ? role : internalRole;
  const setActiveRole = (r: string) => { onChangeRole ? onChangeRole(r) : setInternalRole(r); };

  useEffect(() => {
    if (role === undefined && !internalRole && roles.length > 0) setInternalRole(roles[0]);
  }, [roles, internalRole, role]);

  // Al cambiar de partido se recupera lo persistido
  useEffect(() => {
    setTimer({
      running: !!match.timer_is_running,
      startedAt: match.timer_start_time ? new Date(match.timer_start_time).getTime() : null,
      accumulated: match.timer_accumulated_seconds || 0,
    });
  }, [match.id]);

  useEffect(() => {
    const compute = () => {
      if (timer.running && timer.startedAt) {
        setLiveSeconds(timer.accumulated + Math.max(0, Math.floor((Date.now() - timer.startedAt) / 1000)));
      } else {
        setLiveSeconds(timer.accumulated);
      }
    };
    compute();
    if (!timer.running) return;
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Persiste el estado del cronómetro sin bloquear la interfaz
  const persistTimer = async (updates: Partial<MatchDB>) => {
    try {
      await onUpdateMatch(updates);
      if (!isTimerPersistenceAvailable()) {
        setPersistWarning('El cronómetro funciona, pero no se guarda en la base de datos: falta aplicar la migración de partidos en vivo.');
      }
    } catch (e) {
      console.error(e);
      setPersistWarning('El cronómetro funciona en este dispositivo, pero no se ha podido guardar en la base de datos.');
    }
  };

  // Aviso del navegador si se intenta cerrar la pestaña con el crono en marcha
  const runningRef = useRef(timer.running);
  runningRef.current = timer.running;
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!runningRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentMinute = Math.floor(liveSeconds / 60);

  const toggleTimer = () => {
    if (timer.running) {
      setTimer({ running: false, startedAt: null, accumulated: liveSeconds });
      persistTimer({ timer_is_running: false, timer_accumulated_seconds: liveSeconds, timer_start_time: null });
    } else {
      const startedAt = Date.now();
      setTimer({ running: true, startedAt, accumulated: liveSeconds });
      persistTimer({
        timer_is_running: true,
        timer_start_time: new Date(startedAt).toISOString(),
        timer_accumulated_seconds: liveSeconds,
        ...(match.status === 'Scheduled' ? { status: 'Live' as const } : {}),
      });
    }
  };

  const openTimerEditor = () => {
    setTimerDraft(formatTime(liveSeconds));
    setIsEditingTimer(true);
  };

  const parseDraft = (raw: string): number | null => {
    const txt = raw.trim();
    let mins = 0, secs = 0;
    if (txt.includes(':')) {
      const [m, s] = txt.split(':');
      if (m === '' || isNaN(Number(m)) || (s !== '' && isNaN(Number(s)))) return null;
      mins = Number(m); secs = s === '' ? 0 : Number(s);
    } else {
      if (txt === '' || isNaN(Number(txt))) return null;
      mins = Number(txt);
    }
    if (mins < 0 || secs < 0 || secs > 59) return null;
    return Math.floor(mins * 60 + secs);
  };

  // Al guardar el crono editado: si está en marcha, sigue corriendo desde el valor puesto por el usuario
  const saveTimerEdit = () => {
    const total = parseDraft(timerDraft);
    if (total === null) { alert('Formato no válido. Usa mm:ss (por ejemplo 45:00).'); return; }
    setLiveSeconds(total);
    setIsEditingTimer(false);
    if (timer.running) {
      const startedAt = Date.now();
      setTimer({ running: true, startedAt, accumulated: total });
      persistTimer({ timer_is_running: true, timer_accumulated_seconds: total, timer_start_time: new Date(startedAt).toISOString() });
    } else {
      setTimer({ running: false, startedAt: null, accumulated: total });
      persistTimer({ timer_accumulated_seconds: total, timer_start_time: null });
    }
  };

  const handleExitClick = () => {
    if (!onExit) return;
    if (timer.running) { setShowExitPrompt(true); return; }
    onExit();
  };

  const finishMatch = async () => {
    setTimer({ running: false, startedAt: null, accumulated: liveSeconds });
    await persistTimer({ timer_is_running: false, timer_accumulated_seconds: liveSeconds, timer_start_time: null, status: 'Finished' });
    setShowExitPrompt(false);
    onExit?.();
  };

  const logFocus = async (f: MatchFocus, outcome: MatchDataPoint['outcome'] = 'Neutral') => {
    const details = getFocusDetails(f);
    const needsExtra = !!(details.needs_pitch || details.needs_zones || details.needs_players || details.needs_player_selection);

    try {
      const newPoint = await createMatchDataPoint({
        match_id: match.id,
        focus_id: f.id,
        minute: currentMinute,
        type: f.title,
        outcome,
        coordinates: { period: currentPeriod }
      });

      onRefreshDataPoints();
      setPersistWarning(null);

      if (!newPoint) return;
      if (needsExtra) {
        setEditingPoint(newPoint);
      } else {
        // Barra rápida para añadir un comentario a este registro si hace falta
        setLastPoint({ point: newPoint, focusTitle: f.title });
        setQuickComment('');
      }
    } catch (e: any) {
      console.error(e);
      setPersistWarning(`No se ha podido registrar el evento: ${e?.message || 'error desconocido'}`);
    }
  };

  const saveQuickComment = async () => {
    if (!lastPoint) return;
    const text = quickComment.trim();
    if (text) {
      await updateMatchDataPoint(lastPoint.point.id, { comments: text });
      onRefreshDataPoints();
    }
    setLastPoint(null);
    setQuickComment('');
  };

  // Cambia rápido el resultado de un evento ya registrado (acierto / fallo / neutro)
  const cycleOutcome = async (dp: MatchDataPoint) => {
    const next: MatchDataPoint['outcome'] = dp.outcome === 'Success' ? 'Failure' : dp.outcome === 'Failure' ? 'Neutral' : 'Success';
    await updateMatchDataPoint(dp.id, { outcome: next });
    onRefreshDataPoints();
  };

  const myFocuses = useMemo(() => focuses.filter(f => getFocusRole(f) === activeRole), [focuses, activeRole]);

  const focusesGrouped = useMemo(() => myFocuses.reduce((acc, f) => {
    const type = getFocusDetails(f).focusType || 'Colectivo';
    if (!acc[type]) acc[type] = [];
    acc[type].push(f);
    return acc;
  }, {} as Record<string, MatchFocus[]>), [myFocuses]);

  // Si la columna focus_id no existe todavía, los eventos se enlazan por el título del foco
  const pointsOfFocus = (f: MatchFocus) =>
    dataPoints.filter(dp => (dp.focus_id ? dp.focus_id === f.id : dp.type === f.title));

  const statsFor = (f: MatchFocus) => {
    const pts = pointsOfFocus(f);
    const success = pts.filter(dp => dp.outcome === 'Success').length;
    const failure = pts.filter(dp => dp.outcome === 'Failure').length;
    const neutral = pts.length - success - failure;
    const valued = success + failure;
    return { total: pts.length, success, failure, neutral, pct: valued > 0 ? Math.round((success / valued) * 100) : null };
  };

  // Visión general del entrenador activo
  const summaryRows: FocusStatRow[] = useMemo(() => myFocuses.map(f => {
    const st = statsFor(f);
    return { title: f.title, type: getFocusDetails(f).focusType || 'Colectivo', ...st };
  }), [myFocuses, dataPoints]);

  const summaryTotals = useMemo(() => {
    const total = summaryRows.reduce((a, r) => a + r.total, 0);
    const success = summaryRows.reduce((a, r) => a + r.success, 0);
    const failure = summaryRows.reduce((a, r) => a + r.failure, 0);
    const neutral = summaryRows.reduce((a, r) => a + r.neutral, 0);
    const valued = success + failure;
    return { total, success, failure, neutral, pct: valued > 0 ? Math.round((success / valued) * 100) : null };
  }, [summaryRows]);

  const myDataPoints = useMemo(() => {
    const ids = new Set(myFocuses.map(f => f.id));
    const titles = new Set(myFocuses.map(f => f.title));
    return dataPoints.filter(dp => (dp.focus_id ? ids.has(dp.focus_id) : titles.has(dp.type)));
  }, [dataPoints, myFocuses]);

  const pctColor = (pct: number | null) => pct == null ? 'text-gray-400' : pct >= 60 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600';
  const pctBar = (pct: number | null) => pct == null ? 'bg-gray-300' : pct >= 60 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';

  const handleExportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportLiveRegistrationPdf({
        match,
        role: activeRole || 'Cuerpo Técnico',
        focuses: myFocuses,
        dataPoints: myDataPoints,
        rows: summaryRows,
        elapsedLabel: formatTime(liveSeconds),
      });
    } catch (e) {
      console.error(e);
      alert('No se ha podido generar el PDF.');
    } finally {
      setExporting(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Colectivo': return 'bg-blue-700 hover:bg-blue-600 text-white border-blue-900';
      case 'Grupal': return 'bg-gray-600 hover:bg-gray-500 text-white border-gray-800';
      case 'Individual': return 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-900';
      case 'Rival': return 'bg-red-800 hover:bg-red-700 text-white border-red-950';
      default: return 'bg-gray-800 hover:bg-gray-700 text-white border-black';
    }
  };

  const filteredFocus = logFilterFocusId ? focuses.find(f => f.id === logFilterFocusId) : undefined;
  const visibleDataPoints = filteredFocus ? pointsOfFocus(filteredFocus) : dataPoints;
  const filteredFocusTitle = filteredFocus?.title || '';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {onExit && (
            <button onClick={handleExitClick} className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-gray-900 px-2 py-2 rounded-lg hover:bg-gray-100">
              <ChevronLeft size={16} /> Salir
            </button>
          )}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Entrenador / Rol</label>
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" value={activeRole} onChange={(e) => setActiveRole(e.target.value)}>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
              {roles.length === 0 && <option value="">Sin Roles</option>}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Periodo</label>
            <select className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={currentPeriod} onChange={(e) => setCurrentPeriod(e.target.value)}>
              <option value="1ª Parte">1ª Parte</option>
              <option value="2ª Parte">2ª Parte</option>
              <option value="Descanso">Descanso</option>
              <option value="Prórroga">Prórroga</option>
              <option value="Penaltis">Penaltis</option>
            </select>
          </div>
          
          {isEditingTimer ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={timerDraft}
                onChange={(e) => setTimerDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTimerEdit(); if (e.key === 'Escape') setIsEditingTimer(false); }}
                placeholder="mm:ss"
                className="w-40 text-4xl font-black font-mono text-center border-2 border-blue-500 rounded-lg px-2 py-1 outline-none"
              />
              <button onClick={saveTimerEdit} className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow" title="Guardar minuto"><Check size={20} /></button>
              <button onClick={() => setIsEditingTimer(false)} className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg" title="Cancelar"><X size={20} /></button>
            </div>
          ) : (
            <button onClick={openTimerEditor} className="group flex items-center gap-2 text-5xl font-black font-mono text-gray-900 tracking-tight px-2" title="Editar cronómetro">
              {formatTime(liveSeconds)}
              <Clock size={18} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
            </button>
          )}

          <button
            onClick={toggleTimer}
            className={`w-16 h-16 flex items-center justify-center rounded-full text-white shadow-xl transition-transform hover:scale-105 active:scale-95 ${timer.running ? 'bg-amber-500 hover:bg-amber-400' : 'bg-emerald-600 hover:bg-emerald-500'}`}
            title={timer.running ? 'Pausar cronómetro' : 'Iniciar cronómetro'}
          >
            {timer.running ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
          </button>

          {onExit && (
            <button onClick={() => setShowExitPrompt(true)} className="flex items-center gap-2 px-4 py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-bold shadow-md" title="Finalizar registro">
              <Flag size={16} /> Finalizar
            </button>
          )}
        </div>
      </div>

      {persistWarning && (
        <div className="flex items-start gap-3 text-sm font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <span className="flex-1">{persistWarning}</span>
          <button onClick={() => setPersistWarning(null)} className="text-amber-500 hover:text-amber-700"><X size={16} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
        <button 
          onClick={() => setActiveTab('registro')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'registro' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Registro y Cronología
        </button>
        <button 
          onClick={() => setActiveTab('vision_general')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === 'vision_general' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <BarChart3 size={16} /> Visión General
        </button>
      </div>

      {timer.running && (
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Registro en directo · minuto {currentMinute}'
        </div>
      )}

      {activeRole && (
        <div className="bg-gray-200/50 p-4 rounded-2xl border border-gray-200 shadow-inner space-y-4">
          {myFocuses.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8 font-bold">No hay focos asignados a este entrenador.</p>
          ) : (
            Object.entries(focusesGrouped).map(([type, grpFocuses]) => (
              <div key={type} className="bg-gray-100 p-4 rounded-xl border border-gray-300 shadow-sm">
                <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs mb-3 border-b-2 border-gray-300 pb-1 flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-sm ${type === 'Rival' ? 'bg-red-700' : type === 'Colectivo' ? 'bg-blue-700' : type === 'Individual' ? 'bg-emerald-700' : 'bg-gray-600'}`}></span>
                  {type}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {grpFocuses.map(f => {
                    const st = statsFor(f);
                    const tileDetails = getFocusDetails(f);
                    const tilePlayer = tileDetails.focusType === 'Individual' && tileDetails.playerId
                      ? (dbPlayers || []).find((p: any) => p.id === tileDetails.playerId)
                      : undefined;
                    return (
                      <div key={f.id} className={`relative rounded-xl shadow-md overflow-hidden select-none ${getTypeColor(type)}`}>
                        <button
                          onClick={() => logFocus(f, 'Neutral')}
                          className="w-full px-2 pt-9 pb-3 min-h-[7.5rem] flex flex-col items-center justify-center gap-2 text-center hover:brightness-110 transition-all active:scale-[0.98]"
                          title="Registrar sin valorar (neutro)"
                        >
                          {tilePlayer && (
                            tilePlayer.photo_url ? (
                              <img
                                src={tilePlayer.photo_url}
                                alt={`${tilePlayer.first_name} ${tilePlayer.last_name}`}
                                className="w-12 h-12 rounded-full object-cover object-top bg-white border-2 border-white/80 shadow-md"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <span className="w-12 h-12 rounded-full bg-white/90 text-gray-700 flex items-center justify-center font-black text-base border-2 border-white/80 shadow-md">
                                {`${tilePlayer.first_name?.[0] || ''}${tilePlayer.last_name?.[0] || ''}`.toUpperCase()}
                              </span>
                            )
                          )}
                          <span className="font-black text-base sm:text-lg leading-tight line-clamp-3">{f.title}</span>
                          {tilePlayer && <span className="text-xs font-bold text-white/80 leading-none">{tilePlayer.first_name} {tilePlayer.last_name}</span>}
                        </button>

                        <div className="flex border-t border-black/20">
                          <button
                            onClick={() => logFocus(f, 'Success')}
                            className="flex-1 py-3 bg-emerald-500/90 hover:bg-emerald-400 text-white flex items-center justify-center gap-2 font-black text-sm transition-colors active:translate-y-px"
                            title="Registrar como acierto"
                          >
                            <ThumbsUp size={16} /> {st.success}
                          </button>
                          <button
                            onClick={() => logFocus(f, 'Failure')}
                            className="flex-1 py-3 bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center gap-2 font-black text-sm transition-colors active:translate-y-px border-l border-black/20"
                            title="Registrar como fallo"
                          >
                            <ThumbsDown size={16} /> {st.failure}
                          </button>
                        </div>

                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-black shadow-sm ${st.pct == null ? 'bg-black/30 text-white/70' : st.pct >= 60 ? 'bg-emerald-400 text-emerald-950' : st.pct >= 40 ? 'bg-amber-400 text-amber-950' : 'bg-red-400 text-red-950'}`}
                            title="% de acierto de este foco"
                          >
                            {st.pct == null ? '—' : `${st.pct}%`}
                          </span>
                          <button
                            onClick={() => setLogFilterFocusId(prev => prev === f.id ? null : f.id)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-black shadow-sm transition-colors ${logFilterFocusId === f.id ? 'bg-white text-gray-900' : 'bg-black/30 text-white hover:bg-black/60'}`}
                            title="Ver y editar los registros de este foco"
                          >
                            {st.total}
                          </button>
                        </div>

                        <button
                          onClick={() => setConfigFocus(f)}
                          className="absolute top-1.5 left-1.5 p-1.5 bg-black/40 hover:bg-black/70 text-white rounded shadow-sm"
                          title="Configurar cómo se registra este foco"
                        >
                          <Sliders size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'vision_general' ? (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-200 pb-3 gap-3">
            <div>
              <h4 className="font-black text-gray-900 text-lg">Visión general{activeRole ? ` · ${activeRole}` : ''}</h4>
              <p className="text-sm font-bold text-gray-500">{summaryTotals.total} evento{summaryTotals.total === 1 ? '' : 's'} registrado{summaryTotals.total === 1 ? '' : 's'}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">Aciertos {summaryTotals.success}</span>
              <span className="text-xs font-black uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">Fallos {summaryTotals.failure}</span>
              <span className="text-xs font-black uppercase tracking-wider text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg">Neutros {summaryTotals.neutral}</span>
              <span className={`text-sm font-black px-3 py-1.5 rounded-lg border ${summaryTotals.pct == null ? 'text-gray-400 bg-gray-50 border-gray-200' : summaryTotals.pct >= 60 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : summaryTotals.pct >= 40 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                {summaryTotals.pct == null ? '— %' : `${summaryTotals.pct}%`} acierto
              </span>
              <button
                onClick={handleExportPdf}
                disabled={exporting}
                className="px-4 py-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 ml-2"
              >
                <FileDown size={16} /> {exporting ? 'Generando...' : 'Exportar PDF'}
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {myFocuses.length === 0 && <p className="text-sm text-gray-400 font-bold text-center py-4">Este entrenador no tiene focos asignados.</p>}
            {myFocuses.map(f => {
              const r = { title: f.title, type: getFocusDetails(f).focusType || 'Colectivo', ...statsFor(f) };
              const d = getFocusDetails(f);
              const asks = [
                d.needs_pitch && 'Campo',
                d.needs_zones && 'Zonas',
                d.needs_players && 'Nº jug.',
                d.needs_player_selection && 'Jugador',
                d.needs_comments && 'Observ.',
              ].filter(Boolean) as string[];
              
              const pts = myDataPoints.filter(dp => dp.focus_id === f.id && dp.coordinates?.x != null && dp.coordinates?.y != null);

              return (
              <div key={f.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{r.title}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">{r.type}</span>
                      {asks.length > 0
                        ? asks.map(a => <span key={a} className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">{a}</span>)
                        : <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">Registro directo</span>}
                      <button onClick={() => setConfigFocus(f)} className="text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-blue-700 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-blue-50" title="Configurar cómo se registra">
                        <Sliders size={11} /> Editar registro
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-black text-gray-500 w-12 text-right">{r.total} ev.</span>
                    <span className="text-xs font-black text-emerald-600 w-8 text-right">{r.success}</span>
                    <span className="text-xs font-black text-red-600 w-8 text-right">{r.failure}</span>
                    <div className="w-24 sm:w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${pctBar(r.pct)} transition-all`} style={{ width: `${r.pct ?? 0}%` }} />
                    </div>
                    <span className={`text-sm font-black w-12 text-right ${pctColor(r.pct)}`}>{r.pct == null ? '—' : `${r.pct}%`}</span>
                  </div>
                </div>
              
              {/* PitchGraph if focus needs pitch */}
              {d.needs_pitch && (
                <div className="mt-3 mb-1 rounded-xl overflow-hidden border border-gray-200 shadow-inner relative max-w-lg mx-auto bg-white">
                  <PitchGraph events={pts} interactive={false} />
                </div>
              )}
              </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <div className="flex items-center gap-3">
              <h4 className="font-black text-gray-900 text-sm">Registro Cronológico</h4>
              {visibleDataPoints.length > 0 && (
                <button 
                  onClick={() => setDeletePrompt({ type: 'all' })} 
                  className="text-xs font-bold text-red-600 bg-red-100 border border-red-200 hover:bg-red-200 hover:text-red-800 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 uppercase tracking-wider"
                  title="Borrar todos los registros de este partido"
                >
                  <Trash2 size={14} /> Borrar todos
                </button>
              )}
            </div>
            {logFilterFocusId && (
              <button onClick={() => setLogFilterFocusId(null)} className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-100">
                <Filter size={12} /> {filteredFocusTitle} <X size={12} />
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {visibleDataPoints.slice().reverse().map(dp => (
              <div key={dp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 group">
                <div>
                  <span className="font-mono font-black text-blue-700 text-sm mr-2">{dp.minute != null ? `${dp.minute}'` : '-'}</span>
                  {dp.coordinates?.period && (
                    <span className="mr-3 text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded uppercase">{dp.coordinates.period}</span>
                  )}
                  <span className="font-bold text-gray-800 text-sm">{dp.type}</span>
                  <button
                    onClick={() => cycleOutcome(dp)}
                    className={`ml-2 inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded uppercase tracking-wider transition-colors ${dp.outcome === 'Success' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : dp.outcome === 'Failure' ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                    title="Cambiar resultado (acierto → fallo → neutro)"
                  >
                    {dp.outcome === 'Success' ? <ThumbsUp size={11} /> : dp.outcome === 'Failure' ? <ThumbsDown size={11} /> : <Minus size={11} />}
                    {dp.outcome === 'Success' ? 'Acierto' : dp.outcome === 'Failure' ? 'Fallo' : 'Neutro'}
                  </button>
                  {dp.comments && <p className="text-xs text-gray-500 mt-1 font-medium">{dp.comments}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingPoint(dp)} className="p-2 text-gray-400 hover:text-blue-700 hover:bg-blue-50 bg-white rounded-lg shadow-sm border border-gray-200 transition-colors" title="Editar registro"><Edit2 size={14} /></button>
                  <button onClick={() => setDeletePrompt({ type: 'single', id: dp.id })} className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-50 bg-white rounded-lg shadow-sm border border-gray-200 transition-colors" title="Borrar registro"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {visibleDataPoints.length === 0 && <p className="text-sm text-gray-400 text-center py-6 font-bold">No hay datos registrados aún.</p>}
          </div>
        </div>
      )}

      {lastPoint && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(38rem,calc(100%-2rem))] bg-gray-900 text-white rounded-2xl shadow-2xl border border-white/10 p-3 flex flex-col sm:flex-row sm:items-center gap-2 animate-fade-in">
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2 py-1 rounded-lg text-[11px] font-black uppercase ${lastPoint.point.outcome === 'Success' ? 'bg-emerald-500' : lastPoint.point.outcome === 'Failure' ? 'bg-red-600' : 'bg-gray-600'}`}>
              {lastPoint.point.minute != null ? `${lastPoint.point.minute}'` : '-'}
            </span>
            <span className="font-bold text-sm truncate max-w-[12rem]">{lastPoint.focusTitle}</span>
          </div>
          <input
            autoFocus
            value={quickComment}
            onChange={(e) => setQuickComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveQuickComment(); if (e.key === 'Escape') { setLastPoint(null); setQuickComment(''); } }}
            placeholder="Comentario (opcional)..."
            className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/40"
          />
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEditingPoint(lastPoint.point)} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold">Más detalle</button>
            <button onClick={saveQuickComment} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold flex items-center gap-1.5"><Check size={15} /> Listo</button>
            <button onClick={() => { setLastPoint(null); setQuickComment(''); }} className="p-2 text-white/50 hover:text-white"><X size={16} /></button>
          </div>
        </div>
      )}

      {editingPoint && (
        <MatchDataEditModal
          dataPoint={editingPoint}
          config={(() => {
            const f = focuses.find(x => (editingPoint.focus_id ? x.id === editingPoint.focus_id : x.title === editingPoint.type));
            if (!f) return undefined;
            const d = getFocusDetails(f);
            return {
              needs_pitch: !!d.needs_pitch,
              needs_zones: !!d.needs_zones,
              needs_players: !!d.needs_players,
              needs_player_selection: !!d.needs_player_selection,
              needs_outcome: !!d.needs_outcome,
              // el comentario siempre debe poder escribirse desde la ficha
              needs_comments: true,
            };
          })()}
          onClose={() => { setEditingPoint(null); setLastPoint(null); }}
          onSave={async (updates) => {
            await updateMatchDataPoint(editingPoint.id, updates);
            onRefreshDataPoints();
          }}
        />
      )}

      {configFocus && (
        <FocusRegistrationConfigModal
          focus={configFocus}
          onClose={() => setConfigFocus(null)}
          onSaved={() => { setConfigFocus(null); onRefreshFocuses?.(); }}
        />
      )}

      {showExitPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl shrink-0"><AlertTriangle size={22} /></div>
              <div>
                <h3 className="font-black text-gray-900 text-lg">
                  {timer.running ? 'El cronómetro sigue en marcha' : 'Finalizar registro'}
                </h3>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  {timer.running
                    ? `Vas por el minuto ${currentMinute}'. Puedes salir y el crono seguirá corriendo, o finalizar el registro del partido.`
                    : 'Se cerrará el registro en directo y el partido quedará marcado como finalizado.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => setShowExitPrompt(false)} className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold">Seguir registrando</button>
              {timer.running && (
                <button onClick={() => { setShowExitPrompt(false); onExit?.(); }} className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-bold">Salir sin parar el crono</button>
              )}
              <button onClick={finishMatch} className="w-full px-4 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                <Flag size={16} /> Finalizar partido y salir
              </button>
            </div>
          </div>
        </div>
      )}

      {deletePrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-100 text-red-600 rounded-xl shrink-0"><Trash2 size={24} /></div>
              <div>
                <h3 className="font-black text-gray-900 text-lg leading-tight">
                  {deletePrompt.type === 'all' ? '¿Borrar todos los registros?' : '¿Borrar este registro?'}
                </h3>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  {deletePrompt.type === 'all' 
                    ? 'Se eliminarán todos los eventos registrados para este partido. Esta acción no se puede deshacer.' 
                    : 'El registro se eliminará permanentemente.'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setDeletePrompt(null)} 
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  if (deletePrompt.type === 'all') {
                    await deleteAllMatchDataPoints(match.id);
                  } else if (deletePrompt.id) {
                    await deleteMatchDataPoint(deletePrompt.id);
                  }
                  onRefreshDataPoints();
                  setDeletePrompt(null);
                }} 
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Configuración de cómo se registra un foco (se pide al pulsarlo en directo) =====

const REGISTRATION_OPTIONS: { key: keyof RegistrationConfig; label: string; hint: string; icon: any }[] = [
  { key: 'needs_outcome', label: 'Valoración', hint: 'Evaluar si la acción fue Bien o Mal', icon: Check },
  { key: 'needs_pitch', label: 'Flechas / Campo', hint: 'Marcar la posición o el recorrido sobre el campo', icon: MapPinned },
  { key: 'needs_zones', label: 'Zonas', hint: 'Elegir la zona del campo donde ocurre', icon: Grid3x3 },
  { key: 'needs_players', label: 'Nº de jugadores', hint: 'Cuántos atacan / defienden en la acción', icon: Hash },
  { key: 'needs_player_selection', label: 'Jugador implicado', hint: 'Asignar la acción a un jugador concreto', icon: UserPlus },
  { key: 'needs_comments', label: 'Observaciones', hint: 'Añadir un comentario libre en cada registro', icon: MessageSquare },
];

interface RegistrationConfig {
  needs_outcome: boolean;
  needs_pitch: boolean;
  needs_zones: boolean;
  needs_players: boolean;
  needs_player_selection: boolean;
  needs_comments: boolean;
}

function FocusRegistrationConfigModal({ focus, onClose, onSaved }: { focus: MatchFocus; onClose: () => void; onSaved: () => void }) {
  const details = getFocusDetails(focus);
  const [config, setConfig] = useState<RegistrationConfig>({
    needs_outcome: !!details.needs_outcome,
    needs_pitch: !!details.needs_pitch,
    needs_zones: !!details.needs_zones,
    needs_players: !!details.needs_players,
    needs_player_selection: !!details.needs_player_selection,
    needs_comments: !!details.needs_comments,
  });
  const [saving, setSaving] = useState(false);

  const anyActive = Object.values(config).some(Boolean);

  const save = async () => {
    setSaving(true);
    try {
      await updateMatchFocus(focus.id, { description: JSON.stringify({ ...details, ...config }) });
      onSaved();
    } catch (e) {
      console.error(e);
      alert('No se ha podido guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-start gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Cómo registrar</p>
            <h3 className="font-black text-gray-900 text-xl leading-tight">{focus.title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-2 max-h-[60vh] overflow-y-auto">
          {REGISTRATION_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const active = config[opt.key];
            return (
              <button
                key={opt.key}
                onClick={() => setConfig(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <span className={`p-2 rounded-xl ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}><Icon size={18} /></span>
                <span className="flex-1 min-w-0">
                  <span className={`block font-black text-sm ${active ? 'text-blue-900' : 'text-gray-700'}`}>{opt.label}</span>
                  <span className="block text-xs font-medium text-gray-500">{opt.hint}</span>
                </span>
                <span className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 ${active ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                  {active && <Check size={13} strokeWidth={4} />}
                </span>
              </button>
            );
          })}
          <p className="text-xs font-bold text-gray-400 pt-2">
            {anyActive
              ? 'Al pulsar este foco durante el partido se abrirá la ficha para completar estos datos.'
              : 'Sin opciones activas, cada pulsación registra el evento al instante en el minuto actual.'}
          </p>
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-md">
            <Check size={16} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
