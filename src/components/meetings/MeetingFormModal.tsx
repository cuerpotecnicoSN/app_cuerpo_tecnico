
import { useForm, Controller } from 'react-hook-form';
import { X, Calendar, Clock, MapPin, User, FileText, MessageSquare, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { mockPlayers } from '../../data/mockPlayers';
import RichTextEditor from '../common/RichTextEditor';

interface MeetingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPlayerId?: string;
  defaultType?: string;
}

type MeetingFormData = {
  type: string;
  date: string;
  time: string;
  location: string;
  coach: string;
  playerIds: string[];
  content: string;
  observations: string;
};

const MeetingFormModal = ({ isOpen, onClose, preselectedPlayerId, defaultType }: MeetingFormModalProps) => {
  const { t } = useTranslation();
  const { register, handleSubmit, control } = useForm<MeetingFormData>({
    defaultValues: {
      type: defaultType || 'individual',
      playerIds: preselectedPlayerId ? [preselectedPlayerId] : [],
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      location: '',
      coach: '',
      content: '',
      observations: ''
    }
  });

  if (!isOpen) return null;

  const onSubmit = (data: MeetingFormData) => {
    const meetingData = {
      ...data
    };
    console.log('Nueva reunión creada:', meetingData);
    alert(t('meetings.formModal.savedAlert', 'Reunión guardada exitosamente'));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 sm:p-6 lg:p-8">
      {/* Ventana Modal Flotante Moderna */}
      <div className="bg-white dark:bg-gray-900 w-full max-w-7xl h-full max-h-[92vh] flex flex-col rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in border border-white/50 dark:border-gray-800/80 ring-1 ring-black/5">
        
        {/* Encabezado Principal y Controles */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
              <Users size={24} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {t('meetings.formModal.title', 'Nueva Reunión Individual')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="px-5 py-2.5 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors" onClick={onClose}>
              {t('common.cancel', 'Cancelar')}
            </button>
            <button type="button" className="px-6 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95" onClick={handleSubmit(onSubmit)}>
              {t('common.save', 'Guardar Reunión')}
            </button>
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-800 mx-2"></div>
            <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        <form className="flex flex-col flex-1 overflow-hidden" onSubmit={handleSubmit(onSubmit)}>
          
          {/* Sección Superior - Datos Básicos (Fondo Suave Moderno) */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-gray-800/40 dark:to-blue-900/10 px-8 py-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-full">
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <User size={16} className="text-blue-500" /> Jugador
                </label>
                <select 
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow shadow-sm" 
                  {...register('playerIds', { required: true })}
                >
                  <option value="">Seleccionar Jugador</option>
                  {mockPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Calendar size={16} className="text-blue-500" /> Fecha
                </label>
                <input 
                  type="date" 
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow shadow-sm"
                  {...register('date', { required: true })} 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Clock size={16} className="text-blue-500" /> Hora
                </label>
                <input 
                  type="time" 
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow shadow-sm"
                  {...register('time', { required: true })} 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <MapPin size={16} className="text-blue-500" /> Lugar
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: Despacho, Campo..."
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow shadow-sm"
                  {...register('location')} 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <User size={16} className="text-blue-500" /> Entrenador
                </label>
                <input 
                  type="text" 
                  placeholder="Nombre del entrenador"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow shadow-sm"
                  {...register('coach')} 
                />
              </div>

            </div>
          </div>

          {/* Sección Inferior - Editores Grandes Lado a Lado */}
          <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0 bg-white dark:bg-gray-900">
            
            {/* Contenido */}
            <div className="flex flex-col h-full bg-gray-50/80 dark:bg-gray-800/30 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-800/50 shrink-0 flex items-center gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Contenido de la Reunión</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Desarrollo, temas tratados y puntos clave</p>
                </div>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col p-4 bg-white/30 dark:bg-transparent">
                <Controller
                  name="content"
                  control={control}
                  render={({ field }) => (
                    <RichTextEditor 
                      value={field.value} 
                      onChange={field.onChange} 
                      className="h-full flex flex-col [&>div:last-child]:flex-1 border-none !ring-0 shadow-none bg-transparent"
                      placeholder="Escribe el contenido de forma detallada aquí..."
                    />
                  )}
                />
              </div>
            </div>

            {/* Observaciones */}
            <div className="flex flex-col h-full bg-gray-50/80 dark:bg-gray-800/30 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-800/50 shrink-0 flex items-center gap-3">
                <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-2 rounded-lg">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Observaciones y Acuerdos</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Conclusiones finales y próximos pasos a seguir</p>
                </div>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col p-4 bg-white/30 dark:bg-transparent">
                <Controller
                  name="observations"
                  control={control}
                  render={({ field }) => (
                    <RichTextEditor 
                      value={field.value} 
                      onChange={field.onChange} 
                      className="h-full flex flex-col [&>div:last-child]:flex-1 border-none !ring-0 shadow-none bg-transparent"
                      placeholder="Anota acuerdos, impresiones o tareas pendientes..."
                    />
                  )}
                />
              </div>
            </div>

          </div>
          
        </form>
      </div>
    </div>
  );
};

export default MeetingFormModal;
