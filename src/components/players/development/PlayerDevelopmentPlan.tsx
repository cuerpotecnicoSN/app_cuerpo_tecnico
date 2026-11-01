import { useEffect, useMemo, useState } from 'react';
import {
  Target, Crosshair, ListChecks, MessageSquareText, CalendarClock, Plus, Trash2, Save, X, Edit2,
  Video, User, Dumbbell, Heart, Trophy, Clock, CheckCircle2, ExternalLink,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { MeetingDB, PlayerObjective } from '../../types';
import { getPlayerObjectives, createPlayerObjective, updatePlayerObjective, deletePlayerObjective } from '../../../services/playerObjectives';
import { getMeetingsForPlayer } from '../../../services/meetings';
import {
  getFocuses, createFocus, updateFocus, deleteFocus,
  getVideoNotes, createVideoNote, deleteVideoNote, setVideoPlayerNotes,
  getSelfAssessments, createSelfAssessment, updateSelfAssessment, deleteSelfAssessment,
  type PlayerFocus, type VideoNote, type SelfAssessment, type FocusContext, type ObjectiveDimension,
} from '../../../services/playerDevelopment';
import { usePlayerSeasonStats } from '../../../hooks/usePlayerSeasonStats';

type Mode = 'staff' | 'player';

interface DbPlayer {
  id: string;
  first_name?: string;
  last_name?: string;
  football_name?: string;
  main_position?: string;
  category?: string;
  photo_url?: string;
  dorsal?: number;
  kit_number?: number;
  tutor_id?: string | null;
}

const DIMENSIONS: { id: ObjectiveDimension; label: string; icon: typeof Trophy; tone: string }[] = [
  { id: 'futbolistico', label: 'Futbolísticos', icon: Trophy, tone: 'text-blue-600 bg-blue-50 border-blue-100' },
  { id: 'fisico', label: 'Físicos', icon: Dumbbell, tone: 'text-orange-600 bg-orange-50 border-orange-100' },
  { id: 'personal', label: 'Personales', icon: Heart, tone: 'text-pink-600 bg-pink-50 border-pink-100' },
];

const CONTEXTS: { id: FocusContext; label: string }[] = [
  { id: 'partido', label: 'Partido' },
  { id: 'entreno', label: 'Entreno' },
  { id: 'fuera', label: 'Fuera del campo' },
];

const STATUS_STYLE: Record<PlayerObjective['status'], string> = {
  'En progreso': 'bg-amber-100 text-amber-700 border-amber-200',
  Cumplido: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'No cumplido': 'bg-red-100 text-red-700 border-red-200',
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#db0030]/20 focus:border-[#db0030]';
const btnPrimary = 'px-3 py-2 bg-[#db0030] hover:bg-[#b80028] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50';
const btnGhost = 'px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold flex items-center gap-1.5';

function Block({ n, title, subtitle, icon: Icon, children, action }: {
  n: number; title: string; subtitle: string; icon: typeof Target; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 shrink-0 rounded-xl bg-[#db0030]/10 text-[#db0030] flex items-center justify-center"><Icon size={18} /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bloque {n}</p>
            <h3 className="font-extrabold text-gray-900 leading-tight">{title} <span className="text-gray-400 font-semibold">· {subtitle}</span></h3>
          </div>
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-400 italic py-2">{children}</p>
);

// ----------------------------------------------------------------------------

type ObjectiveDraft = Pick<PlayerObjective, 'title' | 'description' | 'dimension' | 'success_criteria' | 'indicators' | 'tasks' | 'start_date' | 'target_date'>;
const emptyObjective = (dimension: ObjectiveDimension = 'futbolistico'): ObjectiveDraft => ({
  title: '', description: '', dimension, success_criteria: '', indicators: '', tasks: '', start_date: '', target_date: '',
});

function ObjectiveForm({ initial, onSave, onCancel }: { initial: ObjectiveDraft; onSave: (d: ObjectiveDraft) => Promise<void>; onCancel: () => void }) {
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof ObjectiveDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/60">
      <div className="grid sm:grid-cols-[1fr_180px] gap-3">
        <input className={input} placeholder="Objetivo" value={d.title} onChange={set('title')} autoFocus />
        <select className={input} value={d.dimension} onChange={set('dimension')}>
          {DIMENSIONS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
      </div>
      <textarea className={input} rows={2} placeholder="Descripción" value={d.description ?? ''} onChange={set('description')} />
      <div className="grid sm:grid-cols-2 gap-3">
        <textarea className={input} rows={2} placeholder="Criterios de éxito (¿cuándo está cumplido?)" value={d.success_criteria ?? ''} onChange={set('success_criteria')} />
        <textarea className={input} rows={2} placeholder="Indicadores clave (qué medimos)" value={d.indicators ?? ''} onChange={set('indicators')} />
      </div>
      <textarea className={input} rows={2} placeholder="Tareas a desarrollar (una por línea)" value={d.tasks ?? ''} onChange={set('tasks')} />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-bold text-gray-500">Inicio<input type="date" className={`${input} mt-1`} value={d.start_date ?? ''} onChange={set('start_date')} /></label>
        <label className="text-xs font-bold text-gray-500">Fecha objetivo<input type="date" className={`${input} mt-1`} value={d.target_date ?? ''} onChange={set('target_date')} /></label>
      </div>
      <div className="flex justify-end gap-2">
        <button className={btnGhost} onClick={onCancel}><X size={14} /> Cancelar</button>
        <button
          className={btnPrimary}
          disabled={!d.title.trim() || saving}
          onClick={async () => { setSaving(true); try { await onSave(d); } finally { setSaving(false); } }}
        >
          <Save size={14} /> Guardar
        </button>
      </div>
    </div>
  );
}

function Timeline({ start, end }: { start?: string | null; end?: string | null }) {
  if (!end) return null;
  const s = start ? new Date(`${start}T00:00:00`).getTime() : NaN;
  const e = new Date(`${end}T00:00:00`).getTime();
  const now = Date.now();
  const pct = Number.isFinite(s) && e > s ? Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100)) : null;
  const daysLeft = Math.ceil((e - now) / 86400000);
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
        <span>{fmtDate(start)}</span>
        <span className={daysLeft < 0 ? 'text-red-500' : daysLeft <= 14 ? 'text-amber-600' : ''}>
          {daysLeft < 0 ? `Vencido hace ${-daysLeft} d` : `${daysLeft} d restantes`}
        </span>
        <span>{fmtDate(end)}</span>
      </div>
      {pct !== null && (
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-[#db0030] rounded-full" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------

export default function PlayerDevelopmentPlan({ player, mode }: { player: DbPlayer; mode: Mode }) {
  const isStaff = mode === 'staff';
  const playerId = player.id;

  const [objectives, setObjectives] = useState<PlayerObjective[]>([]);
  const [focuses, setFocuses] = useState<PlayerFocus[]>([]);
  const [videos, setVideos] = useState<VideoNote[]>([]);
  const [assessments, setAssessments] = useState<SelfAssessment[]>([]);
  const [meetings, setMeetings] = useState<MeetingDB[]>([]);
  const [staff, setStaff] = useState<{ id: string; full_name: string | null }[]>([]);
  const [tutorId, setTutorId] = useState<string | null>(player.tutor_id ?? null);
  const [error, setError] = useState<string | null>(null);

  const [objForm, setObjForm] = useState<{ id?: string; draft: ObjectiveDraft } | null>(null);
  const [focusForm, setFocusForm] = useState<{ context: FocusContext; title: string; description: string } | null>(null);
  const [videoForm, setVideoForm] = useState<{ session_date: string; title: string; video_url: string; staff_notes: string } | null>(null);
  const [newAssessment, setNewAssessment] = useState('');
  const [editingAssessment, setEditingAssessment] = useState<{ id: string; content: string } | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const stats = usePlayerSeasonStats(player);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Error guardando'); }
  };

  const loadObjectives = () => getPlayerObjectives(playerId).then(setObjectives).catch(() => setObjectives([]));
  const loadFocuses = () => getFocuses(playerId).then(setFocuses).catch(() => setFocuses([]));
  const loadVideos = () => getVideoNotes(playerId).then(setVideos).catch(() => setVideos([]));
  const loadAssessments = () => getSelfAssessments(playerId).then(setAssessments).catch(() => setAssessments([]));

  useEffect(() => {
    loadObjectives(); loadFocuses(); loadVideos(); loadAssessments();
    getMeetingsForPlayer(playerId).then(setMeetings).catch(() => setMeetings([]));
    supabase.from('profiles').select('id, full_name, role').neq('role', 'Jugador').neq('role', 'Pendiente')
      .then(({ data }) => setStaff(data ?? []));
    setTutorId(player.tutor_id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const tutorName = staff.find((s) => s.id === tutorId)?.full_name;
  const name = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim();
  const dorsal = player.dorsal ?? (player.kit_number || undefined);

  const today = new Date().toISOString().slice(0, 10);
  const { nextCheckIn, pastMeetings } = useMemo(() => {
    const upcoming = meetings
      .flatMap((m) => [
        m.date >= today ? { date: m.date, time: m.time, label: m.objective || 'Reunión individual', location: m.location } : null,
        m.follow_up_date && m.follow_up_date >= today ? { date: m.follow_up_date, time: undefined, label: 'Seguimiento acordado', location: undefined } : null,
      ])
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      nextCheckIn: upcoming[0] ?? null,
      pastMeetings: meetings.filter((m) => m.date < today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    };
  }, [meetings, today]);

  const saveObjective = async (d: ObjectiveDraft) => {
    const payload = {
      ...d,
      start_date: d.start_date || null,
      target_date: d.target_date || undefined,
    };
    await run(async () => {
      if (objForm?.id) await updatePlayerObjective(objForm.id, payload as Partial<PlayerObjective>);
      else await createPlayerObjective({ player_id: playerId, status: 'En progreso', ...payload } as Parameters<typeof createPlayerObjective>[0]);
      setObjForm(null);
      await loadObjectives();
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex justify-between">
          {error}<button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}

      {/* ===================== HEADER ===================== */}
      <section className="relative overflow-hidden rounded-2xl bg-[#111114] text-white shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1d1d22] via-[#111114] to-[#3a0010]" />
        <div className="absolute right-0 top-0 h-full w-1.5 bg-[#db0030]" />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-stretch gap-5 p-5 sm:p-6">
          <div className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-2xl overflow-hidden bg-white/10 ring-2 ring-white/10 flex items-center justify-center">
            {player.photo_url ? <img src={player.photo_url} alt={name} className="w-full h-full object-cover" /> : <User size={40} className="text-white/40" />}
          </div>
          <div className="flex-1 min-w-0 text-center sm:text-left flex flex-col justify-center">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ff4d6d]">Plan individual de desarrollo</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">
              {dorsal ? <span className="text-white/40 mr-2">#{dorsal}</span> : null}{name || 'Jugador'}
            </h2>
            <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-white/10 font-bold">{player.main_position || 'Posición sin definir'}</span>
              {player.category && <span className="px-2.5 py-1 rounded-lg bg-white/10 font-bold">{player.category}</span>}
              <span className="px-2.5 py-1 rounded-lg bg-white/10 font-bold flex items-center gap-1.5">
                Tutor:
                {isStaff ? (
                  <select
                    className="bg-transparent font-bold outline-none cursor-pointer [&>option]:text-gray-900"
                    value={tutorId ?? ''}
                    onChange={(e) => run(async () => {
                      const v = e.target.value || null;
                      const { error: err } = await supabase.from('players').update({ tutor_id: v }).eq('id', playerId);
                      if (err) throw err;
                      setTutorId(v);
                    })}
                  >
                    <option value="">Sin asignar</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name || 'Sin nombre'}</option>)}
                  </select>
                ) : (
                  <span>{tutorName || 'Sin asignar'}</span>
                )}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-2 gap-2 shrink-0 w-full sm:w-auto">
            {[
              { l: 'Partidos', v: stats?.matches ?? 0 },
              { l: 'Minutos', v: stats ? `${stats.minutes}'` : "0'" },
              { l: 'Goles', v: stats?.total.goals ?? 0 },
              { l: 'Asist.', v: stats?.total.assists ?? 0 },
            ].map((k) => (
              <div key={k.l} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-center sm:min-w-[84px]">
                <p className="text-lg font-extrabold tabular-nums leading-none">{k.v}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/50 mt-1">{k.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== BLOQUE 1 ===================== */}
      <Block
        n={1} title="Objetivos & Focos" subtitle="El qué" icon={Target}
        action={isStaff && !objForm && <button className={btnPrimary} onClick={() => setObjForm({ draft: emptyObjective() })}><Plus size={14} /> Objetivo</button>}
      >
        {objForm && !objForm.id && <div className="mb-4"><ObjectiveForm initial={objForm.draft} onSave={saveObjective} onCancel={() => setObjForm(null)} /></div>}

        <div className="grid md:grid-cols-3 gap-3">
          {DIMENSIONS.map(({ id, label, icon: Icon, tone }) => {
            const list = objectives.filter((o) => (o.dimension ?? 'futbolistico') === id);
            return (
              <div key={id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-black uppercase tracking-wider mb-2 ${tone}`}>
                  <Icon size={13} /> {label}
                </div>
                {list.length === 0 ? <Empty>Sin objetivos</Empty> : (
                  <ul className="space-y-2">
                    {list.map((o) => (
                      <li key={o.id} className="bg-white rounded-lg border border-gray-100 p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-gray-800">{o.title}</p>
                          {isStaff ? (
                            <select
                              className={`text-[10px] font-bold rounded-md px-1.5 py-0.5 border shrink-0 ${STATUS_STYLE[o.status]}`}
                              value={o.status}
                              onChange={(e) => run(async () => { await updatePlayerObjective(o.id, { status: e.target.value as PlayerObjective['status'] }); await loadObjectives(); })}
                            >
                              <option>En progreso</option><option>Cumplido</option><option>No cumplido</option>
                            </select>
                          ) : (
                            <span className={`text-[10px] font-bold rounded-md px-1.5 py-0.5 border shrink-0 ${STATUS_STYLE[o.status]}`}>{o.status}</span>
                          )}
                        </div>
                        {o.description && <p className="text-xs text-gray-500 mt-1">{o.description}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Focos */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-extrabold text-gray-800 flex items-center gap-2"><Crosshair size={16} className="text-[#db0030]" /> Focos individuales</h4>
            {isStaff && !focusForm && <button className={btnGhost} onClick={() => setFocusForm({ context: 'partido', title: '', description: '' })}><Plus size={14} /> Foco</button>}
          </div>
          {focusForm && (
            <div className="border border-gray-200 rounded-xl p-3 mb-3 grid sm:grid-cols-[160px_1fr_auto] gap-2 bg-gray-50/60">
              <select className={input} value={focusForm.context} onChange={(e) => setFocusForm({ ...focusForm, context: e.target.value as FocusContext })}>
                {CONTEXTS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <input className={input} placeholder="Foco (p. ej. perfilarme antes de recibir)" value={focusForm.title} onChange={(e) => setFocusForm({ ...focusForm, title: e.target.value })} autoFocus />
              <div className="flex gap-2">
                <button className={btnGhost} onClick={() => setFocusForm(null)}><X size={14} /></button>
                <button className={btnPrimary} disabled={!focusForm.title.trim()} onClick={() => run(async () => {
                  await createFocus({ player_id: playerId, context: focusForm.context, title: focusForm.title.trim(), description: focusForm.description || null });
                  setFocusForm(null); await loadFocuses();
                })}><Save size={14} /></button>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-3">
            {CONTEXTS.map((c) => {
              const list = focuses.filter((f) => f.context === c.id && (isStaff || f.active));
              return (
                <div key={c.id} className="rounded-xl border border-gray-100 p-3">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2">{c.label}</p>
                  {list.length === 0 ? <Empty>—</Empty> : (
                    <ul className="space-y-1.5">
                      {list.map((f) => (
                        <li key={f.id} className={`flex items-start gap-2 text-sm ${f.active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#db0030] shrink-0" />
                          <span className="flex-1">{f.title}</span>
                          {isStaff && (
                            <span className="flex gap-1 shrink-0">
                              <button title={f.active ? 'Archivar' : 'Reactivar'} className="text-gray-300 hover:text-emerald-600" onClick={() => run(async () => { await updateFocus(f.id, { active: !f.active }); await loadFocuses(); })}><CheckCircle2 size={14} /></button>
                              <button title="Eliminar" className="text-gray-300 hover:text-red-500" onClick={() => run(async () => { await deleteFocus(f.id); await loadFocuses(); })}><Trash2 size={14} /></button>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Block>

      {/* ===================== BLOQUE 2 ===================== */}
      <Block n={2} title="Acción & Criterios" subtitle="El cómo y cuándo" icon={ListChecks}>
        {objectives.length === 0 ? <Empty>Cuando haya objetivos, aquí aparecerán sus criterios, indicadores, tareas y plazos.</Empty> : (
          <div className="space-y-3">
            {objectives.map((o) => objForm?.id === o.id ? (
              <ObjectiveForm key={o.id} initial={objForm.draft} onSave={saveObjective} onCancel={() => setObjForm(null)} />
            ) : (
              <article key={o.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{DIMENSIONS.find((d) => d.id === (o.dimension ?? 'futbolistico'))?.label}</p>
                    <h4 className="font-extrabold text-gray-900">{o.title}</h4>
                  </div>
                  {isStaff && (
                    <div className="flex gap-1 shrink-0">
                      <button className="p-1.5 text-gray-400 hover:text-blue-600" title="Editar" onClick={() => setObjForm({
                        id: o.id,
                        draft: { title: o.title, description: o.description ?? '', dimension: o.dimension ?? 'futbolistico', success_criteria: o.success_criteria ?? '', indicators: o.indicators ?? '', tasks: o.tasks ?? '', start_date: o.start_date ?? '', target_date: o.target_date ?? '' },
                      })}><Edit2 size={15} /></button>
                      <button className="p-1.5 text-gray-400 hover:text-red-500" title="Eliminar" onClick={() => { if (confirm('¿Eliminar este objetivo?')) run(async () => { await deletePlayerObjective(o.id); await loadObjectives(); }); }}><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
                <div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
                  <div><p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Criterios de éxito</p><p className="text-gray-700 whitespace-pre-line">{o.success_criteria || '—'}</p></div>
                  <div><p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Indicadores</p><p className="text-gray-700 whitespace-pre-line">{o.indicators || '—'}</p></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Tareas</p>
                    {o.tasks ? (
                      <ul className="space-y-0.5">{o.tasks.split('\n').filter(Boolean).map((t, i) => <li key={i} className="text-gray-700 flex gap-1.5"><span className="text-[#db0030]">›</span>{t}</li>)}</ul>
                    ) : <p className="text-gray-700">—</p>}
                  </div>
                </div>
                <Timeline start={o.start_date} end={o.target_date} />
              </article>
            ))}
          </div>
        )}
      </Block>

      {/* ===================== BLOQUE 3 ===================== */}
      <Block n={3} title="Feedback & Reflexión" subtitle="La voz del jugador" icon={MessageSquareText}>
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Video-sesiones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-extrabold text-gray-800 flex items-center gap-2"><Video size={16} className="text-[#db0030]" /> Video-sesiones</h4>
              {isStaff && !videoForm && <button className={btnGhost} onClick={() => setVideoForm({ session_date: today, title: '', video_url: '', staff_notes: '' })}><Plus size={14} /> Sesión</button>}
            </div>
            {videoForm && (
              <div className="border border-gray-200 rounded-xl p-3 mb-3 space-y-2 bg-gray-50/60">
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <input type="date" className={input} value={videoForm.session_date} onChange={(e) => setVideoForm({ ...videoForm, session_date: e.target.value })} />
                  <input className={input} placeholder="Título (p. ej. Duelos defensivos vs X)" value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} />
                </div>
                <input className={input} placeholder="Enlace al vídeo (opcional)" value={videoForm.video_url} onChange={(e) => setVideoForm({ ...videoForm, video_url: e.target.value })} />
                <textarea className={input} rows={3} placeholder="Anotaciones del staff" value={videoForm.staff_notes} onChange={(e) => setVideoForm({ ...videoForm, staff_notes: e.target.value })} />
                <div className="flex justify-end gap-2">
                  <button className={btnGhost} onClick={() => setVideoForm(null)}><X size={14} /> Cancelar</button>
                  <button className={btnPrimary} disabled={!videoForm.title.trim()} onClick={() => run(async () => {
                    await createVideoNote({ player_id: playerId, ...videoForm, video_url: videoForm.video_url || null });
                    setVideoForm(null); await loadVideos();
                  })}><Save size={14} /> Guardar</button>
                </div>
              </div>
            )}
            {videos.length === 0 ? <Empty>Aún no hay video-sesiones.</Empty> : (
              <ul className="space-y-3">
                {videos.map((v) => (
                  <li key={v.id} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{fmtDate(v.session_date)}</p>
                        <p className="font-bold text-gray-800 text-sm">{v.title}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {v.video_url && <a href={v.video_url} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-blue-600" title="Ver vídeo"><ExternalLink size={15} /></a>}
                        {isStaff && <button className="p-1.5 text-gray-400 hover:text-red-500" onClick={() => { if (confirm('¿Eliminar esta sesión?')) run(async () => { await deleteVideoNote(v.id); await loadVideos(); }); }}><Trash2 size={15} /></button>}
                      </div>
                    </div>
                    {v.staff_notes && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line"><span className="font-bold text-gray-800">Staff: </span>{v.staff_notes}</p>}
                    {isStaff ? (
                      v.player_notes && <p className="text-sm text-gray-600 mt-2 pl-3 border-l-2 border-[#db0030] whitespace-pre-line"><span className="font-bold text-gray-800">Jugador: </span>{v.player_notes}</p>
                    ) : (
                      <div className="mt-2 flex gap-2 items-start">
                        <textarea
                          className={input} rows={2} placeholder="Tus anotaciones sobre esta sesión…"
                          value={replyDrafts[v.id] ?? v.player_notes ?? ''}
                          onChange={(e) => setReplyDrafts({ ...replyDrafts, [v.id]: e.target.value })}
                        />
                        {replyDrafts[v.id] !== undefined && replyDrafts[v.id] !== (v.player_notes ?? '') && (
                          <button className={btnPrimary} onClick={() => run(async () => {
                            await setVideoPlayerNotes(v.id, replyDrafts[v.id]);
                            const { [v.id]: _omit, ...rest } = replyDrafts; void _omit; setReplyDrafts(rest);
                            await loadVideos();
                          })}><Save size={14} /></button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Autoevaluación */}
          <div>
            <h4 className="text-sm font-extrabold text-gray-800 flex items-center gap-2 mb-3"><MessageSquareText size={16} className="text-[#db0030]" /> Autoevaluación del jugador</h4>
            {!isStaff && (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-3 mb-3 focus-within:border-[#db0030]/40">
                <textarea
                  className="w-full text-sm outline-none resize-none bg-transparent" rows={4}
                  placeholder="¿Cómo te has visto estas semanas? ¿Qué te ha salido bien, qué te cuesta y qué necesitas del staff?"
                  value={newAssessment} onChange={(e) => setNewAssessment(e.target.value)}
                />
                <div className="flex justify-end">
                  <button className={btnPrimary} disabled={!newAssessment.trim()} onClick={() => run(async () => {
                    await createSelfAssessment(playerId, newAssessment.trim()); setNewAssessment(''); await loadAssessments();
                  })}><Save size={14} /> Publicar</button>
                </div>
              </div>
            )}
            {assessments.length === 0 ? <Empty>{isStaff ? 'El jugador todavía no ha escrito ninguna autoevaluación.' : 'Todavía no has escrito ninguna autoevaluación.'}</Empty> : (
              <ul className="space-y-3">
                {assessments.map((a) => (
                  <li key={a.id} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {fmtDate(a.created_at)}{a.updated_at && a.updated_at.slice(0, 16) !== a.created_at.slice(0, 16) ? ' · editada' : ''}
                      </p>
                      {!isStaff && editingAssessment?.id !== a.id && (
                        <div className="flex gap-1">
                          <button className="p-1 text-gray-400 hover:text-blue-600" onClick={() => setEditingAssessment({ id: a.id, content: a.content })}><Edit2 size={14} /></button>
                          <button className="p-1 text-gray-400 hover:text-red-500" onClick={() => { if (confirm('¿Eliminar esta autoevaluación?')) run(async () => { await deleteSelfAssessment(a.id); await loadAssessments(); }); }}><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                    {editingAssessment?.id === a.id ? (
                      <div className="space-y-2">
                        <textarea className={input} rows={4} value={editingAssessment.content} onChange={(e) => setEditingAssessment({ ...editingAssessment, content: e.target.value })} />
                        <div className="flex justify-end gap-2">
                          <button className={btnGhost} onClick={() => setEditingAssessment(null)}><X size={14} /></button>
                          <button className={btnPrimary} disabled={!editingAssessment.content.trim()} onClick={() => run(async () => {
                            await updateSelfAssessment(a.id, editingAssessment.content.trim()); setEditingAssessment(null); await loadAssessments();
                          })}><Save size={14} /> Guardar</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 whitespace-pre-line">{a.content}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Block>

      {/* ===================== FOOTER ===================== */}
      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 grid md:grid-cols-[minmax(0,280px)_1fr] gap-5">
        <div className="rounded-xl bg-[#db0030] text-white p-4 flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/70 flex items-center gap-1.5"><CalendarClock size={13} /> Próximo check-in</p>
          {nextCheckIn ? (
            <>
              <p className="text-2xl font-extrabold mt-1">{fmtDate(nextCheckIn.date)}</p>
              <p className="text-sm text-white/80">{[nextCheckIn.time, nextCheckIn.location].filter(Boolean).join(' · ') || nextCheckIn.label}</p>
              {(nextCheckIn.time || nextCheckIn.location) && <p className="text-xs text-white/70 mt-1">{nextCheckIn.label}</p>}
            </>
          ) : (
            <p className="text-sm mt-1 text-white/80">Sin fecha programada</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5"><Clock size={13} /> Calendario de reuniones</p>
          {pastMeetings.length === 0 ? <Empty>Sin reuniones registradas.</Empty> : (
            <ol className="flex flex-wrap gap-2">
              {pastMeetings.map((m) => (
                <li key={m.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 min-w-0 max-w-[220px]">
                  <p className="text-xs font-bold text-gray-800">{fmtDate(m.date)}</p>
                  <p className="text-[11px] text-gray-500 truncate">{m.objective || (m.type === 'grupal' ? 'Reunión grupal' : 'Reunión individual')}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
