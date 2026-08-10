import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, ChevronLeft, ChevronDown, Dumbbell, MapPin, X, Download, Save, FolderSearch, ClipboardList } from 'lucide-react';
import type { TrainingSessionDB, TaskLibraryItem, SessionTask } from '../../components/types';
import {
  getTrainingSessions, createTrainingSession, deleteTrainingSession,
  getTasks, createTask, deleteTask,
  getSessionTasks, addSessionTask, removeSessionTask,
} from '../../services/training';
import { SessionFormModal } from '../../components/training/SessionFormModal';
import { TaskModal } from '../../components/training/TaskModal';
import { TaskBoardEditor } from '../../components/training/TaskBoardEditor';

type View = 'sessions' | 'library' | 'edit';

export default function TrainingPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as View;
  const initialView: View = viewParam === 'library' ? 'library' : viewParam === 'edit' ? 'edit' : 'sessions';
  const [view, setView] = useState<View>(initialView);
  const [sessions, setSessions] = useState<TrainingSessionDB[]>([]);
  const [tasks, setTasks] = useState<TaskLibraryItem[]>([]);
  const [activeSession, setActiveSession] = useState<TrainingSessionDB | null>(null);

  const loadSessions = () => getTrainingSessions().then(setSessions).catch(() => setSessions([]));
  const loadTasks = () => getTasks().then(setTasks).catch(() => setTasks([]));

  useEffect(() => { loadSessions(); loadTasks(); }, []);

  useEffect(() => {
    const vParam = searchParams.get('view');
    const newView = vParam === 'library' ? 'library' : vParam === 'edit' ? 'edit' : 'sessions';
    setView(newView);
    setActiveSession(null); // Limpiar sesión activa al cambiar de pestaña desde el menú
  }, [searchParams]);

  const handleViewChange = (newView: View) => {
    setView(newView);
    setActiveSession(null);
    setSearchParams({ view: newView });
  };

  if (activeSession) {
    return <SessionEditor session={activeSession} tasks={tasks} onBack={() => { setActiveSession(null); loadSessions(); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold text-gray-900">{t('trainingPage.title')}</h1>
        <div className="flex gap-2">
          <button onClick={() => handleViewChange('sessions')} className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${view === 'sessions' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>{t('trainingPage.sessions')}</button>
          <button onClick={() => handleViewChange('library')} className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${view === 'library' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>{t('trainingPage.taskLibrary')}</button>
        </div>
      </div>

      {view === 'sessions' ? (
        <SessionsList sessions={sessions} onCreate={loadSessions} onOpen={setActiveSession} onDelete={async (id) => { await deleteTrainingSession(id); loadSessions(); }} />
      ) : view === 'edit' ? (
        <SessionEditSelector sessions={sessions} onSelect={setActiveSession} />
      ) : (
        <TaskLibraryView tasks={tasks} onCreate={loadTasks} onDelete={async (id) => { await deleteTask(id); loadTasks(); }} />
      )}
    </div>
  );
}

function SessionEditSelector({ sessions, onSelect }: { sessions: TrainingSessionDB[]; onSelect: (s: TrainingSessionDB) => void }) {
  if (sessions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center max-w-md mx-auto mt-10 shadow-sm">
        <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">No hay sesiones</h3>
        <p className="text-gray-500 text-sm">Crea una sesión primero desde la pestaña "Sesiones" para poder editarla aquí.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-[2rem] p-10 max-w-2xl w-full shadow-lg flex flex-col items-center">
        <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <ClipboardList className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-3 text-center uppercase tracking-tight">Editar Sesión</h2>
        <p className="text-base text-gray-500 mb-8 text-center max-w-md">Selecciona la sesión que quieres preparar en el editor de pizarra táctica.</p>
        
        <div className="w-full relative max-w-lg">
          <select 
            className="w-full appearance-none bg-gray-50 border-2 border-gray-200 text-gray-900 text-lg font-bold rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 block px-6 py-4 pr-12 transition-all hover:border-gray-300 cursor-pointer outline-none"
            onChange={(e) => {
              const selected = sessions.find(s => s.id === e.target.value);
              if (selected) onSelect(selected);
            }}
            defaultValue=""
          >
            <option value="" disabled>-- Elige una sesión --</option>
            {[...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(s => (
              <option key={s.id} value={s.id}>
                {new Date(s.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} {s.time ? `| ${s.time}` : ''} - {s.title}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-6 text-gray-400">
            <ChevronDown className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionsList({ sessions, onCreate, onOpen, onDelete }: { sessions: TrainingSessionDB[]; onCreate: () => void; onOpen: (s: TrainingSessionDB) => void; onDelete: (id: string) => void }) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);

  const handleSave = async (sessionData: Omit<TrainingSessionDB, 'id' | 'created_at' | 'season_id'>) => {
    await createTrainingSession(sessionData);
    setShowForm(false);
    onCreate();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2">
          <Plus size={16} /> {t('trainingPage.newSession')}
        </button>
      </div>

      <SessionFormModal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        onSave={handleSave} 
      />
      {sessions.length === 0 && <p className="text-sm text-gray-400">{t('trainingPage.noSessions')}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((s) => (
          <div 
            key={s.id} 
            className="group relative bg-white border border-gray-200 rounded-3xl p-6 shadow-sm cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-red-200 transition-all duration-300 overflow-hidden min-h-[180px] flex flex-col justify-between" 
            onClick={() => onOpen(s)}
          >
            {/* Fondo con el Escudo */}
            <div className="absolute -right-12 -bottom-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:opacity-[0.05] transition-all duration-700">
              <img src="/escudo.png" alt="Escudo" className="w-56 h-56 object-contain grayscale" />
            </div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-4">
                  <h3 className="font-black text-2xl text-gray-900 tracking-tight uppercase leading-none mb-3 group-hover:text-red-600 transition-colors">{s.title}</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-extrabold text-red-600 bg-red-50 border border-red-100 px-3 py-1 rounded-lg shadow-sm">
                      {new Date(s.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {s.time && ` | ${s.time}`}
                    </span>
                    {s.location && (
                      <span className="text-sm font-bold text-gray-600 flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg shadow-sm">
                        <MapPin size={14} className="text-blue-500" />
                        {s.location}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(s.id); }} 
                  className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-colors shrink-0"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              
              {s.objective && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-base text-gray-500 font-medium line-clamp-2 leading-snug">{s.objective}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskLibraryView({ tasks, onCreate, onDelete }: { tasks: TaskLibraryItem[]; onCreate: () => void; onDelete: (id: string) => void }) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskLibraryItem | undefined>(undefined);

  const handleSave = async (taskData: Omit<TaskLibraryItem, 'id' | 'created_at'>) => {
    if (editingTask?.id) {
      // Editar tarea existente
      await createTask({ ...taskData });
    } else {
      await createTask(taskData);
    }
    setShowModal(false);
    setEditingTask(undefined);
    onCreate();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button 
          onClick={() => { setEditingTask(undefined); setShowModal(true); }} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={16} /> {t('trainingPage.newTask')}
        </button>
      </div>

      <TaskModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSave={handleSave}
        initialData={editingTask}
      />

      {tasks.length === 0 && <p className="text-sm text-gray-400">{t('trainingPage.noTasks')}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((tk) => (
          <div key={tk.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Dumbbell size={16} />
                  </div>
                  <p className="font-extrabold text-gray-900 leading-snug">{tk.title}</p>
                </div>
                <button 
                  onClick={() => onDelete(tk.id)} 
                  className="text-gray-300 hover:text-red-500 p-1 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mt-2">
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">{tk.category || 'Principal'}</span>
                {tk.duration_min && <span>· {tk.duration_min} min</span>}
              </div>
              {tk.description && <p className="text-sm text-gray-500 mt-3 line-clamp-2 leading-relaxed">{tk.description}</p>}
            </div>

            <button
              onClick={() => { setEditingTask(tk); setShowModal(true); }}
              className="mt-4 w-full py-2 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 hover:border-blue-200 text-gray-600 rounded-xl text-xs font-bold transition-all text-center"
            >
              Ver / Editar Tarea
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionEditor({ session, tasks, onBack }: { session: TrainingSessionDB; tasks: TaskLibraryItem[]; onBack: () => void }) {
  const [sessionTasks, setSessionTasks] = useState<SessionTask[]>([]);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  const load = () => getSessionTasks(session.id).then(setSessionTasks).catch(() => setSessionTasks([]));
  useEffect(() => { load(); }, [session.id]);

  const handleAdd = async (taskId: string) => {
    if (!taskId) return;
    await addSessionTask({ session_id: session.id, task_id: taskId, order: sessionTasks.length });
    load();
    setIsLibraryModalOpen(false);
  };

  const getTaskDetails = (id: string | null) => tasks.find((t) => t.id === id);

  return (
    <div className="space-y-6">
      {/* Botón Volver */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
        <ChevronLeft size={16} /> Volver a Entrenamientos
      </button>

      {/* Header del Editor de Sesiones (Tema Claro) */}
      <div className="bg-white text-gray-900 rounded-2xl p-6 border border-gray-200 shadow-xl flex flex-col min-h-[70vh]">
        
        {/* Cabecera superior */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
              <ClipboardList className="w-6 h-6 text-red-600" />
              Editor de Sesiones
            </h1>
            <p className="text-sm text-gray-500 mt-1">Planifica tu entrenamiento con la pizarra táctica</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 w-full sm:w-64 truncate">
              Sesión | {new Date(session.date).toLocaleDateString()} {session.time ? `- ${session.time}` : ''} - {session.title}
            </div>
            <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shrink-0">
              <Save size={16} /> Guardar
            </button>
            <button className="bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-colors shrink-0">
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Resumen de la Sesión */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <img src="/escudo.png" alt="Escudo" className="w-6 h-6 object-contain" />
            <h2 className="text-base font-bold text-gray-900">{session.title}</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
            <span className="bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-gray-700">
              📅 {new Date(session.date).toLocaleDateString()} {session.time ? `- ${session.time}` : ''}
            </span>
            {session.location && (
              <span className="bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-gray-700">
                📍 {session.location}
              </span>
            )}
            <span className="bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-gray-700">
              👥 Asistentes (0 POR / 0 JUG)
            </span>
            <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold">
              ⏱ Tareas: {sessionTasks.length}
            </span>
          </div>

          {/* Barra de Controles Inferior del Resumen */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-gray-200">
            <input
              type="text"
              readOnly
              value={session.title}
              className="w-full sm:w-64 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none"
            />
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsLibraryModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <FolderSearch size={16} /> Librería
              </button>
              <button
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} /> Nueva Tarea
              </button>
            </div>
          </div>
        </div>

        {/* Contenedor de Tareas */}
        <div className="mt-4 flex-1 bg-white border-2 border-dashed border-gray-200 rounded-xl flex flex-col p-4 overflow-y-auto">
          {sessionTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm py-12">
              <FolderSearch size={48} className="opacity-20 mb-3" />
              <p>No hay tareas en esta sesión.</p>
              <p>Añade tareas desde la librería o crea una nueva.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessionTasks.map((st, i) => {
                const tInfo = getTaskDetails(st.task_id);
                return (
                  <div key={st.id} className="bg-white border border-gray-200 rounded-lg p-3 pl-8 sm:pl-4 flex flex-col sm:flex-row gap-4 sm:items-center relative shadow-sm">
                    {/* Thumbnail */}
                    <div className="w-full sm:w-56 h-36 shrink-0 overflow-hidden relative rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                      {tInfo?.board_data ? (
                        <div style={{ width: '480px', height: '320px', transform: 'scale(0.45)', transformOrigin: 'center' }} className="flex flex-col justify-center shrink-0">
                          <TaskBoardEditor value={tInfo.board_data} readOnly hideToolbar rotateFullField={true} />
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-xs text-gray-600 opacity-50">
                          <ClipboardList className="w-6 h-6 mb-1" /> Sin dibujo
                        </div>
                      )}
                    </div>
                    {/* Datos de la Tarea */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="text-base font-bold text-gray-900 truncate pr-2">
                          {i + 1}. {tInfo?.title || 'Tarea'}
                        </h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] uppercase font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {tInfo?.category || 'Principal'}
                          </span>
                          {tInfo?.duration_min && (
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">
                              ⏱ {tInfo.duration_min}'
                            </span>
                          )}
                        </div>
                      </div>
                      {tInfo?.description && (
                         <p className="mt-2 text-sm text-gray-500 line-clamp-3 leading-relaxed">{tInfo.description}</p>
                      )}
                    </div>
                    {/* Acciones */}
                    <div className="flex items-center gap-2 self-end sm:self-auto sm:border-l sm:border-gray-200 sm:pl-4">
                      <button onClick={async () => { await removeSessionTask(st.id); load(); }} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors" title="Eliminar de la sesión">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Librería Simple */}
      {isLibraryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsLibraryModalOpen(false)} />
          <div className="relative bg-white border border-gray-200 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FolderSearch className="text-red-600" size={20} /> Librería de Tareas
              </h2>
              <button onClick={() => setIsLibraryModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 no-scrollbar">
              {tasks.length === 0 ? <p className="text-gray-500 text-sm">No hay tareas en la librería.</p> : null}
              {tasks.map(tk => (
                <div key={tk.id} className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex justify-between items-center hover:border-gray-300 transition-colors">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{tk.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{tk.category} {tk.duration_min ? `| ${tk.duration_min} min` : ''}</p>
                  </div>
                  <button onClick={() => handleAdd(tk.id)} className="text-xs font-bold bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded transition-colors">
                    Añadir a Sesión
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
