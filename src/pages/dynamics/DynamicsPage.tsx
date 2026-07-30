import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import type { MeetingDB } from '../../components/types';
import { getMeetings, createMeeting, deleteMeeting } from '../../services/meetings';

export default function DynamicsPage() {
  const { t } = useTranslation();
  const [meetings, setMeetings] = useState<MeetingDB[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [objective, setObjective] = useState('');
  const [development, setDevelopment] = useState('');
  const [positivePoints, setPositivePoints] = useState('');
  const [improvements, setImprovements] = useState('');
  const [agreements, setAgreements] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const load = () => getMeetings('grupal').then(setMeetings).catch(() => setMeetings([]));
  useEffect(() => { load(); }, []);

  const reset = () => {
    setDate(''); setTime(''); setLocation(''); setObjective(''); setDevelopment('');
    setPositivePoints(''); setImprovements(''); setAgreements(''); setNextSteps(''); setFollowUpDate('');
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!date) return;
    await createMeeting({
      type: 'grupal', date, time, location, objective, development,
      positive_points: positivePoints, improvements, agreements, next_steps: nextSteps, follow_up_date: followUpDate || undefined,
    });
    reset();
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{t('dynamicsPage.title')}</h1>
          <p className="text-sm text-gray-500">{t('dynamicsPage.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2">
          <Plus size={16} /> {t('dynamicsPage.newMeeting')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="date" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
            <input type="time" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={time} onChange={(e) => setTime(e.target.value)} />
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('dynamicsPage.location') as string} value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('trainingPage.objective') as string} value={objective} onChange={(e) => setObjective(e.target.value)} />
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('dynamicsPage.development') as string} value={development} onChange={(e) => setDevelopment(e.target.value)} />
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('dynamicsPage.positivePoints') as string} value={positivePoints} onChange={(e) => setPositivePoints(e.target.value)} />
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('dynamicsPage.improvements') as string} value={improvements} onChange={(e) => setImprovements(e.target.value)} />
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('dynamicsPage.agreements') as string} value={agreements} onChange={(e) => setAgreements(e.target.value)} />
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('dynamicsPage.nextSteps') as string} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">{t('dynamicsPage.followUpDate')}</label>
            <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>
          <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">{t('common.save')}</button>
        </div>
      )}

      {meetings.length === 0 && <p className="text-sm text-gray-400">{t('dynamicsPage.noMeetings')}</p>}
      <div className="space-y-2">
        {meetings.map((m) => (
          <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-gray-800">{m.date} {m.time || ''}</p>
                {m.location && <p className="text-xs text-gray-400">{m.location}</p>}
              </div>
              <button onClick={async () => { await deleteMeeting(m.id); load(); }} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
            {m.objective && <p className="text-sm text-gray-600 mt-2">{m.objective}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
