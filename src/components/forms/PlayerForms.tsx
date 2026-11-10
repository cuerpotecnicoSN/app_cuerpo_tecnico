import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, ClipboardList, Clock, Loader2, Lock, Trash2 } from 'lucide-react';
import FormText from './FormText';
import FormFiller from './FormFiller';
import { deleteResponse, getPlayerForms, submitResponse, type FormAssignment, type FormDB, type FormResponse } from '../../services/forms';

interface Props {
  playerId: string;
  /** player: rellenar / staff: ver sus respuestas */
  mode: 'player' | 'staff';
}

export default function PlayerForms({ playerId, mode }: Props) {
  const { t } = useTranslation();
  const [data, setData] = useState<{ forms: FormDB[]; responses: FormResponse[]; assignments: FormAssignment[] } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = () => getPlayerForms(playerId).then(setData).catch(() => setData({ forms: [], responses: [], assignments: [] }));
  useEffect(() => { load(); }, [playerId]);

  if (!data) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" /></div>;

  const responseFor = (id: string) => data.responses.find((r) => r.form_id === id);
  const sentAt = (id: string) => data.assignments.find((a) => a.form_id === id)?.assigned_at;
  // Staff: solo formularios respondidos. Jugador: todos los enviados, pendientes primero.
  const list = data.forms
    .filter((f) => mode === 'player' || responseFor(f.id))
    .sort((a, b) => Number(!!responseFor(a.id)) - Number(!!responseFor(b.id)) || (sentAt(b.id) ?? '').localeCompare(sentAt(a.id) ?? ''));
  const open = list.find((f) => f.id === openId);

  if (open) {
    const r = responseFor(open.id);
    const editable = mode === 'player';
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => { setOpenId(null); setSaved(false); }} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft size={16} /> {t('forms.backToList')}
        </button>
        {saved && <p className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold p-3 flex items-center gap-2"><CheckCircle2 size={16} /> {t('forms.thanks')}</p>}
        {mode === 'player' && r && (
          <button onClick={async () => { if (!confirm(t('forms.confirmDeleteResponse'))) return; await deleteResponse(open.id, playerId); setSaved(false); await load(); }}
            className="mb-4 flex items-center gap-1.5 text-sm font-bold text-red-600 hover:underline"><Trash2 size={15} /> {t('forms.deleteResponse')}</button>
        )}
        {r && mode === 'staff' && <p className="text-sm text-gray-500 mb-3">{t('forms.answeredOn', { date: new Date(r.updated_at).toLocaleString() })}</p>}
        <FormFiller
          key={`${open.id}-${r?.updated_at ?? ''}`}
          form={open}
          initial={r?.answers}
          readOnly={!editable}
          translateAnswers={mode === 'staff'}
          submitLabel={r ? t('forms.updateAnswers') : t('forms.submit')}
          onSubmit={async (answers) => {
            await submitResponse(open.id, playerId, answers);
            setSaved(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            await load();
          }}
        />
      </div>
    );
  }

  if (!list.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
        <ClipboardList size={32} className="mx-auto mb-2" />
        {mode === 'player' ? t('forms.noFormsPlayer') : t('forms.noFormsStaff')}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {list.map((f) => {
        const r = responseFor(f.id);
        return (
          <button key={f.id} onClick={() => setOpenId(f.id)} className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              {r ? (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md"><CheckCircle2 size={12} /> {t('forms.answered')}</span>
              ) : f.status === 'closed' ? (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md"><Lock size={12} /> {t('forms.status.closed')}</span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-[#db0030] bg-red-50 px-2 py-0.5 rounded-md"><Clock size={12} /> {t('forms.pending')}</span>
              )}
            </div>
            <FormText text={f.title} as="h3" className="block font-black text-gray-900 leading-snug" />
            {r && <p className="text-xs text-gray-500 mt-1">{t('forms.answeredOn', { date: new Date(r.updated_at).toLocaleDateString() })}</p>}
          </button>
        );
      })}
    </div>
  );
}
