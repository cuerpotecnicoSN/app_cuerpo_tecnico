import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BarChart3, CheckCircle2, ClipboardList, Copy, Loader2, Lock, Pencil, Plus, Send, Trash2, Unlock, Users, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ensureContext } from '../../lib/dataService';
import FormText from '../../components/forms/FormText';
import FormBuilder from '../../components/forms/FormBuilder';
import FormFiller from '../../components/forms/FormFiller';
import FormStats, { type PlayerLite } from '../../components/forms/FormStats';
import {
  deleteForm, getAllAssignments, getAllResponses, getForms, newId, saveForm, setAssignments,
  type FormAssignment, type FormDB, type FormResponse, type FormStatus,
} from '../../services/forms';

const statusStyle: Record<FormStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-amber-50 text-amber-700',
};

function AssignModal({ form, players, assigned, responded, onClose, onSaved }: {
  form: FormDB; players: PlayerLite[]; assigned: Set<string>; responded: Set<string>;
  onClose: () => void; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [sel, setSel] = useState<Set<string>>(new Set(assigned));
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [publish, setPublish] = useState(form.status === 'draft');
  const visible = players.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const save = async () => {
    setSaving(true);
    try {
      await setAssignments(form.id, [...sel]);
      if (publish && form.status === 'draft') await saveForm({ id: form.id, status: 'published' });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-black text-lg">{t('forms.sendTo')}</h3>
            <FormText text={form.title} className="text-sm text-gray-500" />
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-800"><X size={20} /></button>
        </div>
        <div className="p-4 flex gap-2 border-b border-gray-100">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('forms.searchPlayer')}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#db0030]" />
          <button onClick={() => setSel(new Set(players.map((p) => p.id)))} className="px-3 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50">{t('forms.all')}</button>
          <button onClick={() => setSel(new Set())} className="px-3 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50">{t('forms.none')}</button>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {visible.map((p) => (
            <label key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="accent-[#db0030]" checked={sel.has(p.id)} onChange={() => toggle(p.id)} />
              {p.photo_url ? <img src={p.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" /> : <span className="w-7 h-7 rounded-full bg-gray-200" />}
              <span className="text-sm font-bold flex-1">{p.name}</span>
              {responded.has(p.id) && <span className="text-[10px] font-black uppercase text-emerald-600">{t('forms.answered')}</span>}
            </label>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 space-y-3">
          {form.status === 'draft' && (
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <input type="checkbox" className="accent-[#db0030]" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
              {t('forms.publishNow')}
            </label>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{t('forms.selectedCount', { n: sel.size })}</span>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#db0030] text-white text-sm font-bold disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {t('forms.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FormsPage() {
  const { t } = useTranslation();
  const [forms, setForms] = useState<FormDB[] | null>(null);
  const [assignments, setAssignmentsState] = useState<FormAssignment[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [players, setPlayers] = useState<PlayerLite[]>([]);
  const [editing, setEditing] = useState<FormDB | 'new' | null>(null);
  const [assigning, setAssigning] = useState<FormDB | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<'stats' | 'responses'>('stats');
  const [openPlayer, setOpenPlayer] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    const [f, a, r] = await Promise.all([getForms(), getAllAssignments(), getAllResponses()]);
    setForms(f);
    setAssignmentsState(a);
    setResponses(r);
  };

  useEffect(() => {
    load().catch((e) => { console.error('Forms load error:', e); setLoadError(e?.message || String(e)); setForms([]); });
    ensureContext()
      .then((seasonId) => supabase.from('players').select('id, first_name, last_name, football_name, photo_url').eq('season_id', seasonId).order('last_name'))
      .then(({ data }) => setPlayers((data || []).map((p: any) => ({
        id: p.id, photo_url: p.photo_url, name: p.football_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
      }))));
  }, []);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const open = forms?.find((f) => f.id === openId) || null;
  const assignedFor = (id: string) => assignments.filter((a) => a.form_id === id);
  const responsesFor = (id: string) => responses.filter((r) => r.form_id === id);

  const setStatus = async (f: FormDB, status: FormStatus) => { await saveForm({ id: f.id, status }); load(); };
  const duplicate = async (f: FormDB) => {
    const copyTitle = Object.fromEntries(Object.entries(f.title).map(([k, v]) => [k, `${v} (${t('forms.copy')})`]));
    await saveForm({ title: copyTitle, description: f.description, questions: f.questions.map((q) => ({ ...q, id: newId() })), status: 'draft' });
    load();
  };
  const remove = async (f: FormDB) => {
    if (!confirm(t('forms.confirmDelete'))) return;
    await deleteForm(f.id);
    if (openId === f.id) setOpenId(null);
    load();
  };

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">{t('forms.title')}</h1>
        <p className="text-sm text-gray-500">{t('forms.subtitle')}</p>
      </div>
      <button onClick={() => setEditing('new')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#db0030] text-white text-sm font-bold hover:bg-[#b00026]">
        <Plus size={16} /> {t('forms.newForm')}
      </button>
    </div>
  );

  const actions = (f: FormDB) => (
    <div className="flex flex-wrap gap-1.5">
      <button onClick={() => setEditing(f)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50"><Pencil size={13} /> {t('forms.edit')}</button>
      <button onClick={() => setAssigning(f)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50"><Users size={13} /> {t('forms.send')}</button>
      {f.status === 'published' && <button onClick={() => setStatus(f, 'closed')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50"><Lock size={13} /> {t('forms.closeForm')}</button>}
      {f.status !== 'published' && <button onClick={() => setStatus(f, 'published')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50"><Unlock size={13} /> {t('forms.publish')}</button>}
      <button onClick={() => duplicate(f)} title={t('forms.duplicate')} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><Copy size={13} /></button>
      <button onClick={() => remove(f)} title={t('forms.delete')} className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {editing && (
        <FormBuilder
          form={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(f) => { setEditing(null); load(); if (editing === 'new') setOpenId(f.id); }}
        />
      )}
      {assigning && (
        <AssignModal
          form={assigning} players={players}
          assigned={new Set(assignedFor(assigning.id).map((a) => a.player_id))}
          responded={new Set(responsesFor(assigning.id).map((r) => r.player_id))}
          onClose={() => setAssigning(null)}
          onSaved={() => { setAssigning(null); load(); }}
        />
      )}

      {!forms ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
      ) : open ? (
        <div>
          <button onClick={() => { setOpenId(null); setOpenPlayer(null); }} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 mb-4">
            <ArrowLeft size={16} /> {t('forms.backToList')}
          </button>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 flex flex-wrap justify-between gap-4">
            <div className="min-w-0">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${statusStyle[open.status]}`}>{t(`forms.status.${open.status}`)}</span>
              <FormText text={open.title} as="h2" className="block text-2xl font-black text-gray-900 mt-1" />
            </div>
            {actions(open)}
          </div>

          <div className="flex gap-1 mb-5 bg-white rounded-xl border border-gray-100 p-1 w-fit">
            {(['stats', 'responses'] as const).map((v) => (
              <button key={v} onClick={() => { setView(v); setOpenPlayer(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-bold ${view === v ? 'bg-[#db0030] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {t(`forms.view.${v}`)}
              </button>
            ))}
          </div>

          {view === 'stats' && !openPlayer && (
            <FormStats form={open} responses={responsesFor(open.id)} players={playerMap} assignedCount={assignedFor(open.id).length}
              onOpenPlayer={(id) => { setView('responses'); setOpenPlayer(id); }} />
          )}

          {view === 'responses' && (
            <div className="grid md:grid-cols-[260px_1fr] gap-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-2 h-fit">
                {assignedFor(open.id).map((a) => {
                  const done = responsesFor(open.id).some((r) => r.player_id === a.player_id);
                  return (
                    <button key={a.id} onClick={() => done && setOpenPlayer(a.player_id)} disabled={!done}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${openPlayer === a.player_id ? 'bg-red-50 text-[#db0030]' : done ? 'hover:bg-gray-50' : 'opacity-50 cursor-default'}`}>
                      {done ? <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> : <span className="w-[15px] h-[15px] rounded-full border-2 border-gray-300 shrink-0" />}
                      <span className="font-bold truncate">{playerMap.get(a.player_id)?.name ?? '—'}</span>
                    </button>
                  );
                })}
                {!assignedFor(open.id).length && <p className="text-sm text-gray-400 p-3">{t('forms.notSentYet')}</p>}
              </div>
              <div>
                {openPlayer ? (() => {
                  const r = responsesFor(open.id).find((x) => x.player_id === openPlayer);
                  return r ? (
                    <div>
                      <p className="text-sm text-gray-500 mb-3"><b className="text-gray-900">{playerMap.get(openPlayer)?.name}</b> · {new Date(r.updated_at).toLocaleString()}</p>
                      <FormFiller key={r.id} form={open} initial={r.answers} readOnly translateAnswers />
                    </div>
                  ) : null;
                })() : <p className="text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 p-8 text-center">{t('forms.pickPlayer')}</p>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {header}
          {loadError && <p className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{loadError}</p>}
          {!forms.length ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              <ClipboardList size={36} className="mx-auto mb-3" />{t('forms.empty')}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map((f) => {
                const sent = assignedFor(f.id).length;
                const done = responsesFor(f.id).length;
                const qn = f.questions.filter((q) => q.type !== 'section').length;
                return (
                  <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    <button onClick={() => { setOpenId(f.id); setView('stats'); }} className="text-left flex-1">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${statusStyle[f.status]}`}>{t(`forms.status.${f.status}`)}</span>
                      <FormText text={f.title} as="h3" className="block font-black text-gray-900 mt-2 leading-snug" />
                      <p className="text-xs text-gray-500 mt-1">{t('forms.questionsCount', { n: qn })}</p>
                      <div className="flex items-center gap-2 mt-3 text-sm">
                        <BarChart3 size={15} className="text-[#db0030]" />
                        <span className="font-bold">{done}/{sent}</span>
                        <span className="text-gray-500">{t('forms.answeredLower')}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full mt-1.5"><div className="h-full bg-[#db0030] rounded-full" style={{ width: `${sent ? (done / sent) * 100 : 0}%` }} /></div>
                    </button>
                    {actions(f)}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
