import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Copy, Eye, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { pickText, setText, useLang } from './FormText';
import FormFiller from './FormFiller';
import {
  CHOICE_TYPES, QUESTION_TYPES, newId, saveForm,
  type FormDB, type FormOption, type FormQuestion, type LText, type QuestionType,
} from '../../services/forms';

interface Props {
  form?: FormDB;
  onClose: () => void;
  onSaved: (form: FormDB) => void;
}

const input = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#db0030] focus:ring-1 focus:ring-[#db0030]';

const blankQuestion = (type: QuestionType): FormQuestion => ({
  id: newId(),
  type,
  title: {},
  required: false,
  ...(CHOICE_TYPES.includes(type) ? { options: [{ id: newId(), label: {} }, { id: newId(), label: {} }] } : {}),
  ...(type === 'scale' ? { scale: { min: 1, max: 5 } } : {}),
});

/** Campo de texto multilenguaje: edita el idioma actual; si solo existe en otro idioma, lo muestra como pista. */
function LInput({ value, onChange, placeholder, area }: { value?: LText; onChange: (v: LText) => void; placeholder: string; area?: boolean }) {
  const lang = useLang();
  const current = value?.[lang] ?? '';
  const fallback = current ? '' : pickText(value, lang).value;
  const props = {
    className: input,
    defaultValue: current,
    placeholder: fallback || placeholder,
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.target.value !== current) onChange(e.target.value ? setText(lang, e.target.value) : value?.[lang] ? {} : value || {});
    },
  };
  return area ? <textarea rows={2} {...props} /> : <input {...props} />;
}


export default function FormBuilder({ form, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const lang = useLang();
  const [title, setTitle] = useState<LText>(form?.title || {});
  const [description, setDescription] = useState<LText>(form?.description || {});
  const [questions, setQuestions] = useState<FormQuestion[]>(form?.questions || [blankQuestion('single_choice')]);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (id: string, patch: Partial<FormQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const move = (i: number, d: -1 | 1) =>
    setQuestions((qs) => {
      const j = i + d;
      if (j < 0 || j >= qs.length) return qs;
      const n = [...qs];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const duplicate = (i: number) =>
    setQuestions((qs) => {
      const q = qs[i];
      const copy: FormQuestion = { ...q, id: newId(), options: q.options?.map((o) => ({ ...o, id: newId() })) };
      return [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)];
    });
  const changeType = (q: FormQuestion, type: QuestionType) => {
    const patch: Partial<FormQuestion> = { type };
    if (CHOICE_TYPES.includes(type) && !q.options?.length) patch.options = blankQuestion(type).options;
    if (type === 'scale' && !q.scale) patch.scale = { min: 1, max: 5 };
    if (type === 'section') patch.required = false;
    update(q.id, patch);
  };
  const setOption = (q: FormQuestion, oid: string, patch: Partial<FormOption>) =>
    update(q.id, { options: q.options!.map((o) => (o.id === oid ? { ...o, ...patch } : o)) });

  const save = async () => {
    if (!pickText(title, lang).value.trim()) { setError(t('forms.titleRequired')); return; }
    setSaving(true);
    setError('');
    try {
      const saved = await saveForm({ id: form?.id, title, description, questions, ...(form ? {} : { status: 'draft' }) });
      onSaved(saved);
    } catch (e: any) {
      setError(e?.message || t('forms.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-gray-900">
            <X size={18} /> {t('forms.close')}
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-gray-400">{t('forms.editingIn', { lang: lang.toUpperCase() })}</span>
            <button onClick={() => setPreview((p) => !p)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border border-gray-200 hover:bg-gray-50">
              <Eye size={16} /> {preview ? t('forms.edit') : t('forms.preview')}
            </button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-[#db0030] text-white hover:bg-[#b00026] disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {t('forms.save')}
            </button>
          </div>
        </div>
        {error && <p className="max-w-3xl mx-auto px-4 pb-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {preview ? (
          <FormFiller key={JSON.stringify(questions).length} form={{ id: 'preview', title, description, questions, status: 'draft' }} onSubmit={async () => {}} submitLabel={t('forms.submitPreview')} />
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border-t-8 border-[#db0030] shadow-sm p-5 space-y-3">
              <LInput value={title} onChange={setTitle} placeholder={t('forms.formTitle')} />
              <LInput value={description} onChange={setDescription} placeholder={t('forms.formDescription')} area />
            </div>

            {questions.map((q, i) => (
              <div key={q.id} className={`bg-white rounded-2xl shadow-sm p-5 space-y-3 border-l-4 ${q.type === 'section' ? 'border-gray-800' : 'border-[#db0030]'}`}>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1"><LInput value={q.title} onChange={(v) => update(q.id, { title: v })} placeholder={q.type === 'section' ? t('forms.sectionTitle') : t('forms.question')} /></div>
                  <select className={`${input} sm:w-56`} value={q.type} onChange={(e) => changeType(q, e.target.value as QuestionType)}>
                    {QUESTION_TYPES.map((ty) => <option key={ty} value={ty}>{t(`forms.types.${ty}`)}</option>)}
                  </select>
                </div>
                <LInput value={q.description} onChange={(v) => update(q.id, { description: v })} placeholder={t('forms.descriptionOptional')} area />

                {CHOICE_TYPES.includes(q.type) && (
                  <div className="space-y-2">
                    {q.options!.map((o, oi) => (
                      <div key={o.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-2.5 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-400 w-5 text-center">{oi + 1}</span>
                          <div className="flex-1"><LInput value={o.label} onChange={(v) => setOption(q, o.id, { label: v })} placeholder={t('forms.optionN', { n: oi + 1 })} /></div>
                          <input type="number" className={`${input} w-20`} title={t('forms.scoreHint')} placeholder={t('forms.score')}
                            value={o.score ?? ''} onChange={(e) => setOption(q, o.id, { score: e.target.value === '' ? undefined : Number(e.target.value) })} />
                          <button onClick={() => update(q.id, { options: q.options!.filter((x) => x.id !== o.id) })} disabled={q.options!.length <= 1}
                            className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={15} /></button>
                        </div>
                        <div className="pl-7"><LInput value={o.description} onChange={(v) => setOption(q, o.id, { description: v })} placeholder={t('forms.optionDescription')} area /></div>
                      </div>
                    ))}
                    <button onClick={() => update(q.id, { options: [...q.options!, { id: newId(), label: {} }] })}
                      className="flex items-center gap-1.5 text-sm font-bold text-[#db0030] hover:underline"><Plus size={15} /> {t('forms.addOption')}</button>
                  </div>
                )}

                {q.type === 'scale' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <label className="text-xs font-bold text-gray-500">{t('forms.min')}
                      <select className={input} value={q.scale!.min} onChange={(e) => update(q.id, { scale: { ...q.scale!, min: Number(e.target.value) } })}>
                        {[0, 1].map((n) => <option key={n}>{n}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-bold text-gray-500">{t('forms.max')}
                      <select className={input} value={q.scale!.max} onChange={(e) => update(q.id, { scale: { ...q.scale!, max: Number(e.target.value) } })}>
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n}>{n}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-bold text-gray-500">{t('forms.minLabel')}
                      <LInput value={q.scale!.minLabel} onChange={(v) => update(q.id, { scale: { ...q.scale!, minLabel: v } })} placeholder="" />
                    </label>
                    <label className="text-xs font-bold text-gray-500">{t('forms.maxLabel')}
                      <LInput value={q.scale!.maxLabel} onChange={(v) => update(q.id, { scale: { ...q.scale!, maxLabel: v } })} placeholder="" />
                    </label>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-1 pt-2 border-t border-gray-100">
                  {q.type !== 'section' && (
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mr-auto cursor-pointer">
                      <input type="checkbox" className="accent-[#db0030]" checked={!!q.required} onChange={(e) => update(q.id, { required: e.target.checked })} />
                      {t('forms.required')}
                    </label>
                  )}
                  <button title={t('forms.moveUp')} onClick={() => move(i, -1)} className="p-2 text-gray-400 hover:text-gray-800"><ArrowUp size={16} /></button>
                  <button title={t('forms.moveDown')} onClick={() => move(i, 1)} className="p-2 text-gray-400 hover:text-gray-800"><ArrowDown size={16} /></button>
                  <button title={t('forms.duplicate')} onClick={() => duplicate(i)} className="p-2 text-gray-400 hover:text-gray-800"><Copy size={16} /></button>
                  <button title={t('forms.delete')} onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <button onClick={() => setQuestions((qs) => [...qs, blankQuestion('single_choice')])}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold hover:bg-gray-50"><Plus size={16} /> {t('forms.addQuestion')}</button>
              <button onClick={() => setQuestions((qs) => [...qs, blankQuestion('section')])}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold hover:bg-gray-50"><Plus size={16} /> {t('forms.addSection')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
