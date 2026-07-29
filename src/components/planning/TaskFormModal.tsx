import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Task } from '../../types/training';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task;
}

const TaskFormModal = ({ isOpen, onClose, taskToEdit }: TaskFormModalProps) => {
  const { t } = useTranslation();
  const categoryOptions = [
    t('planning.taskFormModal.categories.warmup'),
    t('planning.taskFormModal.categories.technical'),
    t('planning.taskFormModal.categories.tactical'),
    t('planning.taskFormModal.categories.physical'),
    t('planning.taskFormModal.categories.match'),
    t('planning.taskFormModal.categories.setPieces'),
    t('planning.taskFormModal.categories.recovery'),
  ];
  const { register, handleSubmit } = useForm<Task>({
    defaultValues: taskToEdit || {
      category: 'Técnica',
      duration: 15,
      isFavorite: false,
    }
  });

  if (!isOpen) return null;

  const onSubmit = (data: Task) => {
    console.log('Tarea guardada:', data);
    alert(t('planning.taskFormModal.savedAlert'));
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
        
        <h2 className="h2" style={{ marginBottom: '1.5rem' }}>{taskToEdit ? t('planning.taskFormModal.editTitle') : t('planning.newTask')}</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">{t('planning.taskFormModal.taskName')}</label>
              <input type="text" {...register('name', { required: true })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">{t('planning.category')}</label>
              <select {...register('category', { required: true })}>
                {categoryOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-medium">{t('planning.taskFormModal.mainObjective')}</label>
            <input type="text" {...register('objective', { required: true })} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-medium">{t('planning.taskFormModal.descriptionAndRules')}</label>
            <textarea rows={3} {...register('description')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">{t('planning.taskFormModal.playersCount')}</label>
              <input type="text" placeholder={t('planning.taskFormModal.playersCountPlaceholder')} {...register('playersCount')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">{t('planning.taskFormModal.space')}</label>
              <input type="text" placeholder={t('planning.taskFormModal.spacePlaceholder')} {...register('space')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">{t('planning.taskFormModal.durationMin')}</label>
              <input type="number" {...register('duration')} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">{t('planning.taskFormModal.seriesReps')}</label>
              <input type="number" {...register('reps')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">{t('planning.taskFormModal.recovery')}</label>
              <input type="text" placeholder={t('planning.taskFormModal.recoveryPlaceholder')} {...register('recoveryTime')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">{t('planning.load')}</label>
              <input type="text" placeholder={t('planning.taskFormModal.loadPlaceholder')} {...register('load')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">{t('planning.intensity')}</label>
              <input type="text" placeholder={t('planning.taskFormModal.intensityPlaceholder')} {...register('intensity')} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <label className="text-sm font-medium">{t('planning.taskFormModal.coachInstructions')}</label>
               <textarea rows={2} {...register('instructions')} />
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <label className="text-sm font-medium">{t('planning.taskFormModal.variants')}</label>
               <textarea rows={2} {...register('variants')} />
             </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-medium">{t('planning.taskFormModal.mediaUrl')}</label>
            <input type="url" placeholder="https://..." {...register('mediaUrl')} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary">{t('planning.taskFormModal.saveTask')}</button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default TaskFormModal;
