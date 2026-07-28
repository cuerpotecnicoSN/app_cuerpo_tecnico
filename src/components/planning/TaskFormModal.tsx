import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import type { Task } from '../../types/training';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task;
}

const TaskFormModal = ({ isOpen, onClose, taskToEdit }: TaskFormModalProps) => {
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
    alert('Tarea guardada en la biblioteca (Mock)');
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
        
        <h2 className="h2" style={{ marginBottom: '1.5rem' }}>{taskToEdit ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">Nombre de la Tarea</label>
              <input type="text" {...register('name', { required: true })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">Categoría</label>
              <select {...register('category', { required: true })}>
                <option value="Calentamiento">Calentamiento</option>
                <option value="Técnica">Técnica</option>
                <option value="Táctica">Táctica</option>
                <option value="Física">Física</option>
                <option value="Partido">Partido</option>
                <option value="Estrategia (ABP)">Estrategia (ABP)</option>
                <option value="Recuperación">Recuperación</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-medium">Objetivo Principal</label>
            <input type="text" {...register('objective', { required: true })} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-medium">Descripción y Reglas</label>
            <textarea rows={3} {...register('description')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">Nº Jugadores</label>
              <input type="text" placeholder="Ej. 4v4+2" {...register('playersCount')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">Espacio</label>
              <input type="text" placeholder="Ej. 40x30m" {...register('space')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">Duración (min)</label>
              <input type="number" {...register('duration')} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">Series/Reps</label>
              <input type="number" {...register('reps')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">Recuperación</label>
              <input type="text" placeholder="Ej. 1 min" {...register('recoveryTime')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">Carga</label>
              <input type="text" placeholder="Alta/Media/Baja" {...register('load')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">Intensidad</label>
              <input type="text" placeholder="1-10" {...register('intensity')} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <label className="text-sm font-medium">Consignas (Entrenador)</label>
               <textarea rows={2} {...register('instructions')} />
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <label className="text-sm font-medium">Variantes</label>
               <textarea rows={2} {...register('variants')} />
             </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-medium">URL de Imagen / Diagrama (Opcional)</label>
            <input type="url" placeholder="https://..." {...register('mediaUrl')} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar Tarea</button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default TaskFormModal;
