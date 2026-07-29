import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { mockPlayers } from '../../data/mockPlayers';

interface MeetingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPlayerId?: string;
}

type MeetingFormData = {
  date: string;
  time: string;
  location: string;
  type: string;
  playerIds: string[];
  objective: string;
  development: string;
  positivePoints: string;
  improvements: string;
  agreements: string;
  nextSteps: string;
};

const MeetingFormModal = ({ isOpen, onClose, preselectedPlayerId }: MeetingFormModalProps) => {
  const { t } = useTranslation();
  const meetingTypeOptions = [
    t('meetings.formModal.types.individual'),
    t('meetings.formModal.types.group'),
    t('meetings.formModal.types.groupDynamic'),
    t('meetings.formModal.types.individualFeedback'),
    t('meetings.formModal.types.evaluation'),
    t('meetings.formModal.types.followUp'),
  ];
  const { register, handleSubmit } = useForm<MeetingFormData>({
    defaultValues: {
      playerIds: preselectedPlayerId ? [preselectedPlayerId] : [],
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    }
  });

  if (!isOpen) return null;

  const onSubmit = (data: MeetingFormData) => {
    console.log('Nueva reunión creada:', data);
    // Here we would typically save to Supabase or update our mock state
    alert(t('meetings.formModal.savedAlert'));
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: '1rem' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--color-text-muted)' }}
        >
          <X size={24} />
        </button>
        
        <h2 className="h2" style={{ marginBottom: '1.5rem' }}>{t('meetings.formModal.title')}</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Row 1: Basicos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">{t('meetings.date')}</label>
              <input type="date" {...register('date', { required: true })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">{t('meetings.time')}</label>
              <input type="time" {...register('time', { required: true })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">{t('planning.location')}</label>
              <input type="text" placeholder={t('meetings.formModal.locationPlaceholder')} {...register('location')} />
            </div>
          </div>

          {/* Row 2: Tipo y Jugadores */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">{t('meetings.type')}</label>
              <select {...register('type', { required: true })}>
                {meetingTypeOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">{t('meetings.formModal.involvedPlayers')}</label>
              <select multiple {...register('playerIds', { required: true })} style={{ height: 'auto', minHeight: '80px' }}>
                {mockPlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Objetivo y Desarrollo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-medium">{t('meetings.formModal.mainObjective')}</label>
            <input type="text" placeholder={t('meetings.formModal.objectivePlaceholder')} {...register('objective', { required: true })} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-medium">{t('meetings.formModal.developmentSummary')}</label>
            <textarea rows={4} placeholder={t('meetings.formModal.developmentPlaceholder')} {...register('development', { required: true })} />
          </div>

          {/* Row 4: Puntos y Acuerdos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t('meetings.formModal.positivePoints')}</label>
              <textarea rows={2} {...register('positivePoints')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium text-amber-600 dark:text-amber-400">{t('meetings.formModal.improvements')}</label>
              <textarea rows={2} {...register('improvements')} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-medium">{t('meetings.formModal.agreementsReached')}</label>
            <input type="text" placeholder={t('meetings.formModal.agreementsPlaceholder')} {...register('agreements')} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-medium">{t('meetings.formModal.nextSteps')}</label>
            <input type="text" {...register('nextSteps')} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary">{t('meetings.formModal.saveRecord')}</button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default MeetingFormModal;
