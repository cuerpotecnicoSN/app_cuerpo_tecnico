import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
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
    alert('Reunión registrada correctamente (Mock)');
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
        
        <h2 className="h2" style={{ marginBottom: '1.5rem' }}>Registrar Nueva Intervención</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Row 1: Basicos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">Fecha</label>
              <input type="date" {...register('date', { required: true })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">Hora</label>
              <input type="time" {...register('time', { required: true })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">Lugar</label>
              <input type="text" placeholder="Ej. Despacho, Campo..." {...register('location')} />
            </div>
          </div>

          {/* Row 2: Tipo y Jugadores */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">Tipo de Intervención</label>
              <select {...register('type', { required: true })}>
                <option value="Reunión individual">Reunión individual</option>
                <option value="Reunión grupal">Reunión grupal</option>
                <option value="Dinámica de grupo">Dinámica de grupo</option>
                <option value="Feedback individual">Feedback individual</option>
                <option value="Evaluación">Evaluación</option>
                <option value="Conversación de seguimiento">Conversación de seguimiento</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium">Jugadores Implicados (Múltiple)</label>
              <select multiple {...register('playerIds', { required: true })} style={{ height: 'auto', minHeight: '80px' }}>
                {mockPlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Objetivo y Desarrollo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-medium">Objetivo Principal</label>
            <input type="text" placeholder="¿Qué se busca con esta reunión?" {...register('objective', { required: true })} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-medium">Desarrollo / Resumen</label>
            <textarea rows={4} placeholder="Describe lo que se ha hablado..." {...register('development', { required: true })} />
          </div>

          {/* Row 4: Puntos y Acuerdos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Puntos Positivos</label>
              <textarea rows={2} {...register('positivePoints')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-medium text-amber-600 dark:text-amber-400">Aspectos a Mejorar</label>
              <textarea rows={2} {...register('improvements')} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-medium">Acuerdos Adoptados</label>
            <input type="text" placeholder="Ej. Realizar 2 sesiones de vídeo extra..." {...register('agreements')} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-sm font-medium">Próximos Pasos</label>
            <input type="text" {...register('nextSteps')} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar Registro</button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default MeetingFormModal;
