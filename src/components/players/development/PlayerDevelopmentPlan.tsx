import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, CalendarClock, ChevronDown, CheckCircle2, ClipboardList, Dumbbell, Edit2, ExternalLink, FileText, Film, Goal, Heart, House,
  Link2, MessageSquareText, Plus, Save, Send, Trash2, Trophy, User, Video, X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';
import type { ClipComment, ClipContext, MeetingDB, ObjectiveComment, PlanComment, PlanLink, PlayerClip, PlayerObjective } from '../../types';
import {
  getPlayerObjectives, createPlayerObjective, updatePlayerObjective, deletePlayerObjective,
  getObjectiveComments, createObjectiveComment, deleteObjectiveComment,
} from '../../../services/playerObjectives';
import { useAuth } from '../../../context/AuthContext';
import MediaPreview, { parseMedia } from '../../common/MediaPreview';
import { getMeetingsForPlayer } from '../../../services/meetings';
import {
  getFocuses, createFocus, updateFocus, deleteFocus,
  getVideoNotes, createVideoNote, deleteVideoNote, setVideoPlayerNotes,
  getSelfAssessments, createSelfAssessment, updateSelfAssessment, deleteSelfAssessment,
  getClips, createClip, updateClip, deleteClip, getClipComments, createClipComment, deleteClipComment,
  type PlayerFocus, type VideoNote, type SelfAssessment, type FocusContext, type ObjectiveDimension,
} from '../../../services/playerDevelopment';
import { usePlayerSeasonStats } from '../../../hooks/usePlayerSeasonStats';
import { translatePosition } from '../../../utils/positionTranslations';

type Mode = 'staff' | 'player';
export type PlanSection = 'what' | 'how' | 'clips' | 'voice' | 'calendar';

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

const DIMENSIONS: { id: ObjectiveDimension; icon: typeof Trophy }[] = [
  { id: 'futbolistico', icon: Trophy },
  { id: 'fisico', icon: Dumbbell },
  { id: 'personal', icon: Heart },
];

const CONTEXTS: { id: FocusContext; icon: typeof Goal }[] = [
  { id: 'partido', icon: Goal },
  { id: 'entreno', icon: ClipboardList },
  { id: 'fuera', icon: House },
];

type ObjectiveStatus = PlayerObjective['status'];
const STATUSES: { id: ObjectiveStatus; key: string; pill: string; bar: string }[] = [
  { id: 'En progreso', key: 'inProgress', pill: 'bg-amber-100 text-amber-800', bar: 'bg-[#db0030]' },
  { id: 'Cumplido', key: 'done', pill: 'bg-emerald-100 text-emerald-800', bar: 'bg-emerald-600' },
  { id: 'No cumplido', key: 'missed', pill: 'bg-gray-200 text-gray-700', bar: 'bg-gray-400' },
];
const statusOf = (s: ObjectiveStatus) => STATUSES.find((x) => x.id === s) ?? STATUSES[0];

const LOCALES: Record<string, string> = { es: 'es-ES', it: 'it-IT', en: 'en-GB' };

const toTime = (d: string) => new Date(d.length === 10 ? `${d}T00:00:00` : d).getTime();
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** Los campos de las reuniones son HTML del editor enriquecido */
const plainText = (html?: string | null) =>
  html ? (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').trim() : '';

const display = 'font-[family-name:var(--font-display)]';
const label = 'text-xs font-semibold text-gray-500';
const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#db0030]/20 focus:border-[#db0030]';
const btnPrimary = 'px-3 py-2 bg-[#db0030] hover:bg-[#b80028] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#db0030]';
const btnGhost = 'px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#db0030]';

function Section({ title, subtitle, action, children }: { title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <header className="flex items-end justify-between gap-3 pb-3 mb-5 border-b-2 border-black">
        <div className="min-w-0">
          <h2 className={`${display} text-2xl sm:text-3xl font-black tracking-tight text-black leading-none`}>{title}</h2>
          <p className="text-sm text-gray-500 mt-1.5">{subtitle}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-400 py-2">{children}</p>
);

// ----------------------------------------------------------------------------
// Enlaces a vídeos / documentos

/** Solo http(s): evita enlaces javascript: o data: guardados por cualquiera */
const safeUrl = (raw: string) => {
  const v = raw.trim();
  if (!v) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch { return null; }
};
const isVideo = (url: string) => parseMedia(url).type === 'video';
const linkLabel = (l: PlanLink) => l.label?.trim() || (() => { try { return new URL(l.url).hostname.replace(/^www\./, ''); } catch { return l.url; } })();

function LinkChips({ links, onRemove }: { links?: PlanLink[] | null; onRemove?: (i: number) => void }) {
  const { t } = useTranslation();
  const valid = (links ?? []).map((l, i) => ({ ...l, i, href: safeUrl(l.url) })).filter((l) => l.href);
  if (!valid.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {valid.map((l) => {
        const Icon = isVideo(l.href!) ? Video : FileText;
        return (
          <li key={l.i} className="flex items-center gap-1 max-w-full rounded-md border border-gray-200 bg-white text-xs font-semibold text-gray-700">
            <a href={l.href!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 min-w-0 px-2 py-1 hover:text-[#db0030]">
              <Icon size={13} className="shrink-0 text-[#db0030]" /> <span className="truncate">{linkLabel(l)}</span> <ExternalLink size={11} className="shrink-0 text-gray-400" />
            </a>
            {onRemove && (
              <button type="button" className="pr-1.5 text-gray-400 hover:text-red-500" aria-label={t('playerPlan.links.remove')} onClick={() => onRemove(l.i)}><X size={12} /></button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Enlaces ya guardados: vídeos con miniatura y reproductor, documentos con visor, todo dentro de la app */
function LinkPreviews({ links, compact }: { links?: PlanLink[] | null; compact?: boolean }) {
  const valid = (links ?? []).map((l) => ({ ...l, href: safeUrl(l.url) })).filter((l): l is PlanLink & { href: string } => !!l.href);
  if (!valid.length) return null;
  return (
    <div className={compact ? 'space-y-2' : 'grid sm:grid-cols-2 gap-3'}>
      {valid.map((l, i) => <MediaPreview key={`${l.href}-${i}`} url={l.href} label={l.label} compact />)}
    </div>
  );
}

/** Añadir enlaces: URL + nombre opcional */
function LinkEditor({ links, onChange }: { links: PlanLink[]; onChange: (l: PlanLink[]) => void }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [labelText, setLabelText] = useState('');
  const href = safeUrl(url);
  const add = () => {
    if (!href) return;
    onChange([...links, { url: href, label: labelText.trim() || undefined }]);
    setUrl(''); setLabelText('');
  };
  return (
    <div className="space-y-2">
      <LinkChips links={links} onRemove={(i) => onChange(links.filter((_, j) => j !== i))} />
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className={`${input} sm:flex-[2]`} type="url" inputMode="url" placeholder={t('playerPlan.links.url')}
          value={url} onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <input
          className={`${input} sm:flex-1`} placeholder={t('playerPlan.links.label')}
          value={labelText} onChange={(e) => setLabelText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button type="button" className={btnGhost} disabled={!href} onClick={add}><Link2 size={14} /> {t('playerPlan.links.add')}</button>
      </div>
      {url.trim() && !href && <p className="text-xs text-red-600">{t('playerPlan.links.invalid')}</p>}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Conversación de un objetivo

function CommentThread({ comments, myId, playerName, onSend, onDelete }: {
  comments: PlanComment[];
  myId?: string;
  playerName: string;
  onSend: (content: string, links: PlanLink[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState('');
  const [links, setLinks] = useState<PlanLink[]>([]);
  const [showLinks, setShowLinks] = useState(false);
  const [sending, setSending] = useState(false);
  const locale = LOCALES[i18n.language?.slice(0, 2)] ?? LOCALES.es;
  const when = (d: string) => new Date(d).toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const send = async () => {
    if (!text.trim() && !links.length) return;
    setSending(true);
    try { await onSend(text.trim(), links); setText(''); setLinks([]); setShowLinks(false); } catch { /* el error ya se muestra arriba; se conserva el borrador */ } finally { setSending(false); }
  };

  return (
    <div className="mt-5 pt-4 border-t border-gray-200">
      <h4 className={`${label} mb-3 flex items-center gap-1.5`}><MessageSquareText size={14} className="text-[#db0030]" /> {t('playerPlan.thread.title')}</h4>
      {comments.length === 0 ? <Empty>{t('playerPlan.thread.empty')}</Empty> : (
        <ul className="space-y-2.5 mb-4">
          {comments.map((c) => {
            const fromPlayer = c.author?.role === 'Jugador';
            const mine = !!myId && c.author_id === myId;
            const who = mine ? t('playerPlan.thread.you') : fromPlayer ? (playerName || t('playerPlan.player')) : (c.author?.full_name || t('playerPlan.voice.staff'));
            return (
              <li key={c.id} className={`flex ${fromPlayer ? 'justify-end' : 'justify-start'}`}>
                <div className={`${c.links?.length ? 'w-full sm:w-[85%]' : 'max-w-[85%]'} rounded-xl px-3 py-2 ${fromPlayer ? 'bg-[#db0030]/[0.07] border border-[#db0030]/20' : 'bg-gray-100 border border-gray-200'}`}>
                  <p className="text-xs mb-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-black">{who}</span>
                    {!fromPlayer && c.author?.role && <span className="text-gray-500">· {c.author.role}</span>}
                    <span className="text-gray-400">· {when(c.created_at)}</span>
                    {mine && (
                      <button className="text-gray-400 hover:text-red-500" aria-label={t('playerPlan.delete')} onClick={() => { if (confirm(t('playerPlan.thread.confirmDelete'))) onDelete(c.id); }}><Trash2 size={12} /></button>
                    )}
                  </p>
                  {c.content && <p className="text-sm text-gray-800 whitespace-pre-line break-words">{c.content}</p>}
                  {c.links?.length > 0 && <div className="mt-2"><LinkPreviews links={c.links} compact /></div>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="rounded-xl border-2 border-gray-300 bg-white p-2.5 focus-within:border-[#db0030] space-y-2">
        <textarea
          className="w-full text-sm outline-none resize-none bg-transparent" rows={2}
          aria-label={t('playerPlan.thread.placeholder')} placeholder={t('playerPlan.thread.placeholder')}
          value={text} onChange={(e) => setText(e.target.value)}
        />
        {showLinks && <LinkEditor links={links} onChange={setLinks} />}
        <div className="flex justify-between gap-2">
          <button type="button" className={btnGhost} onClick={() => setShowLinks(!showLinks)} aria-expanded={showLinks}>
            <Link2 size={14} /> {t('playerPlan.links.attach')}{links.length ? ` (${links.length})` : ''}
          </button>
          <button className={btnPrimary} disabled={sending || (!text.trim() && !links.length)} onClick={send}><Send size={14} /> {t('playerPlan.thread.send')}</button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Mis vídeos: cortes de partidos / entrenos subidos por el jugador o el staff

const CLIP_CONTEXTS: { id: ClipContext; icon: typeof Goal }[] = [
  { id: 'partido', icon: Goal },
  { id: 'entreno', icon: ClipboardList },
  { id: 'otro', icon: Film },
];
type ClipDraft = { id?: string; context: ClipContext; title: string; url: string; clip_date: string; notes: string };

function ClipForm({ initial, onSave, onCancel }: { initial: ClipDraft; onSave: (d: ClipDraft) => Promise<void>; onCancel: () => void }) {
  const { t } = useTranslation();
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const href = safeUrl(d.url);
  const set = (k: keyof ClipDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/60">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('playerPlan.clips.type')}>
        {CLIP_CONTEXTS.map(({ id, icon: Icon }) => (
          <button
            key={id} type="button" role="radio" aria-checked={d.context === id}
            onClick={() => setD({ ...d, context: id })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${d.context === id ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            <Icon size={14} /> {t(`playerPlan.clips.contexts.${id}`)}
          </button>
        ))}
      </div>
      <input className={input} placeholder={t('playerPlan.clips.titlePlaceholder')} value={d.title} onChange={set('title')} autoFocus />
      <div className="grid sm:grid-cols-[1fr_170px] gap-3">
        <input className={input} type="url" inputMode="url" placeholder={t('playerPlan.clips.urlPlaceholder')} value={d.url} onChange={set('url')} />
        <input className={input} type="date" aria-label={t('playerPlan.clips.date')} value={d.clip_date} onChange={set('clip_date')} />
      </div>
      {d.url.trim() && !href && <p className="text-xs text-red-600">{t('playerPlan.links.invalid')}</p>}
      <textarea className={input} rows={2} placeholder={t('playerPlan.clips.notesPlaceholder')} value={d.notes} onChange={set('notes')} />
      <div className="flex justify-end gap-2">
        <button className={btnGhost} onClick={onCancel}><X size={14} /> {t('playerPlan.cancel')}</button>
        <button
          className={btnPrimary}
          disabled={!d.title.trim() || !href || saving}
          onClick={async () => { setSaving(true); try { await onSave({ ...d, url: href! }); } finally { setSaving(false); } }}
        >
          <Save size={14} /> {t('playerPlan.save')}
        </button>
      </div>
    </div>
  );
}

function ClipsSection({ playerId, isStaff, myId, playerName, run, fmtDate }: {
  playerId: string;
  isStaff: boolean;
  myId?: string;
  playerName: string;
  run: (fn: () => Promise<unknown>) => Promise<boolean>;
  fmtDate: (d?: string | null) => string;
}) {
  const { t } = useTranslation();
  const [clips, setClips] = useState<PlayerClip[]>([]);
  const [comments, setComments] = useState<ClipComment[]>([]);
  const [filter, setFilter] = useState<ClipContext | 'all'>('all');
  const [form, setForm] = useState<ClipDraft | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const loadComments = (cs: PlayerClip[]) => getClipComments(cs.map((c) => c.id)).then(setComments).catch(() => setComments([]));
  const load = () => getClips(playerId).then((cs) => { setClips(cs); return loadComments(cs); }).catch(() => setClips([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [playerId]);

  const save = async (d: ClipDraft) => {
    const payload = { context: d.context, title: d.title.trim(), url: d.url, clip_date: d.clip_date || null, notes: d.notes.trim() || null };
    const ok = await run(async () => {
      if (d.id) await updateClip(d.id, payload);
      else await createClip({ player_id: playerId, ...payload });
      await load();
    });
    if (ok) setForm(null);
  };

  const canEdit = (c: PlayerClip) => isStaff || c.author_id === myId;
  const authorName = (c: PlayerClip) =>
    c.author_id === myId ? t('playerPlan.thread.you')
      : c.author?.role === 'Jugador' ? (playerName || t('playerPlan.player'))
        : [c.author?.full_name || t('playerPlan.voice.staff'), c.author?.role].filter(Boolean).join(' · ');
  const list = clips.filter((c) => filter === 'all' || c.context === filter);
  const count = (id: ClipContext) => clips.filter((c) => c.context === id).length;

  return (
    <Section
      title={t(isStaff ? 'playerPlan.clips.titleStaff' : 'playerPlan.clips.title')}
      subtitle={t('playerPlan.clips.subtitle')}
      action={!form && <button className={btnPrimary} onClick={() => setForm({ context: 'partido', title: '', url: '', clip_date: localToday(), notes: '' })}><Plus size={14} /> {t('playerPlan.clips.add')}</button>}
    >
      {form && !form.id && <div className="mb-5"><ClipForm initial={form} onSave={save} onCancel={() => setForm(null)} /></div>}

      {clips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(['all', ...CLIP_CONTEXTS.map((c) => c.id)] as const).map((id) => (
            <button
              key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${filter === id ? 'bg-[#db0030] text-white border-[#db0030]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              {id === 'all' ? `${t('playerPlan.clips.all')} (${clips.length})` : `${t(`playerPlan.clips.contexts.${id}`)} (${count(id)})`}
            </button>
          ))}
        </div>
      )}

      {list.length === 0 ? <Empty>{t(isStaff ? 'playerPlan.clips.emptyStaff' : 'playerPlan.clips.empty')}</Empty> : (
        <ul className="divide-y divide-gray-200 border-y border-gray-200">
          {list.map((c) => {
            if (form?.id === c.id) return <li key={c.id} className="py-3"><ClipForm initial={form} onSave={save} onCancel={() => setForm(null)} /></li>;
            const Icon = CLIP_CONTEXTS.find((x) => x.id === c.context)?.icon ?? Film;
            const href = safeUrl(c.url);
            const msgs = comments.filter((m) => m.clip_id === c.id);
            const open = openId === c.id;
            return (
              <li key={c.id} className="py-3">
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 w-9 h-9 rounded-lg bg-[#db0030]/10 text-[#db0030] flex items-center justify-center"><Icon size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 break-words">{c.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t(`playerPlan.clips.contexts.${c.context}`)} · {fmtDate(c.clip_date ?? c.created_at)} · {t('playerPlan.clips.uploadedBy', { name: authorName(c) })}
                    </p>
                    {c.notes && <p className="text-sm text-gray-700 mt-1.5 whitespace-pre-line">{c.notes}</p>}
                    {href && <div className="mt-3"><MediaPreview url={href} label={c.title} /></div>}
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      <button className={btnGhost} aria-expanded={open} onClick={() => setOpenId(open ? null : c.id)}>
                        <MessageSquareText size={14} /> {t('playerPlan.clips.comments')}{msgs.length ? ` (${msgs.length})` : ''}
                      </button>
                      {canEdit(c) && (
                        <>
                          <button className={btnGhost} aria-label={t('playerPlan.edit')} onClick={() => setForm({ id: c.id, context: c.context, title: c.title, url: c.url, clip_date: c.clip_date ?? '', notes: c.notes ?? '' })}><Edit2 size={14} /></button>
                          <button className={btnGhost} aria-label={t('playerPlan.delete')} onClick={() => { if (confirm(t('playerPlan.clips.confirmDelete'))) run(async () => { await deleteClip(c.id); await load(); }); }}><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                    {open && (
                      <CommentThread
                        comments={msgs}
                        myId={myId}
                        playerName={playerName}
                        onSend={async (content, links) => {
                          const ok = await run(async () => { await createClipComment(c.id, content, links); await loadComments(clips); });
                          if (!ok) throw new Error('send failed');
                        }}
                        onDelete={async (id) => { await run(async () => { await deleteClipComment(id); await loadComments(clips); }); }}
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

// ----------------------------------------------------------------------------

type ObjectiveDraft = Pick<PlayerObjective, 'title' | 'description' | 'dimension' | 'success_criteria' | 'indicators' | 'tasks' | 'start_date' | 'target_date'> & { links: PlanLink[] };
const emptyObjective = (dimension: ObjectiveDimension = 'futbolistico'): ObjectiveDraft => ({
  title: '', description: '', dimension, success_criteria: '', indicators: '', tasks: '', start_date: '', target_date: '', links: [],
});

function ObjectiveForm({ initial, onSave, onCancel }: { initial: ObjectiveDraft; onSave: (d: ObjectiveDraft) => Promise<void>; onCancel: () => void }) {
  const { t } = useTranslation();
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof ObjectiveDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/60">
      <div className="grid sm:grid-cols-[1fr_180px] gap-3">
        <input className={input} placeholder={t('playerPlan.form.title')} value={d.title} onChange={set('title')} autoFocus />
        <select className={input} value={d.dimension} onChange={set('dimension')}>
          {DIMENSIONS.map((x) => <option key={x.id} value={x.id}>{t(`playerPlan.dimensions.${x.id}`)}</option>)}
        </select>
      </div>
      <textarea className={input} rows={2} placeholder={t('playerPlan.form.description')} value={d.description ?? ''} onChange={set('description')} />
      <div className="grid sm:grid-cols-2 gap-3">
        <textarea className={input} rows={2} placeholder={t('playerPlan.form.criteria')} value={d.success_criteria ?? ''} onChange={set('success_criteria')} />
        <textarea className={input} rows={2} placeholder={t('playerPlan.form.indicators')} value={d.indicators ?? ''} onChange={set('indicators')} />
      </div>
      <textarea className={input} rows={2} placeholder={t('playerPlan.form.tasks')} value={d.tasks ?? ''} onChange={set('tasks')} />
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>{t('playerPlan.form.start')}<input type="date" className={`${input} mt-1`} value={d.start_date ?? ''} onChange={set('start_date')} /></label>
        <label className={label}>{t('playerPlan.form.target')}<input type="date" className={`${input} mt-1`} value={d.target_date ?? ''} onChange={set('target_date')} /></label>
      </div>
      <div>
        <p className={`${label} mb-1`}>{t('playerPlan.links.title')}</p>
        <LinkEditor links={d.links} onChange={(links) => setD({ ...d, links })} />
      </div>
      <div className="flex justify-end gap-2">
        <button className={btnGhost} onClick={onCancel}><X size={14} /> {t('playerPlan.cancel')}</button>
        <button
          className={btnPrimary}
          disabled={!d.title.trim() || saving}
          onClick={async () => { setSaving(true); try { await onSave(d); } finally { setSaving(false); } }}
        >
          <Save size={14} /> {t('playerPlan.save')}
        </button>
      </div>
    </div>
  );
}

/** Barra del objetivo sobre un eje común, para ver de un vistazo qué se solapa y qué vence antes */
function TimelineBar({ objective, axis, nowPct }: { objective: PlayerObjective; axis: { min: number; max: number }; nowPct: number | null }) {
  const end = objective.target_date ? toTime(objective.target_date) : null;
  const start = objective.start_date ? toTime(objective.start_date) : end;
  const pos = (ms: number) => (axis.max > axis.min ? ((ms - axis.min) / (axis.max - axis.min)) * 100 : 100);
  return (
    <div className="relative h-5 rounded bg-gray-100">
      {start !== null && end !== null && (
        <div
          className={`absolute inset-y-1 rounded-sm min-w-1.5 ${statusOf(objective.status).bar}`}
          style={{ left: `${Math.min(pos(start), 98.5)}%`, width: `${Math.max(pos(end) - pos(start), 0)}%` }}
        />
      )}
      {nowPct !== null && <div className="absolute -inset-y-0.5 w-0.5 bg-black" style={{ left: `${nowPct}%` }} />}
    </div>
  );
}

// ----------------------------------------------------------------------------

/**
 * Plan individual de desarrollo. Sin `section` pinta todo (vista del staff);
 * con `section` solo ese bloque (el portal del jugador lo reparte en pestañas).
 */
export default function PlayerDevelopmentPlan({ player, mode, section, onViewStats }: {
  player: DbPlayer;
  mode: Mode;
  section?: PlanSection;
  onViewStats?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isStaff = mode === 'staff';
  const { user } = useAuth();
  const playerId = player.id;
  const show = (s: PlanSection) => !section || section === s;

  const locale = LOCALES[i18n.language?.slice(0, 2)] ?? LOCALES.es;
  const fmtDate = (d?: string | null) =>
    d ? new Date(toTime(d)).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const [objectives, setObjectives] = useState<PlayerObjective[]>([]);
  const [comments, setComments] = useState<ObjectiveComment[]>([]);
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
  /** undefined: aún sin tocar (se abre el primer objetivo en curso); null: todos cerrados */
  const [openObjective, setOpenObjective] = useState<string | null | undefined>(undefined);

  const stats = usePlayerSeasonStats(player);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try { await fn(); return true; } catch (e) { setError(e instanceof Error ? e.message : t('playerPlan.saveError')); return false; }
  };

  const loadComments = (objs: PlayerObjective[]) =>
    getObjectiveComments(objs.map((o) => o.id)).then(setComments).catch(() => setComments([]));
  const loadObjectives = () => getPlayerObjectives(playerId)
    .then((objs) => { setObjectives(objs); return loadComments(objs); })
    .catch(() => setObjectives([]));
  /** El staff edita todo; el jugador solo lo que propuso él */
  const canEdit = (o: PlayerObjective) => isStaff || !!o.created_by_player;
  const commentsOf = (id: string) => comments.filter((c) => c.objective_id === id);
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
  const today = localToday();

  const { nextCheckIn, agenda } = useMemo(() => {
    const upcoming = meetings
      .flatMap((m) => [
        m.date >= today ? { date: m.date, time: m.time, label: plainText(m.objective) || t('playerPlan.meetingIndividual'), location: m.location } : null,
        m.follow_up_date && m.follow_up_date >= today ? { date: m.follow_up_date, time: undefined, label: t('playerPlan.followUp'), location: undefined } : null,
      ])
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => a.date.localeCompare(b.date));
    const past = meetings
      .filter((m) => m.date < today)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6)
      .map((m) => ({
        id: m.id,
        date: m.date,
        label: plainText(m.objective) || t(m.type === 'grupal' ? 'playerPlan.meetingGroup' : 'playerPlan.meetingIndividual'),
        upcoming: false,
      }));
    return {
      nextCheckIn: upcoming[0] ?? null,
      agenda: [...upcoming.slice(1).reverse().map((u, i) => ({ id: `next-${i}`, date: u.date, label: u.label, upcoming: true })), ...past],
    };
  }, [meetings, today, t]);

  const axis = useMemo(() => {
    const times = objectives.flatMap((o) => (o.target_date ? [toTime(o.target_date), ...(o.start_date ? [toTime(o.start_date)] : [])] : []));
    return times.length ? { min: Math.min(...times), max: Math.max(...times) } : null;
  }, [objectives]);
  const nowPct = useMemo(() => {
    if (!axis || axis.max <= axis.min) return null;
    const pct = ((toTime(today) - axis.min) / (axis.max - axis.min)) * 100;
    return pct >= 0 && pct <= 100 ? pct : null;
  }, [axis, today]);

  const doneCount = objectives.filter((o) => o.status === 'Cumplido').length;
  const expandedId = openObjective === undefined ? objectives.find((o) => o.status === 'En progreso')?.id ?? objectives[0]?.id : openObjective;

  const saveObjective = async (d: ObjectiveDraft) => {
    const payload = {
      ...d,
      start_date: d.start_date || null,
      target_date: d.target_date || undefined,
    };
    await run(async () => {
      if (objForm?.id) await updatePlayerObjective(objForm.id, payload as Partial<PlayerObjective>);
      else await createPlayerObjective({ player_id: playerId, status: 'En progreso', created_by_player: !isStaff, ...payload } as Parameters<typeof createPlayerObjective>[0]);
      setObjForm(null);
      await loadObjectives();
    });
  };

  const daysLabel = (o: PlayerObjective) => {
    if (!o.target_date) return { text: t('playerPlan.noDeadline'), tone: 'text-gray-400' };
    const days = Math.ceil((toTime(o.target_date) - toTime(today)) / 86400000);
    if (o.status !== 'En progreso') return { text: fmtDate(o.target_date), tone: 'text-gray-500' };
    if (days < 0) return { text: t('playerPlan.overdue', { count: -days }), tone: 'text-[#db0030]' };
    return { text: t('playerPlan.daysLeft', { count: days }), tone: days <= 14 ? 'text-amber-700' : 'text-gray-500' };
  };

  const heroStats = stats?.role === 'P'
    ? [
        { l: t('playerStats.metrics.saves'), v: stats.total.saves ?? 0 },
        { l: t('playerStats.metrics.conceded'), v: stats.total.conceded ?? 0 },
      ]
    : [
        { l: t('playerPlan.goals'), v: stats?.total.goals ?? 0 },
        { l: t('playerPlan.assists'), v: stats?.total.assists ?? 0 },
      ];

  return (
    <div className="space-y-10 animate-fade-in">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex justify-between">
          {error}<button onClick={() => setError(null)} aria-label={t('playerPlan.cancel')}><X size={16} /></button>
        </div>
      )}

      {/* ===================== CABECERA ===================== */}
      {show('what') && (
        <section className="relative overflow-hidden rounded-[28px] bg-black text-white">
          {/* Las franjas rossoneras y el dorsal son la identidad de la ficha */}
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 w-2/3"
            style={{
              background: 'repeating-linear-gradient(90deg, #db0030 0 46px, #000 46px 92px)',
              maskImage: 'linear-gradient(to left, rgba(0,0,0,.95), transparent)',
              WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,.95), transparent)',
            }}
          />
          {dorsal ? (
            <span
              aria-hidden
              className={`${display} absolute right-4 sm:right-8 -top-2 sm:-top-4 text-[5.5rem] sm:text-[12rem] font-black leading-none text-transparent`}
              style={{ WebkitTextStroke: '2px rgba(255,255,255,.8)' }}
            >
              {dorsal}
            </span>
          ) : null}

          <div className="relative p-5 sm:p-8">
            <div className="flex items-center sm:items-end gap-4 sm:gap-6">
              <div className="w-24 h-28 sm:w-36 sm:h-44 shrink-0 rounded-2xl overflow-hidden bg-white/10 flex items-center justify-center">
                {player.photo_url ? <img src={player.photo_url} alt={name} className="w-full h-full object-cover" /> : <User size={40} className="text-white/40" />}
              </div>
              <div className="min-w-0 pr-10 sm:pr-48">
                <p className="hidden sm:block text-sm font-medium text-white/70">{t('playerPlan.badge')}</p>
                <h1 className={`${display} text-3xl sm:text-5xl font-black tracking-tight leading-[1.02] break-words`}>{name || t('playerPlan.player')}</h1>
                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <div className="font-semibold">{player.main_position ? translatePosition(player.main_position, i18n.language) : t('playerPlan.noPosition')}</div>
                  {player.category && <div className="font-semibold">{player.category}</div>}
                  <div className="flex items-center gap-1.5">
                    <dt className="text-white/70">{t('playerPlan.tutor')}</dt>
                    <dd className="font-semibold">
                      {isStaff ? (
                        <select
                          aria-label={t('playerPlan.tutor')}
                          className="!w-auto !p-0 !border-0 !bg-transparent !text-white font-semibold outline-none cursor-pointer [&>option]:text-gray-900 focus-visible:underline"
                          value={tutorId ?? ''}
                          onChange={(e) => run(async () => {
                            const v = e.target.value || null;
                            const { error: err } = await supabase.from('players').update({ tutor_id: v }).eq('id', playerId);
                            if (err) throw err;
                            setTutorId(v);
                          })}
                        >
                          <option value="">{t('playerPlan.unassigned')}</option>
                          {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name || t('playerPlan.unnamed')}</option>)}
                        </select>
                      ) : (tutorName || t('playerPlan.unassigned'))}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/25 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
              <dl className="flex flex-wrap gap-x-8 sm:gap-x-12 gap-y-3">
                {[
                  { l: t('playerPlan.matches'), v: stats?.matches ?? 0 },
                  { l: t('playerPlan.minutes'), v: `${stats?.minutes ?? 0}'` },
                  ...heroStats,
                ].map((k) => (
                  <div key={k.l}>
                    <dd className={`${display} text-3xl font-black tabular-nums leading-none`}>{k.v}</dd>
                    <dt className="text-xs text-white/70 mt-1">{k.l}</dt>
                  </div>
                ))}
              </dl>
              {onViewStats && (
                <button
                  onClick={onViewStats}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {t('playerPlan.viewStats')} <ArrowUpRight size={14} />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===================== EL QUÉ ===================== */}
      {show('what') && (
        <Section
          title={t('playerPlan.what.title')}
          subtitle={objectives.length ? t('playerPlan.what.progress', { done: doneCount, total: objectives.length }) : t('playerPlan.what.subtitle')}
          action={!objForm && <button className={btnPrimary} onClick={() => setObjForm({ draft: emptyObjective() })}><Plus size={14} /> {t('playerPlan.addObjective')}</button>}
        >
          {objForm && !objForm.id && <div className="mb-5"><ObjectiveForm initial={objForm.draft} onSave={saveObjective} onCancel={() => setObjForm(null)} /></div>}

          <div className="grid md:grid-cols-3 md:divide-x divide-gray-200 gap-y-6">
            {DIMENSIONS.map(({ id, icon: Icon }) => {
              const list = objectives.filter((o) => (o.dimension ?? 'futbolistico') === id);
              return (
                <div key={id} className="md:px-5 md:first:pl-0 md:last:pr-0">
                  <h3 className="flex items-center gap-2 font-bold text-black mb-2"><Icon size={16} className="text-[#db0030]" /> {t(`playerPlan.dimensions.${id}`)}</h3>
                  {list.length === 0 ? <Empty>{t('playerPlan.what.noObjectives')}</Empty> : (
                    <ul className="divide-y divide-gray-200">
                      {list.map((o) => {
                        const st = statusOf(o.status);
                        return (
                          <li key={o.id} className="py-3">
                            <p className="text-[15px] font-semibold text-gray-900 leading-snug">{o.title}</p>
                            {o.description && <p className="text-sm text-gray-500 mt-0.5">{o.description}</p>}
                            {(o.created_by_player || commentsOf(o.id).length > 0) && (
                              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                {o.created_by_player && <span className="inline-flex items-center gap-1 font-semibold text-[#db0030]"><User size={12} /> {t(isStaff ? 'playerPlan.proposedByPlayer' : 'playerPlan.proposedByYou')}</span>}
                                {commentsOf(o.id).length > 0 && <span className="inline-flex items-center gap-1"><MessageSquareText size={12} /> {commentsOf(o.id).length}</span>}
                              </p>
                            )}
                            {canEdit(o) ? (
                              <select
                                aria-label={o.title}
                                className={`mt-2 text-xs font-semibold rounded-md px-1.5 py-1 ${st.pill}`}
                                value={o.status}
                                onChange={(e) => run(async () => { await updatePlayerObjective(o.id, { status: e.target.value as ObjectiveStatus }); await loadObjectives(); })}
                              >
                                {STATUSES.map((s) => <option key={s.id} value={s.id}>{t(`playerPlan.status.${s.key}`)}</option>)}
                              </select>
                            ) : (
                              <span className={`mt-2 inline-block text-xs font-semibold rounded-md px-2 py-0.5 ${st.pill}`}>{t(`playerPlan.status.${st.key}`)}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-2xl bg-gray-100 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className={`${display} text-lg font-black text-black`}>{t('playerPlan.what.focuses')}</h3>
              {isStaff && !focusForm && <button className={btnGhost} onClick={() => setFocusForm({ context: 'partido', title: '', description: '' })}><Plus size={14} /> {t('playerPlan.addFocus')}</button>}
            </div>
            {focusForm && (
              <div className="grid sm:grid-cols-[160px_1fr_auto] gap-2 mb-4">
                <select className={input} value={focusForm.context} onChange={(e) => setFocusForm({ ...focusForm, context: e.target.value as FocusContext })}>
                  {CONTEXTS.map((c) => <option key={c.id} value={c.id}>{t(`playerPlan.contexts.${c.id}`)}</option>)}
                </select>
                <input className={input} placeholder={t('playerPlan.form.focus')} value={focusForm.title} onChange={(e) => setFocusForm({ ...focusForm, title: e.target.value })} autoFocus />
                <div className="flex gap-2">
                  <button className={btnGhost} aria-label={t('playerPlan.cancel')} onClick={() => setFocusForm(null)}><X size={14} /></button>
                  <button className={btnPrimary} aria-label={t('playerPlan.save')} disabled={!focusForm.title.trim()} onClick={() => run(async () => {
                    await createFocus({ player_id: playerId, context: focusForm.context, title: focusForm.title.trim(), description: focusForm.description || null });
                    setFocusForm(null); await loadFocuses();
                  })}><Save size={14} /></button>
                </div>
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-5">
              {CONTEXTS.map(({ id, icon: Icon }) => {
                const list = focuses.filter((f) => f.context === id && (isStaff || f.active));
                return (
                  <div key={id}>
                    <p className="flex items-center gap-1.5 text-sm font-bold text-gray-700 mb-2"><Icon size={15} /> {t(`playerPlan.contexts.${id}`)}</p>
                    {list.length === 0 ? <Empty>{t('playerPlan.what.noFocus')}</Empty> : (
                      <ul className="space-y-2">
                        {list.map((f) => (
                          <li key={f.id} className={`flex items-start gap-2 text-sm ${f.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#db0030] shrink-0" />
                            <span className="flex-1">{f.title}</span>
                            {isStaff && (
                              <span className="flex gap-1 shrink-0">
                                <button title={t(f.active ? 'playerPlan.archive' : 'playerPlan.reactivate')} className="text-gray-400 hover:text-emerald-600" onClick={() => run(async () => { await updateFocus(f.id, { active: !f.active }); await loadFocuses(); })}><CheckCircle2 size={14} /></button>
                                <button title={t('playerPlan.delete')} className="text-gray-400 hover:text-red-500" onClick={() => run(async () => { await deleteFocus(f.id); await loadFocuses(); })}><Trash2 size={14} /></button>
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
        </Section>
      )}

      {/* ===================== EL CÓMO Y CUÁNDO ===================== */}
      {show('how') && (
        <Section title={t('playerPlan.how.title')} subtitle={t('playerPlan.how.subtitle')}>
          {objectives.length === 0 ? <Empty>{t('playerPlan.how.empty')}</Empty> : (
            <>
              {axis && (
                <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_20px] gap-4 mb-1 text-xs text-gray-500">
                  <span />
                  <span className="flex justify-between">
                    <span>{fmtDate(new Date(axis.min).toISOString())}</span>
                    {nowPct !== null && <span className="font-bold text-black">{t('playerPlan.how.today')}</span>}
                    <span>{fmtDate(new Date(axis.max).toISOString())}</span>
                  </span>
                </div>
              )}
              <ul className="divide-y divide-gray-200 border-y border-gray-200">
                {objectives.map((o) => {
                  if (objForm?.id === o.id) {
                    return <li key={o.id} className="py-3"><ObjectiveForm initial={objForm.draft} onSave={saveObjective} onCancel={() => setObjForm(null)} /></li>;
                  }
                  const open = expandedId === o.id;
                  const days = daysLabel(o);
                  const tasks = o.tasks?.split('\n').filter(Boolean) ?? [];
                  return (
                    <li key={o.id}>
                      <button
                        className="w-full grid grid-cols-[minmax(0,1fr)_20px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_20px] items-center gap-x-4 gap-y-2 py-3 text-left hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-[#db0030]"
                        aria-expanded={open}
                        onClick={() => setOpenObjective(open ? null : o.id)}
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold text-gray-900 truncate">{o.title}</span>
                          <span className="block text-xs text-gray-500">{t(`playerPlan.dimensions.${o.dimension ?? 'futbolistico'}`)}</span>
                        </span>
                        <span className="row-start-2 col-span-2 sm:row-start-auto sm:col-span-1">
                          {axis && o.target_date ? <TimelineBar objective={o} axis={axis} nowPct={nowPct} /> : <span className="block h-5" />}
                        </span>
                        <span className={`hidden sm:block text-xs font-semibold text-right ${days.tone}`}>{days.text}</span>
                        <ChevronDown size={18} className={`col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto text-gray-400 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {open && (
                        <div className="pb-5 pt-1">
                          <p className={`sm:hidden text-xs font-semibold mb-3 ${days.tone}`}>{days.text}</p>
                          <div className="grid sm:grid-cols-3 gap-5 text-sm">
                            <div><h4 className={`${label} mb-1`}>{t('playerPlan.how.criteria')}</h4><p className="text-gray-800 whitespace-pre-line">{o.success_criteria || '—'}</p></div>
                            <div><h4 className={`${label} mb-1`}>{t('playerPlan.how.indicators')}</h4><p className="text-gray-800 whitespace-pre-line">{o.indicators || '—'}</p></div>
                            <div>
                              <h4 className={`${label} mb-1`}>{t('playerPlan.how.tasks')}</h4>
                              {tasks.length ? (
                                <ul className="space-y-1">{tasks.map((task, i) => <li key={i} className="text-gray-800 flex gap-1.5"><span className="text-[#db0030]">›</span>{task}</li>)}</ul>
                              ) : <p className="text-gray-800">—</p>}
                            </div>
                          </div>
                          {(o.links?.length ?? 0) > 0 && (
                            <div className="mt-4">
                              <h4 className={`${label} mb-1.5`}>{t('playerPlan.links.title')}</h4>
                              <LinkPreviews links={o.links} />
                            </div>
                          )}
                          {o.created_by_player && <p className="mt-3 text-xs font-semibold text-[#db0030] flex items-center gap-1"><User size={12} /> {t(isStaff ? 'playerPlan.proposedByPlayer' : 'playerPlan.proposedByYou')}</p>}
                          {canEdit(o) && (
                            <div className="flex gap-2 mt-4">
                              <button className={btnGhost} onClick={() => setObjForm({
                                id: o.id,
                                draft: { title: o.title, description: o.description ?? '', dimension: o.dimension ?? 'futbolistico', success_criteria: o.success_criteria ?? '', indicators: o.indicators ?? '', tasks: o.tasks ?? '', start_date: o.start_date ?? '', target_date: o.target_date ?? '', links: o.links ?? [] },
                              })}><Edit2 size={14} /> {t('playerPlan.edit')}</button>
                              <button className={btnGhost} onClick={() => { if (confirm(t('playerPlan.confirmDeleteObjective'))) run(async () => { await deletePlayerObjective(o.id); await loadObjectives(); }); }}><Trash2 size={14} /> {t('playerPlan.delete')}</button>
                            </div>
                          )}
                          <CommentThread
                            comments={commentsOf(o.id)}
                            myId={user?.id}
                            playerName={name}
                            onSend={async (content, links) => {
                              const ok = await run(async () => { await createObjectiveComment(o.id, content, links); await loadComments(objectives); });
                              if (!ok) throw new Error('send failed');
                            }}
                            onDelete={async (id) => { await run(async () => { await deleteObjectiveComment(id); await loadComments(objectives); }); }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Section>
      )}

      {/* ===================== LA VOZ DEL JUGADOR ===================== */}
      {show('clips') && (
        <ClipsSection playerId={playerId} isStaff={isStaff} myId={user?.id} playerName={name} run={run} fmtDate={fmtDate} />
      )}

      {show('voice') && (
        <Section title={t('playerPlan.voice.title')} subtitle={t('playerPlan.voice.subtitle')}>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="font-bold text-black flex items-center gap-2"><Video size={16} className="text-[#db0030]" /> {t('playerPlan.voice.videoSessions')}</h3>
                {isStaff && !videoForm && <button className={btnGhost} onClick={() => setVideoForm({ session_date: today, title: '', video_url: '', staff_notes: '' })}><Plus size={14} /> {t('playerPlan.addSession')}</button>}
              </div>
              {videoForm && (
                <div className="border border-gray-200 rounded-xl p-3 mb-3 space-y-2 bg-gray-50/60">
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <input type="date" className={input} value={videoForm.session_date} onChange={(e) => setVideoForm({ ...videoForm, session_date: e.target.value })} />
                    <input className={input} placeholder={t('playerPlan.form.sessionTitle')} value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} />
                  </div>
                  <input className={input} placeholder={t('playerPlan.form.videoUrl')} value={videoForm.video_url} onChange={(e) => setVideoForm({ ...videoForm, video_url: e.target.value })} />
                  <textarea className={input} rows={3} placeholder={t('playerPlan.form.staffNotes')} value={videoForm.staff_notes} onChange={(e) => setVideoForm({ ...videoForm, staff_notes: e.target.value })} />
                  <div className="flex justify-end gap-2">
                    <button className={btnGhost} onClick={() => setVideoForm(null)}><X size={14} /> {t('playerPlan.cancel')}</button>
                    <button className={btnPrimary} disabled={!videoForm.title.trim()} onClick={() => run(async () => {
                      await createVideoNote({ player_id: playerId, ...videoForm, video_url: videoForm.video_url || null });
                      setVideoForm(null); await loadVideos();
                    })}><Save size={14} /> {t('playerPlan.save')}</button>
                  </div>
                </div>
              )}
              {videos.length === 0 ? <Empty>{t('playerPlan.voice.noVideos')}</Empty> : (
                <ul className="divide-y divide-gray-200">
                  {videos.map((v) => (
                    <li key={v.id} className="py-3 first:pt-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">{fmtDate(v.session_date)}</p>
                          <p className="font-semibold text-gray-900">{v.title}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {v.video_url && <a href={v.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold text-[#db0030] hover:underline p-1"><ExternalLink size={14} /> {t('playerPlan.voice.watchVideo')}</a>}
                          {isStaff && <button className="p-1.5 text-gray-400 hover:text-red-500" aria-label={t('playerPlan.delete')} onClick={() => { if (confirm(t('playerPlan.confirmDeleteSession'))) run(async () => { await deleteVideoNote(v.id); await loadVideos(); }); }}><Trash2 size={15} /></button>}
                        </div>
                      </div>
                      {v.staff_notes && <p className="text-sm text-gray-700 mt-2 whitespace-pre-line"><span className="font-semibold text-black">{t('playerPlan.voice.staff')}: </span>{v.staff_notes}</p>}
                      {isStaff ? (
                        v.player_notes && <p className="text-sm text-gray-700 mt-2 pl-3 border-l-2 border-[#db0030] whitespace-pre-line"><span className="font-semibold text-black">{t('playerPlan.player')}: </span>{v.player_notes}</p>
                      ) : (
                        <div className="mt-2 flex gap-2 items-start">
                          <textarea
                            className={input} rows={2} placeholder={t('playerPlan.voice.notesPlaceholder')}
                            value={replyDrafts[v.id] ?? v.player_notes ?? ''}
                            onChange={(e) => setReplyDrafts({ ...replyDrafts, [v.id]: e.target.value })}
                          />
                          {replyDrafts[v.id] !== undefined && replyDrafts[v.id] !== (v.player_notes ?? '') && (
                            <button className={btnPrimary} aria-label={t('playerPlan.save')} onClick={() => run(async () => {
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

            <div>
              <h3 className="font-bold text-black flex items-center gap-2 mb-3"><MessageSquareText size={16} className="text-[#db0030]" /> {t('playerPlan.voice.selfAssessment')}</h3>
              {!isStaff && (
                <div className="rounded-xl border-2 border-gray-300 bg-white p-3 mb-4 focus-within:border-[#db0030]">
                  <textarea
                    className="w-full text-sm outline-none resize-none bg-transparent" rows={4}
                    aria-label={t('playerPlan.voice.selfAssessment')}
                    placeholder={t('playerPlan.voice.selfAssessmentPlaceholder')}
                    value={newAssessment} onChange={(e) => setNewAssessment(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button className={btnPrimary} disabled={!newAssessment.trim()} onClick={() => run(async () => {
                      await createSelfAssessment(playerId, newAssessment.trim()); setNewAssessment(''); await loadAssessments();
                    })}><Save size={14} /> {t('playerPlan.voice.publish')}</button>
                  </div>
                </div>
              )}
              {assessments.length === 0 ? <Empty>{t(isStaff ? 'playerPlan.voice.noAssessmentsStaff' : 'playerPlan.voice.noAssessmentsPlayer')}</Empty> : (
                <ul className="divide-y divide-gray-200">
                  {assessments.map((a) => (
                    <li key={a.id} className="py-3 first:pt-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-gray-500">
                          {fmtDate(a.created_at)}{a.updated_at && a.updated_at.slice(0, 16) !== a.created_at.slice(0, 16) ? ` (${t('playerPlan.voice.edited')})` : ''}
                        </p>
                        {!isStaff && editingAssessment?.id !== a.id && (
                          <div className="flex gap-1">
                            <button className="p-1 text-gray-400 hover:text-blue-600" aria-label={t('playerPlan.edit')} onClick={() => setEditingAssessment({ id: a.id, content: a.content })}><Edit2 size={14} /></button>
                            <button className="p-1 text-gray-400 hover:text-red-500" aria-label={t('playerPlan.delete')} onClick={() => { if (confirm(t('playerPlan.confirmDeleteAssessment'))) run(async () => { await deleteSelfAssessment(a.id); await loadAssessments(); }); }}><Trash2 size={14} /></button>
                          </div>
                        )}
                      </div>
                      {editingAssessment?.id === a.id ? (
                        <div className="space-y-2">
                          <textarea className={input} rows={4} value={editingAssessment.content} onChange={(e) => setEditingAssessment({ ...editingAssessment, content: e.target.value })} />
                          <div className="flex justify-end gap-2">
                            <button className={btnGhost} aria-label={t('playerPlan.cancel')} onClick={() => setEditingAssessment(null)}><X size={14} /></button>
                            <button className={btnPrimary} disabled={!editingAssessment.content.trim()} onClick={() => run(async () => {
                              await updateSelfAssessment(a.id, editingAssessment.content.trim()); setEditingAssessment(null); await loadAssessments();
                            })}><Save size={14} /> {t('playerPlan.save')}</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-800 whitespace-pre-line">{a.content}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* ===================== CALENDARIO ===================== */}
      {show('calendar') && (
        <Section title={t('playerPlan.calendar.title')} subtitle={t('playerPlan.calendar.subtitle')}>
          <div className={section ? 'max-w-sm' : 'grid md:grid-cols-[minmax(0,300px)_1fr] gap-8'}>
            <div className="rounded-2xl bg-[#db0030] text-white p-5">
              <p className="text-sm font-medium flex items-center gap-1.5"><CalendarClock size={15} /> {t('playerPlan.calendar.next')}</p>
              {nextCheckIn ? (
                <>
                  <p className={`${display} text-3xl font-black mt-2 leading-none`}>{fmtDate(nextCheckIn.date)}</p>
                  {(nextCheckIn.time || nextCheckIn.location) && <p className="text-sm mt-2">{[nextCheckIn.time, nextCheckIn.location].filter(Boolean).join(', ')}</p>}
                  <p className="text-sm mt-1 line-clamp-3">{nextCheckIn.label}</p>
                </>
              ) : (
                <p className="text-sm mt-2">{t('playerPlan.calendar.noDate')}</p>
              )}
            </div>
            {/* En el portal, las tarjetas de reunión van justo debajo */}
            {!section && (agenda.length === 0 ? <Empty>{t('playerPlan.calendar.noMeetings')}</Empty> : (
              <ol className="self-start relative space-y-3 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-gray-300">
                {agenda.map((m) => (
                  <li key={m.id} className="relative pl-6">
                    <span className={`absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full ${m.upcoming ? 'bg-[#db0030]' : 'bg-gray-400'}`} />
                    <p className="text-sm font-semibold text-gray-900">{fmtDate(m.date)}</p>
                    <p className="text-sm text-gray-500 truncate">{m.label}</p>
                  </li>
                ))}
              </ol>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
