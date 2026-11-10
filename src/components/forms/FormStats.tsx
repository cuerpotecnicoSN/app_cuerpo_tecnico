import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import FormText from './FormText';
import TranslatedText from '../common/TranslatedText';
import { CHOICE_TYPES, isAnswered, type FormDB, type FormQuestion, type FormResponse } from '../../services/forms';

export interface PlayerLite { id: string; name: string; photo_url?: string | null }

interface Props {
  form: FormDB;
  responses: FormResponse[];
  players: Map<string, PlayerLite>;
  assignedCount: number;
  onOpenPlayer: (playerId: string) => void;
}

/** Sección a la que pertenece cada pregunta (para etiquetar "Nivel" como "1. Adaptación"). */
export const sectionOf = (form: FormDB) => {
  const map = new Map<string, FormQuestion | undefined>();
  let current: FormQuestion | undefined;
  for (const q of form.questions) {
    if (q.type === 'section') current = q;
    else map.set(q.id, current);
  }
  return map;
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmt = (n: number | null) => (n === null ? '–' : n.toFixed(2).replace(/\.?0+$/, ''));

const scoreColor = (v: number, min: number, max: number) => {
  const r = max > min ? (v - min) / (max - min) : 1;
  if (r < 0.34) return 'bg-red-100 text-red-800';
  if (r < 0.67) return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-800';
};

export default function FormStats({ form, responses, players, assignedCount, onOpenPlayer }: Props) {
  const { t } = useTranslation();
  const sections = useMemo(() => sectionOf(form), [form]);
  const questions = form.questions.filter((q) => q.type !== 'section');

  /** Preguntas con valor numérico por jugador: escala, número u opción única con puntuación */
  const scored = questions.filter(
    (q) => q.type === 'scale' || q.type === 'number' || ((q.type === 'single_choice' || q.type === 'dropdown') && q.options?.some((o) => o.score !== undefined))
  );
  const scoreOf = (q: FormQuestion, r: FormResponse): number | null => {
    const v = r.answers[q.id];
    if (!isAnswered(v)) return null;
    if (q.type === 'scale' || q.type === 'number') return Number(v);
    const o = q.options?.find((x) => x.id === v);
    return o?.score ?? null;
  };
  const range = (q: FormQuestion) => {
    if (q.type === 'scale') return [q.scale!.min, q.scale!.max];
    if (q.type === 'number') {
      const xs = responses.map((r) => scoreOf(q, r)).filter((x): x is number => x !== null);
      return [Math.min(...xs, 0), Math.max(...xs, 1)];
    }
    const xs = (q.options || []).map((o) => o.score).filter((x): x is number => x !== undefined);
    return [Math.min(...xs), Math.max(...xs)];
  };
  const label = (q: FormQuestion) => {
    const s = sections.get(q.id);
    return s ? <><FormText text={s.title} /> · <FormText text={q.title} /></> : <FormText text={q.title} />;
  };

  const pct = assignedCount ? Math.round((responses.length / assignedCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4"><p className="text-xs font-bold text-gray-400 uppercase">{t('forms.assigned')}</p><p className="text-2xl font-black">{assignedCount}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4"><p className="text-xs font-bold text-gray-400 uppercase">{t('forms.responses')}</p><p className="text-2xl font-black">{responses.length}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-bold text-gray-400 uppercase">{t('forms.responseRate')}</p>
          <p className="text-2xl font-black">{pct}%</p>
          <div className="h-1.5 bg-gray-100 rounded-full mt-2"><div className="h-full bg-[#db0030] rounded-full" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      {!responses.length ? (
        <p className="text-sm text-gray-400 bg-white rounded-2xl border border-gray-100 p-8 text-center">{t('forms.noResponsesYet')}</p>
      ) : (
        <>
          {scored.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-black text-gray-900 mb-3">{t('forms.playerMatrix')}</h3>
              <div className="overflow-x-auto">
                <table className="text-sm min-w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="py-2 pr-3 font-bold sticky left-0 bg-white">{t('forms.player')}</th>
                      {scored.map((q) => <th key={q.id} className="py-2 px-2 font-bold min-w-[90px] align-bottom">{label(q)}</th>)}
                      <th className="py-2 px-2 font-bold">{t('forms.average')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r) => {
                      const vals = scored.map((q) => scoreOf(q, r));
                      return (
                        <tr key={r.id} className="border-t border-gray-100">
                          <td className="py-2 pr-3 sticky left-0 bg-white">
                            <button onClick={() => onOpenPlayer(r.player_id)} className="font-bold text-gray-900 hover:text-[#db0030] whitespace-nowrap">
                              {players.get(r.player_id)?.name ?? '—'}
                            </button>
                          </td>
                          {scored.map((q, i) => {
                            const v = vals[i];
                            const [mn, mx] = range(q);
                            return <td key={q.id} className="py-2 px-2 text-center">{v === null ? <span className="text-gray-300">–</span> : <span className={`inline-block min-w-[2rem] px-2 py-0.5 rounded-md font-black ${scoreColor(v, mn, mx)}`}>{v}</span>}</td>;
                          })}
                          <td className="py-2 px-2 text-center font-black">{fmt(avg(vals.filter((x): x is number => x !== null)))}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-gray-200 font-black">
                      <td className="py-2 pr-3 sticky left-0 bg-white">{t('forms.teamAverage')}</td>
                      {scored.map((q) => <td key={q.id} className="py-2 px-2 text-center">{fmt(avg(responses.map((r) => scoreOf(q, r)).filter((x): x is number => x !== null)))}</td>)}
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {questions.map((q) => {
            const answered = responses.filter((r) => isAnswered(r.answers[q.id]));
            return (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="font-black text-gray-900">{label(q)}</p>
                <p className="text-xs text-gray-400 mb-4">{t('forms.answeredBy', { n: answered.length, total: responses.length })}</p>

                {CHOICE_TYPES.includes(q.type) && (
                  <div className="space-y-2.5">
                    {(q.options || []).map((o) => {
                      const n = answered.filter((r) => { const v = r.answers[q.id]; return Array.isArray(v) ? v.includes(o.id) : v === o.id; }).length;
                      const p = answered.length ? Math.round((n / answered.length) * 100) : 0;
                      const who = answered.filter((r) => { const v = r.answers[q.id]; return Array.isArray(v) ? v.includes(o.id) : v === o.id; });
                      return (
                        <div key={o.id}>
                          <div className="flex justify-between text-sm mb-1 gap-3">
                            <FormText text={o.label} className="font-bold text-gray-800" />
                            <span className="text-gray-500 shrink-0">{n} · {p}%</span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full"><div className="h-full bg-[#db0030] rounded-full transition-all" style={{ width: `${p}%` }} /></div>
                          {who.length > 0 && <p className="text-xs text-gray-400 mt-1">{who.map((r) => players.get(r.player_id)?.name ?? '—').join(', ')}</p>}
                        </div>
                      );
                    })}
                    {scored.includes(q) && <p className="text-sm font-bold text-gray-700 pt-1">{t('forms.average')}: {fmt(avg(answered.map((r) => scoreOf(q, r)).filter((x): x is number => x !== null)))}</p>}
                  </div>
                )}

                {q.type === 'scale' && (() => {
                  const nums = Array.from({ length: q.scale!.max - q.scale!.min + 1 }, (_, i) => q.scale!.min + i);
                  const counts = nums.map((n) => answered.filter((r) => Number(r.answers[q.id]) === n).length);
                  const top = Math.max(...counts, 1);
                  return (
                    <div>
                      <div className="flex items-end gap-2 h-28">
                        {nums.map((n, i) => (
                          <div key={n} className="flex-1 flex flex-col items-center justify-end h-full">
                            <span className="text-xs text-gray-500">{counts[i] || ''}</span>
                            <div className="w-full bg-[#db0030] rounded-t-md" style={{ height: `${(counts[i] / top) * 85}%`, minHeight: counts[i] ? 4 : 0 }} />
                            <span className="text-xs font-bold text-gray-600 mt-1">{n}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm font-bold text-gray-700 mt-3">{t('forms.average')}: {fmt(avg(answered.map((r) => Number(r.answers[q.id]))))}</p>
                    </div>
                  );
                })()}

                {q.type === 'number' && (
                  <p className="text-sm font-bold text-gray-700">
                    {t('forms.average')}: {fmt(avg(answered.map((r) => Number(r.answers[q.id]))))} · {t('forms.minShort')}: {answered.length ? Math.min(...answered.map((r) => Number(r.answers[q.id]))) : '–'} · {t('forms.maxShort')}: {answered.length ? Math.max(...answered.map((r) => Number(r.answers[q.id]))) : '–'}
                  </p>
                )}

                {(q.type === 'short_text' || q.type === 'long_text' || q.type === 'date') && (
                  <ul className="space-y-2 max-h-96 overflow-y-auto">
                    {answered.map((r) => (
                      <li key={r.id} className="rounded-xl bg-gray-50 p-3">
                        <button onClick={() => onOpenPlayer(r.player_id)} className="text-xs font-black text-gray-500 hover:text-[#db0030] uppercase">{players.get(r.player_id)?.name ?? '—'}</button>
                        {q.type === 'date'
                          ? <p className="text-sm text-gray-800">{String(r.answers[q.id])}</p>
                          : <TranslatedText text={String(r.answers[q.id])} as="p" className="text-sm text-gray-800 whitespace-pre-line mt-0.5" />}
                      </li>
                    ))}
                    {!answered.length && <li className="text-sm text-gray-400">{t('forms.noAnswer')}</li>}
                  </ul>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
