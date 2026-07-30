import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, ChevronLeft, Dumbbell, MapPin } from 'lucide-react';
import type { TrainingSessionDB, TaskLibraryItem, SessionTask } from '../../components/types';
import {
  getTrainingSessions, createTrainingSession, deleteTrainingSession,
  getTasks, createTask, deleteTask,
  getSessionTasks, addSessionTask, removeSessionTask,
} from '../../services/training';
import { SessionFormModal } from '../../components/training/SessionFormModal';

type View = 'sessions' | 'library';

export default function TrainingPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = (searchParams.get('view') as View) || 'sessions';
  const [view, setView] = useState<View>(initialView);
  const [sessions, setSessions] = useState<TrainingSessionDB[]>([]);
  const [tasks, setTasks] = useState<TaskLibraryItem[]>([]);
  const [activeSession, setActiveSession] = useState<TrainingSessionDB | null>(null);

  const loadSessions = () => getTrainingSessions().then(setSessions).catch(() => setSessions([]));
  const loadTasks = () => getTasks().then(setTasks).catch(() => setTasks([]));

  useEffect(() => { loadSessions(); loadTasks(); }, []);

  useEffect(() => {
    const viewParam = searchParams.get('view') as View;
    if (viewParam && (viewParam === 'sessions' || viewParam === 'library')) {
      setView(viewParam);
    }
  }, [searchParams]);

  const handleViewChange = (newView: View) => {
    setView(newView);
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
      ) : (
        <TaskLibraryView tasks={tasks} onCreate={loadTasks} onDelete={async (id) => { await deleteTask(id); loadTasks(); }} />
      )}
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
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [material, setMaterial] = useState('');

  const handleAdd = async () => {
    if (!title.trim() || !category.trim()) return;
    await createTask({ title, category, description, duration_min: durationMin ? Number(durationMin) : undefined, material });
    setTitle(''); setCategory(''); setDescription(''); setDurationMin(''); setMaterial(''); setShowForm(false);
    onCreate();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm((v) => !v)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2">
          <Plus size={16} /> {t('trainingPage.newTask')}
        </button>
      </div>
      {showForm && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 shadow-sm">
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('common.title') as string} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('trainingPage.category') as string} value={category} onChange={(e) => setCategory(e.target.value)} />
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('common.description') as string} value={description} onChange={(e) => setDescription(e.target.value)} />
          <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('trainingPage.duration') as string} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('trainingPage.material') as string} value={material} onChange={(e) => setMaterial(e.target.value)} />
          <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">{t('common.save')}</button>
        </div>
      )}
      {tasks.length === 0 && <p className="text-sm text-gray-400">{t('trainingPage.noTasks')}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tasks.map((tk) => (
          <div key={tk.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2"><Dumbbell size={16} className="text-blue-500" /><p className="font-bold text-gray-800">{tk.title}</p></div>
              <button onClick={() => onDelete(tk.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
            <p className="text-xs text-gray-400 mt-1">{tk.category}{tk.duration_min ? ` · ${tk.duration_min} min` : ''}</p>
            {tk.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{tk.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionEditor({ session, tasks, onBack }: { session: TrainingSessionDB; tasks: TaskLibraryItem[]; onBack: () => void }) {
  const { t } = useTranslation();
  const [sessionTasks, setSessionTasks] = useState<SessionTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const load = () => getSessionTasks(session.id).then(setSessionTasks).catch(() => setSessionTasks([]));
  useEffect(() => { load(); }, [session.id]);

  const handleAdd = async () => {
    if (!selectedTaskId) return;
    await addSessionTask({ session_id: session.id, task_id: selectedTaskId, order: sessionTasks.length });
    setSelectedTaskId('');
    load();
  };

  const taskTitle = (id: string | null) => tasks.find((t) => t.id === id)?.title || '—';

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800">
        <ChevronLeft size={16} /> {t('common.back')}
      </button>
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-gray-900">{session.title}</h2>
        <p className="text-sm text-gray-400">{session.date}</p>
        {session.objective && <p className="text-sm text-gray-600 mt-2">{session.objective}</p>}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-gray-800">{t('trainingPage.sessionTasks')}</h3>
        <div className="flex gap-2">
          <select className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}>
            <option value="">—</option>
            {tasks.map((tk) => <option key={tk.id} value={tk.id}>{tk.title}</option>)}
          </select>
          <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">{t('trainingPage.addTaskToSession')}</button>
        </div>
        <div className="space-y-2">
          {sessionTasks.map((st) => (
            <div key={st.id} className="flex justify-between items-center border border-gray-100 rounded-lg px-3 py-2">
              <span className="text-sm font-medium">{taskTitle(st.task_id)}</span>
              <button onClick={async () => { await removeSessionTask(st.id); load(); }} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
