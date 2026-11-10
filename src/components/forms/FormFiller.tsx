import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Send } from 'lucide-react';
import FormText, { pickText, useLang } from './FormText';
import TranslatedText from '../common/TranslatedText';
import { isAnswered, type AnswerValue, type Answers, type FormDB, type FormQuestion } from '../../services/forms';

interface Props {
  form: FormDB;
  initial?: Answers;
  /** Solo lectura: muestra las respuestas (perfil del jugador / vista del staff) */
  readOnly?: boolean;
  /** Traducir las respuestas escritas (cuando las lee alguien que no es su autor) */
  translateAnswers?: boolean;
  onSubmit?: (answers: Answers) => Promise<void>;
  submitLabel?: string;
}

const box = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#db0030] focus:ring-1 focus:ring-[#db0030] outline-none disabled:bg-gray-50';

export default function FormFiller({ form, initial = {}, readOnly, translateAnswers, onSubmit, submitLabel }: Props) {
  const { t } = useTranslation();
  const lang = useLang();
  const [answers, setAnswers] = useState<Answers>(initial);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (id: string, v: AnswerValue) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    if (missing.has(id)) setMissing((m) => { const n = new Set(m); n.delete(id); return n; });
  };

  const submit = async () => {
    const miss = form.questions.filter((q) => q.required && q.type !== 'section' && !isAnswered(answers[q.id])).map((q) => q.id);
    setMissing(new Set(miss));
    if (miss.length) {
      document.getElementById(`q-${miss[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit?.(answers);
    } catch (e: any) {
      setError(e?.message || t('forms.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (q: FormQuestion) => {
    const v = answers[q.id];
    switch (q.type) {
      case 'short_text':
      case 'long_text':
        if (readOnly) {
          if (!isAnswered(v)) return <p className="text-sm text-gray-400 italic">{t('forms.noAnswer')}</p>;
          return translateAnswers
            ? <TranslatedText text={String(v)} as="p" className="text-sm text-gray-800 whitespace-pre-line" />
            : <p className="text-sm text-gray-800 whitespace-pre-line">{String(v)}</p>;
        }
        return q.type === 'short_text'
          ? <input className={box} value={(v as string) ?? ''} onChange={(e) => set(q.id, e.target.value)} />
          : <textarea className={box} rows={4} value={(v as string) ?? ''} onChange={(e) => set(q.id, e.target.value)} />;
      case 'number':
        return <input type="number" disabled={readOnly} className={`${box} max-w-[200px]`} value={(v as number | string) ?? ''}
          onChange={(e) => set(q.id, e.target.value === '' ? null : Number(e.target.value))} />;
      case 'date':
        return <input type="date" disabled={readOnly} className={`${box} max-w-[220px]`} value={(v as string) ?? ''} onChange={(e) => set(q.id, e.target.value)} />;
      case 'dropdown':
        return (
          <select disabled={readOnly} className={`${box} max-w-md`} value={(v as string) ?? ''} onChange={(e) => set(q.id, e.target.value || null)}>
            <option value="">{t('forms.choose')}</option>
            {(q.options || []).map((o) => <option key={o.id} value={o.id}>{pickText(o.label, lang).value}</option>)}
          </select>
        );
      case 'single_choice':
      case 'multiple_choice': {
        const multi = q.type === 'multiple_choice';
        const selected = multi ? ((v as string[]) || []) : [v as string];
        return (
          <div className="space-y-2">
            {(q.options || []).map((o) => {
              const on = selected.includes(o.id);
              return (
                <label key={o.id} className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${on ? 'border-[#db0030] bg-red-50/60' : 'border-gray-200'} ${readOnly ? '' : 'cursor-pointer hover:bg-gray-50'}`}>
                  <input
                    type={multi ? 'checkbox' : 'radio'} name={q.id} checked={on} disabled={readOnly}
                    className="mt-1 accent-[#db0030]"
                    onChange={() => set(q.id, multi ? (on ? selected.filter((x) => x !== o.id) : [...selected, o.id]) : o.id)}
                  />
                  <span className="min-w-0">
                    <FormText text={o.label} className="block text-sm font-bold text-gray-900" />
                    {o.description && <FormText text={o.description} className="block text-sm text-gray-600 mt-0.5" />}
                  </span>
                </label>
              );
            })}
          </div>
        );
      }
      case 'scale': {
        const s = q.scale || { min: 1, max: 5 };
        const nums = Array.from({ length: s.max - s.min + 1 }, (_, i) => s.min + i);
        return (
          <div>
            <div className="flex flex-wrap gap-2">
              {nums.map((n) => (
                <button key={n} type="button" disabled={readOnly} onClick={() => set(q.id, n)}
                  className={`w-10 h-10 rounded-xl text-sm font-black border transition-colors ${v === n ? 'bg-[#db0030] text-white border-[#db0030]' : 'bg-white border-gray-200 text-gray-700'} ${readOnly ? '' : 'hover:border-[#db0030]'}`}>
                  {n}
                </button>
              ))}
            </div>
            {(s.minLabel || s.maxLabel) && (
              <div className="flex justify-between text-xs text-gray-500 mt-1.5 max-w-md">
                <FormText text={s.minLabel} /><FormText text={s.maxLabel} />
              </div>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border-t-8 border-[#db0030] border-x border-b border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
          <img src="/escudo.png" alt="" className="w-14 h-14 object-contain" />
          <div className="leading-tight">
            <p className="text-lg font-black tracking-[0.15em] text-gray-900">AC MILAN</p>
            <p className="text-xs font-black tracking-[0.3em] text-[#db0030]">FUTURO</p>
          </div>
        </div>
        <FormText text={form.title} as="h2" className="block text-2xl font-black text-gray-900" />
        {form.description && <FormText text={form.description} as="p" className="block text-sm text-gray-600 mt-2 whitespace-pre-line" />}
        {!readOnly && <p className="text-xs text-[#db0030] mt-3">* {t('forms.requiredHint')}</p>}
      </div>

      {form.questions.map((q) =>
        q.type === 'section' ? (
          <div key={q.id} className="pt-4">
            <FormText text={q.title} as="h3" className="block text-lg font-black text-gray-900" />
            {q.description && <FormText text={q.description} as="p" className="block text-sm text-gray-600 mt-1" />}
          </div>
        ) : (
          <div key={q.id} id={`q-${q.id}`}
            className={`bg-white rounded-2xl border shadow-sm p-5 ${missing.has(q.id) ? 'border-red-400' : 'border-gray-100'}`}>
            <p className="font-bold text-gray-900 mb-1">
              <FormText text={q.title} />{q.required && <span className="text-[#db0030]"> *</span>}
            </p>
            {q.description && <FormText text={q.description} as="p" className="block text-sm text-gray-500 mb-3" />}
            <div className="mt-2">{renderInput(q)}</div>
            {missing.has(q.id) && <p className="text-xs text-red-600 mt-2">{t('forms.requiredError')}</p>}
          </div>
        )
      )}

      {!readOnly && onSubmit && (
        <div className="flex items-center gap-3 pt-2">
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#db0030] text-white font-bold text-sm hover:bg-[#b00026] disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {submitLabel || t('forms.submit')}
          </button>
          {missing.size > 0 && <span className="text-sm text-red-600">{t('forms.missingCount', { n: missing.size })}</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      )}
    </div>
  );
}
