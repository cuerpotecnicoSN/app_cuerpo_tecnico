import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, ChevronLeft, MapPin, X, Download, Save, FolderSearch, ClipboardList, Edit2, ArrowUp, ArrowDown, ListOrdered, AlertTriangle, Settings } from 'lucide-react';
import { TASK_TYPES, type TrainingSessionDB, type TaskLibraryItem, type SessionTask } from '../../components/types';
import {
  getTrainingSessions, createTrainingSession, deleteTrainingSession, updateTrainingSession,
  getTasks, createTask, updateTask, deleteTask,
  getSessionTasks, addSessionTask, removeSessionTask, reorderSessionTasks,
} from '../../services/training';
import { SessionFormModal } from '../../components/training/SessionFormModal';
import { TaskModal } from '../../components/training/TaskModal';
import { TaskBoardEditor } from '../../components/training/TaskBoardEditor';
import { exportSessionToPdf } from '../../utils/sessionPdf';

const stripHtml = (html?: string) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
};

// ¿La tarea tiene dibujo táctico? (la pizarra de equipos no cuenta)
const hasTacticalDrawing = (boardDataStr?: string) => {
  if (!boardDataStr) return false;
  try {
    const parsed = JSON.parse(boardDataStr);
    return (Array.isArray(parsed.elements) && parsed.elements.length > 0)
      || (Array.isArray(parsed.lines) && parsed.lines.length > 0);
  } catch {
    return false;
  }
};

// Proporción del campo dibujado, ignorando la pizarra de equipos
const drawingAspectRatio = (boardDataStr?: string) => {
  if (!boardDataStr) return '16 / 9';
  try {
    const fieldType = JSON.parse(boardDataStr).fieldType || 'half';
    if (fieldType === 'full') return '105 / 68'; // se muestra girado
    if (fieldType === 'full-horizontal') return '105 / 68';
    return '16 / 9';
  } catch {
    return '16 / 9';
  }
};

type View = 'sessions' | 'library';

export default function TrainingPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as View;
  const initialView: View = viewParam === 'library' ? 'library' : 'sessions';
  const [view, setView] = useState<View>(initialView);
  const [sessions, setSessions] = useState<TrainingSessionDB[]>([]);
  const [tasks, setTasks] = useState<TaskLibraryItem[]>([]);
  const [activeSession, setActiveSession] = useState<TrainingSessionDB | null>(null);

  const loadSessions = () => getTrainingSessions().then(setSessions).catch(() => setSessions([]));
  const loadTasks = () => getTasks().then(setTasks).catch(() => setTasks([]));

  useEffect(() => { loadSessions(); loadTasks(); }, []);

  useEffect(() => {
    const vParam = searchParams.get('view');
    const newView = vParam === 'library' ? 'library' : 'sessions';
    setView(newView);
    setActiveSession(null); // Limpiar sesión activa al cambiar de pestaña desde el menú
  }, [searchParams]);

  const handleViewChange = (newView: View) => {
    setView(newView);
    setActiveSession(null);
    setSearchParams({ view: newView });
  };

  if (activeSession) {
    return (
      <SessionEditor
        session={activeSession}
        tasks={tasks}
        onTasksChange={loadTasks}
        onBack={() => { setActiveSession(null); loadSessions(); }}
      />
    );
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



/** Diálogo de confirmación reutilizable para acciones destructivas. */
function ConfirmDialog({
  open, title, message, confirmLabel = 'Eliminar', busy = false, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={busy ? undefined : onCancel} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 flex gap-4">
          <div className="shrink-0 w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-gray-900 leading-tight">{title}</h3>
            <div className="mt-1.5 text-sm text-gray-500 leading-relaxed">{message}</div>
          </div>
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-red-500/20"
          >
            <Trash2 size={15} /> {busy ? 'Eliminando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionsList({ sessions, onCreate, onOpen, onDelete }: { sessions: TrainingSessionDB[]; onCreate: () => void; onOpen: (s: TrainingSessionDB) => void; onDelete: (id: string) => void }) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSessionDB | undefined>(undefined);

  const handleSave = async (sessionData: Omit<TrainingSessionDB, 'id' | 'created_at' | 'season_id'>) => {
    if (editingSession?.id) {
      await updateTrainingSession(editingSession.id, sessionData);
    } else {
      await createTrainingSession(sessionData);
    }
    setShowForm(false);
    setEditingSession(undefined);
    onCreate();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditingSession(undefined); setShowForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2">
          <Plus size={16} /> {t('trainingPage.newSession')}
        </button>
      </div>

      <SessionFormModal 
        key={editingSession ? editingSession.id : 'new'} // Force re-mount when changing edit target
        isOpen={showForm} 
        onClose={() => { setShowForm(false); setEditingSession(undefined); }} 
        onSave={handleSave}
        initialData={editingSession}
        suggestedTitle={`Entrenamiento ${sessions.length + 1}`}
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
                <div className="flex items-center flex-shrink-0 relative z-20 -mr-2 -mt-2">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setEditingSession(s); 
                      setShowForm(true); 
                    }} 
                    className="text-gray-300 hover:text-blue-500 hover:bg-blue-50 p-2.5 rounded-xl transition-colors"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (window.confirm('¿Estás seguro de que quieres eliminar esta sesión? Esta acción no se puede deshacer.')) {
                        onDelete(s.id); 
                      }
                    }} 
                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              
              {s.objective && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-base text-gray-500 font-medium line-clamp-2 leading-snug">{s.objective}</p>
                </div>
              )}

              {(() => {
                const parseNotes = (rawNotes?: string) => {
                  if (!rawNotes) return { structure: '', observations: '' };
                  try {
                    const parsed = JSON.parse(rawNotes);
                    if (parsed && typeof parsed === 'object') {
                      return {
                        structure: parsed.structure || '',
                        observations: parsed.observations || parsed.notes || ''
                      };
                    }
                  } catch {
                    return { structure: '', observations: rawNotes };
                  }
                  return { structure: '', observations: '' };
                };
                const { structure, observations } = parseNotes(s.notes);
                return (
                  (structure || observations) && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400 font-bold">
                      {structure && <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded flex items-center gap-1">📋 Estructura</span>}
                      {observations && <span className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded flex items-center gap-1">✍️ Observaciones</span>}
                    </div>
                  )
                );
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskLibraryView({ tasks, onCreate, onDelete }: { tasks: TaskLibraryItem[]; onCreate: () => void; onDelete: (id: string) => void | Promise<void> }) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskLibraryItem | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<TaskLibraryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('todos');
  const [groupByType, setGroupByType] = useState<boolean>(false);

  const handleSave = async (taskData: Omit<TaskLibraryItem, 'id' | 'created_at'>) => {
    if (editingTask?.id) {
      await updateTask(editingTask.id, taskData);
    } else {
      await createTask(taskData);
    }
    setShowModal(false);
    setEditingTask(undefined);
    onCreate();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onDelete(pendingDelete.id);
      setPendingDelete(null);
      setEditingTask(undefined); // veníamos del botón de eliminar dentro de la tarea
    } finally {
      setDeleting(false);
    }
  };

  const filteredTasks = tasks.filter((tk) => {
    if (selectedTypeFilter === 'todos') return true;
    if (selectedTypeFilter === 'sin_tipo') return !tk.types || tk.types.length === 0;
    return tk.types?.includes(selectedTypeFilter);
  });

  const openTask = (tk: TaskLibraryItem) => { setEditingTask(tk); setShowModal(true); };

  const renderTaskCard = (tk: TaskLibraryItem) => (
    <article
      key={tk.id}
      onClick={() => openTask(tk)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTask(tk); } }}
      className="group bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all cursor-pointer flex flex-col"
    >
      {/* Dibujo táctico (la pizarra de equipos no se muestra aquí) */}
      <div className="relative aspect-video bg-gray-50 border-b border-gray-100 flex items-center justify-center p-2 overflow-hidden">
        {hasTacticalDrawing(tk.board_data) ? (
          <div
            className="relative h-full max-w-full pointer-events-none"
            style={{ aspectRatio: drawingAspectRatio(tk.board_data) }}
          >
            <div className="absolute inset-0">
              <TaskBoardEditor value={tk.board_data} readOnly hideToolbar rotateFullField={true} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-gray-300 select-none">
            <ClipboardList className="w-8 h-8" strokeWidth={1.5} />
            <span className="text-[11px] font-bold uppercase tracking-wider">Sin dibujo</span>
          </div>
        )}

        <span className="absolute top-2 left-2 bg-white/95 backdrop-blur border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-sm">
          {tk.category || 'Principal'}
        </span>
        {tk.duration_min && (
          <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">
            {tk.duration_min}′
          </span>
        )}
      </div>

      {/* Datos */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h4 className="font-black text-gray-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
          {tk.title}
        </h4>
        {tk.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{stripHtml(tk.description)}</p>
        )}
        {tk.types && tk.types.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
            {tk.types.map((type) => (
              <span key={type} className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md text-[10px] font-bold">
                {type}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pie */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600 flex items-center gap-1.5 transition-colors shrink-0">
          <Edit2 size={13} /> Abrir tarea
        </span>
        {tk.material && (
          <span className="text-[11px] font-semibold text-gray-400 truncate" title={tk.material}>
            🎒 {tk.material}
          </span>
        )}
      </div>
    </article>
  );

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Agrupamiento */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-gray-200 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filtrar por tipo:</span>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="todos">Todos los tipos</option>
              <option value="sin_tipo">Sin tipo asignado</option>
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Agrupar por tipo:</span>
            <span
              onClick={() => setGroupByType(!groupByType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
                groupByType
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {groupByType ? 'Sí, agrupar' : 'No, listado simple'}
            </span>
          </div>
        </div>

        <button 
          onClick={() => { setEditingTask(undefined); setShowModal(true); }} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={16} /> {t('trainingPage.newTask')}
        </button>
      </div>

      <TaskModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingTask(undefined); }}
        onSave={handleSave}
        initialData={editingTask}
        onDelete={editingTask ? () => { setPendingDelete(editingTask); setShowModal(false); } : undefined}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        busy={deleting}
        title="Eliminar tarea de la librería"
        message={<>Vas a eliminar <strong className="text-gray-700">«{pendingDelete?.title}»</strong> de la librería de forma permanente. Esta acción no se puede deshacer.</>}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {filteredTasks.length === 0 && <p className="text-sm text-gray-400">{t('trainingPage.noTasks')}</p>}
      
      {groupByType ? (
        <div className="space-y-8">
          {TASK_TYPES.map((type) => {
            const typeTasks = filteredTasks.filter((tk) => tk.types?.includes(type));
            if (typeTasks.length === 0) return null;
            return (
              <div key={type} className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  {type} ({typeTasks.length})
                </h3>
                <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(255px,1fr))]">
                  {typeTasks.map((tk) => renderTaskCard(tk))}
                </div>
              </div>
            );
          })}
          {(() => {
            const untypedTasks = filteredTasks.filter((tk) => !tk.types || tk.types.length === 0);
            if (untypedTasks.length === 0) return null;
            return (
              <div className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                  Otras tareas / Sin tipo ({untypedTasks.length})
                </h3>
                <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(255px,1fr))]">
                  {untypedTasks.map((tk) => renderTaskCard(tk))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(255px,1fr))]">
          {filteredTasks.map((tk) => renderTaskCard(tk))}
        </div>
      )}
    </div>
  );
}

function SessionEditor({ session, tasks, onBack, onTasksChange }: { session: TrainingSessionDB; tasks: TaskLibraryItem[]; onBack: () => void; onTasksChange: () => void }) {
  const [sessionTasks, setSessionTasks] = useState<SessionTask[]>([]);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [selectedLibraryCategory, setSelectedLibraryCategory] = useState<string>('all');
  // null = modal cerrado | { task: undefined } = crear | { task } = editar
  const [taskModal, setTaskModal] = useState<{ task?: TaskLibraryItem } | null>(null);
  const [sortMode, setSortMode] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<SessionTask | null>(null);
  const [removing, setRemoving] = useState(false);

  // PDF Export States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [pdfFormat, setPdfFormat] = useState<'full' | 'simplified'>('full');
  const [pdfLang, setPdfLang] = useState<'es' | 'it' | 'en'>('es');
  const [pdfWithPlayers, setPdfWithPlayers] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const load = () => getSessionTasks(session.id).then(setSessionTasks).catch(() => setSessionTasks([]));
  useEffect(() => { load(); }, [session.id]);

  // Library Modal Filtering Logic
  const matchType = (taskTypes: string[] | undefined, filterType: string) => {
    if (filterType === 'all') return true;
    const cleanFilter = filterType.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    if (cleanFilter === 'otros') {
      const standardTypes = ['rondo', 'posesion', 'partido reducido', 'partido', 'circuito', 'finalizacion', 'secuencia'];
      const taskTypesClean = (taskTypes || []).map(t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
      return !taskTypesClean.some(t => standardTypes.includes(t));
    }
    if (cleanFilter === 'fisica') {
      const taskTypesClean = (taskTypes || []).map(t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
      return taskTypesClean.some(t => t.includes('fisica') || t.includes('preparacion') || t.includes('circuito'));
    }

    const taskTypesClean = (taskTypes || []).map(t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
    return taskTypesClean.includes(cleanFilter);
  };

  const filteredTasks = tasks.filter(tk => matchType(tk.types, selectedLibraryCategory));

  const groupedTasks = filteredTasks.reduce((acc, tk) => {
    const cat = tk.category || 'Otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tk);
    return acc;
  }, {} as Record<string, typeof tasks>);

  const filterCategories = [
    { key: 'all', label: 'Ver Todos' },
    { key: 'rondo', label: 'Rondos' },
    { key: 'posesion', label: 'Posesión' },
    { key: 'partido reducido', label: 'Partidos Reducidos' },
    { key: 'partido', label: 'Partidos' },
    { key: 'circuito', label: 'Circuitos' },
    { key: 'finalizacion', label: 'Finalización' },
    { key: 'secuencia', label: 'Secuencias' },
    { key: 'otros', label: 'Otros' }
  ];

  // Sin al menos dos tareas no tiene sentido seguir en modo ordenar
  useEffect(() => { if (sessionTasks.length < 2) setSortMode(false); }, [sessionTasks.length]);

  const getTaskDetails = (id: string | null) => tasks.find((t) => t.id === id);

  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const taskDataList = sessionTasks
        .map(st => {
          const detail = getTaskDetails(st.task_id);
          if (!detail) return null;
          return {
            id: detail.id,
            title: detail.title,
            category: detail.category,
            duration_min: detail.duration_min,
            material: detail.material,
            description: detail.description,
            board_data: detail.board_data
          };
        })
        .filter((t): t is any => t !== null);

      const parsedNotes = (() => {
        const rawNotes = session.notes;
        if (!rawNotes) return { structure: '', observations: '' };
        try {
          const parsed = JSON.parse(rawNotes);
          if (parsed && typeof parsed === 'object') {
            return {
              structure: parsed.structure || '',
              observations: parsed.observations || parsed.notes || ''
            };
          }
        } catch {
          return { structure: '', observations: rawNotes };
        }
        return { structure: '', observations: '' };
      })();

      await exportSessionToPdf({
        sessionTitle: session.title,
        date: session.date,
        time: session.time,
        location: session.location,
        structure: parsedNotes.structure,
        observations: parsedNotes.observations,
        tasks: taskDataList,
        format: pdfFormat,
        lang: pdfLang,
        includePlayerNames: pdfWithPlayers
      });
      setIsExportModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error al generar PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const getFieldAspectRatio = (boardDataStr?: string) => {
    if (!boardDataStr) return '16 / 9';
    try {
      const parsed = JSON.parse(boardDataStr);
      // If it has teams board it's 16/9
      if (parsed.teamsBoard) return '16 / 9';
      const fieldType = parsed.fieldType || 'half';
      if (fieldType === 'full') return '68 / 105';
      if (fieldType === 'full-horizontal') return '105 / 68';
      return '16 / 9';
    } catch {
      return '16 / 9';
    }
  };

  const getBoardPreview = (boardDataStr?: string) => {
    if (!boardDataStr) return null;
    try {
      const parsed = JSON.parse(boardDataStr);
      
      const hasDrawing = (parsed.elements && parsed.elements.length > 0) || (parsed.lines && parsed.lines.length > 0);

      // If it is a teams and annotations layout and has no drawing elements
      if (!hasDrawing && parsed.teamsBoard) {
        let tbl = parsed.teamsBoard.tables?.[0];
        if (!tbl && parsed.teamsBoard.columnsConfig) {
          tbl = {
            id: 'default',
            count: parsed.teamsBoard.columnsConfig.count,
            colors: parsed.teamsBoard.columnsConfig.colors,
            names: parsed.teamsBoard.columnsConfig.names
          };
        }
        
        const items = Array.isArray(parsed.teamsBoard.items) ? parsed.teamsBoard.items : [];
        
        if (tbl && tbl.count > 0) {
          return (
            <div className="w-[336px] h-[240px] bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between overflow-hidden select-none shrink-0 relative shadow-sm">
              <span className="font-black text-[9px] text-slate-400 uppercase tracking-wider block mb-2">📋 Equipos</span>
              <div className="flex-1 flex gap-2 overflow-hidden w-full items-stretch">
                {Array.from({ length: tbl.count }).map((_, colIdx) => {
                  const colName = tbl.names?.[colIdx] || `Eq ${colIdx + 1}`;
                  const colColor = tbl.colors?.[colIdx] || '#000000';
                  const colPlayers = items.filter((it: any) => it.type === 'player' && (it.tableId === tbl.id || !it.tableId) && it.colIndex === colIdx);
                  
                  return (
                    <div key={colIdx} className="flex-1 min-w-0 flex flex-col border border-gray-150 rounded bg-slate-50/50 overflow-hidden">
                      <div className="text-[9px] font-black text-center py-1 px-1 truncate text-white" style={{ backgroundColor: colColor }}>
                        {colName || `Eq ${colIdx + 1}`}
                      </div>
                      <div className="flex-1 p-1 overflow-hidden flex flex-col gap-1">
                        {colPlayers.slice(0, 5).map((pl: any) => (
                          <div key={pl.id} className="text-[8.5px] font-bold leading-none truncate px-1 py-0.5 rounded text-gray-700 bg-white border border-gray-200">
                            {pl.text}
                          </div>
                        ))}
                        {colPlayers.length > 5 && (
                          <div className="text-[7.5px] text-gray-400 font-bold text-center leading-none mt-0.5">
                            +{colPlayers.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        } else {
          return (
            <div className="w-[336px] h-[240px] bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between overflow-hidden select-none shrink-0 relative shadow-sm">
              <span className="font-black text-[9px] text-slate-400 uppercase tracking-wider block mb-2">📋 Anotaciones</span>
              <div className="flex-1 flex flex-wrap gap-1 overflow-hidden mt-1 content-start">
                {items.slice(0, 12).map((it: any) => (
                  <span key={it.id} className="px-2 py-1 rounded truncate max-w-full text-[8.5px] border border-gray-200 bg-gray-55 text-gray-750">
                    {it.text}
                  </span>
                ))}
              </div>
            </div>
          );
        }
      }
    } catch {}
    
    // Default fallback to Tactical canvas editor (renders the soccer field and elements)
    return (
      <div className="w-[336px] h-[240px] bg-white border border-gray-200 rounded-xl overflow-hidden shrink-0 relative shadow-sm">
        <TaskBoardEditor value={boardDataStr} readOnly hideToolbar rotateFullField={true} printMode={true} printWidth={336} />
      </div>
    );
  };

  const handleAdd = async (taskId: string) => {
    if (!taskId) return;
    await addSessionTask({ session_id: session.id, task_id: taskId, order: sessionTasks.length });
    load();
    setIsLibraryModalOpen(false);
  };

  // Guardar desde el modal: si venimos de "Nueva tarea" la creamos en la librería
  // y la enganchamos a la sesión; si estamos editando, actualizamos la original.
  const handleSaveTask = async (data: Omit<TaskLibraryItem, 'id' | 'created_at'>) => {
    const editing = taskModal?.task;
    if (editing) {
      await updateTask(editing.id, data);
    } else {
      const created = await createTask(data);
      await addSessionTask({ session_id: session.id, task_id: created.id, order: sessionTasks.length });
    }
    setTaskModal(null);
    onTasksChange();
    load();
  };

  const persistOrder = async (ordered: SessionTask[]) => {
    setSessionTasks(ordered.map((st, i) => ({ ...st, order: i })));
    try {
      await reorderSessionTasks(ordered.map((st) => st.id));
    } catch (e) {
      console.error('Error reordenando tareas', e);
      load(); // revertir al estado real si falla
    }
  };

  const moveTask = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sessionTasks.length) return;
    const next = [...sessionTasks];
    [next[index], next[target]] = [next[target], next[index]];
    persistOrder(next);
  };

  const confirmRemove = async () => {
    if (!pendingRemove) return;
    setRemoving(true);
    try {
      await removeSessionTask(pendingRemove.id);
      const rest = sessionTasks.filter((st) => st.id !== pendingRemove.id);
      setPendingRemove(null);
      await persistOrder(rest); // recolocar el orden de las restantes
    } catch (e) {
      console.error('Error eliminando tarea de la sesión', e);
      load();
      setPendingRemove(null);
    } finally {
      setRemoving(false);
    }
  };

  const removeTitle = getTaskDetails(pendingRemove?.task_id ?? null)?.title || 'esta tarea';

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
            <button 
              onClick={() => setIsExportModalOpen(true)}
              className="bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-colors shrink-0"
              title="Exportar PDF"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Resumen de la Sesión */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img src="/escudo.png" alt="Escudo" className="w-6 h-6 object-contain" />
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{session.title}</h2>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5">
                <span className="text-base font-extrabold text-blue-700 flex items-center gap-1.5">
                  📅 {new Date(session.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} {session.time ? `| ⏱ ${session.time}` : ''}
                </span>
                {session.location && (
                  <span className="text-base font-extrabold text-gray-700 flex items-center gap-1.5">
                    📍 {session.location}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 shadow-sm">
                👥 Asistentes (0 POR / 0 JUG)
              </span>
              <span className="bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">
                ⏱ Tareas: {sessionTasks.length}
              </span>
            </div>
          </div>

          {/* Estructura del entrenamiento y Observaciones */}
          {(() => {
            const parseNotes = (rawNotes?: string) => {
              if (!rawNotes) return { structure: '', observations: '' };
              try {
                const parsed = JSON.parse(rawNotes);
                if (parsed && typeof parsed === 'object') {
                  return {
                    structure: parsed.structure || '',
                    observations: parsed.observations || parsed.notes || ''
                  };
                }
              } catch {
                return { structure: '', observations: rawNotes };
              }
              return { structure: '', observations: '' };
            };
            const { structure, observations } = parseNotes(session.notes);
            return (
              (structure || observations || session.objective) && (
                <div className="flex flex-col gap-4 mt-2 pt-3 border-t border-gray-200/60">
                  <style>{`
                    .rich-text-content ul { list-style-type: disc !important; padding-left: 1.25rem !important; margin-bottom: 0.5rem; }
                    .rich-text-content ol { list-style-type: decimal !important; padding-left: 1.25rem !important; margin-bottom: 0.5rem; }
                    .rich-text-content p { margin-bottom: 0.25rem; }
                    .rich-text-content blockquote {
                      margin-left: 2rem !important;
                      border-left: 2px solid #cbd5e1;
                      padding-left: 0.5rem;
                      margin-top: 0.25rem;
                      margin-bottom: 0.25rem;
                    }
                  `}</style>

                  {session.objective && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm w-full">
                      <h4 className="text-xs font-bold text-purple-600 uppercase mb-1.5 flex items-center gap-1">🎯 Objetivo</h4>
                      <p className="text-xs font-medium text-gray-700 whitespace-pre-wrap leading-relaxed">{session.objective}</p>
                    </div>
                  )}

                  {(structure || observations) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      {structure && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm min-h-[100px]">
                          <h4 className="text-xs font-bold text-indigo-600 uppercase mb-2 flex items-center gap-1">📋 Estructura</h4>
                          <div className="text-xs font-medium text-gray-700 leading-relaxed rich-text-content" dangerouslySetInnerHTML={{ __html: structure }} />
                        </div>
                      )}
                      {observations && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm min-h-[100px]">
                          <h4 className="text-xs font-bold text-amber-600 uppercase mb-2 flex items-center gap-1">✍️ Observaciones</h4>
                          <div className="text-xs font-medium text-gray-700 leading-relaxed rich-text-content" dangerouslySetInnerHTML={{ __html: observations }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            );
          })()}

          {/* Barra de Controles Inferior del Resumen */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-gray-200">
            <input
              type="text"
              readOnly
              value={session.title}
              className="w-full sm:w-64 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none"
            />
            <div className="flex flex-wrap gap-2 w-full justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsLibraryModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <FolderSearch size={16} /> Librería
                </button>
                <button
                  onClick={() => { setSortMode(false); setTaskModal({}); }}
                  className="flex items-center justify-center gap-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={16} /> Nueva Tarea
                </button>
              </div>

              {sessionTasks.length > 0 && (
                <button
                  onClick={() => setSortMode((v) => !v)}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    sortMode
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                  title="Ordenar y borrar tareas de la sesión"
                >
                  <Settings size={16} /> {sortMode ? 'Hecho' : 'Ordenar / Borrar'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contenedor de Tareas */}
        <div className="mt-4 flex-1 bg-white border-2 border-dashed border-gray-200 rounded-xl flex flex-col p-4 overflow-y-auto">
          {sessionTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm py-12">
              <FolderSearch size={48} className="opacity-20 mb-3" />
              <p>No hay tareas en esta sesión.</p>
              <p className="mb-4">Añade tareas desde la librería o crea una nueva.</p>
              <button
                onClick={() => setTaskModal({})}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
              >
                <Plus size={16} /> Nueva Tarea
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortMode && (
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <ListOrdered size={14} />
                  Modo ordenar activo: usa las flechas para cambiar el orden de las tareas.
                </div>
              )}
              {sessionTasks.map((st, i) => {
                const tInfo = getTaskDetails(st.task_id);
                return (
                  <div
                    key={st.id}
                    onClick={() => { if (!sortMode && tInfo) setTaskModal({ task: tInfo }); }}
                    className={`bg-white border rounded-2xl p-4 flex flex-row gap-5 items-stretch relative shadow-sm hover:shadow-md transition-all ${
                      sortMode
                        ? 'border-blue-200 ring-1 ring-blue-100'
                        : tInfo
                          ? 'border-gray-200 cursor-pointer hover:border-blue-300'
                          : 'border-gray-200'
                    }`}
                  >
                    {/* Columna Izquierda: Información de la Tarea */}
                    <div className="flex-1 flex flex-col justify-between min-w-0 pr-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase font-black tracking-wider text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-lg">
                            {tInfo?.category || 'Principal'}
                          </span>
                          {tInfo?.duration_min && (
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                              ⏱️ {tInfo.duration_min} min
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-black text-gray-900 leading-tight">
                          {i + 1}. {tInfo?.title || 'Tarea'}
                        </h3>
                        {tInfo?.description && (
                          <div 
                            className="mt-2 text-xs text-gray-500 line-clamp-4 leading-relaxed rich-text-preview" 
                            dangerouslySetInnerHTML={{ __html: tInfo.description }}
                          />
                        )}
                      </div>
                      
                      {tInfo?.material && (
                        <div className="mt-3 text-[11px] text-gray-400 font-bold border-t border-gray-100 pt-2 shrink-0">
                          🎒 Material: {tInfo.material}
                        </div>
                      )}
                    </div>

                    {/* Columna Derecha: Previsualización de la Pizarra Táctica (Contenida por completo) */}
                    <div 
                      id={tInfo ? `pdf-board-container-${tInfo.id}` : undefined}
                      className="w-40 sm:w-64 md:w-[350px] lg:w-[480px] h-32 sm:h-44 md:h-60 shrink-0 overflow-hidden relative rounded-xl border border-gray-200 bg-white flex items-center justify-center p-2 shadow-inner"
                    >
                      {tInfo?.board_data ? (
                        <div 
                          className="relative"
                          style={{
                            aspectRatio: getFieldAspectRatio(tInfo.board_data),
                            width: '100%',
                            height: '100%',
                            maxWidth: '100%',
                            maxHeight: '100%'
                          }}
                        >
                          <div className="absolute inset-0">
                            <TaskBoardEditor value={tInfo.board_data} readOnly hideToolbar rotateFullField={true} />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-xs text-gray-400 select-none">
                          <ClipboardList className="w-8 h-8 mb-1.5 opacity-30" /> Sin dibujo táctico
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-row md:flex-col items-center justify-center gap-1.5 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {sortMode ? (
                        <>
                          <div className="flex flex-row md:flex-col gap-1">
                            <button
                              onClick={() => moveTask(i, -1)}
                              disabled={i === 0}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                              title="Subir"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              onClick={() => moveTask(i, 1)}
                              disabled={i === sessionTasks.length - 1}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                              title="Bajar"
                            >
                              <ArrowDown size={16} />
                            </button>
                          </div>
                          <button
                            onClick={() => setPendingRemove(st)}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title="Quitar de la sesión (Borrar)"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { if (tInfo) setTaskModal({ task: tInfo }); }}
                          disabled={!tInfo}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30"
                          title="Editar tarea"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Crear / editar tarea desde la propia sesión */}
      <TaskModal
        isOpen={!!taskModal}
        onClose={() => setTaskModal(null)}
        onSave={handleSaveTask}
        initialData={taskModal?.task}
      />

      {/* Confirmación antes de quitar una tarea de la sesión */}
      <ConfirmDialog
        open={!!pendingRemove}
        busy={removing}
        title="Quitar tarea de la sesión"
        confirmLabel="Quitar de la sesión"
        message={<>Se quitará <strong className="text-gray-700">«{removeTitle}»</strong> de esta sesión. La tarea seguirá disponible en la librería.</>}
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      />

      {/* Modal de Exportación a PDF */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsExportModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-xl p-8 shadow-2xl flex flex-col gap-6 border border-gray-100 animate-scale-up">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                📄 Exportar Sesión a PDF
              </h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
                <X size={22} />
              </button>
            </div>

            {/* Formatos */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Formato del PDF</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPdfFormat('full')}
                  className={`p-4 rounded-2xl text-xs font-bold text-center transition-all cursor-pointer border ${
                    pdfFormat === 'full'
                      ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/20'
                      : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <span className="block text-sm font-black mb-1">📝 Completo</span>
                  <span className={`block text-[10px] font-normal ${pdfFormat === 'full' ? 'text-red-100' : 'text-gray-400'}`}>Estructura, Notas y Equipos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPdfFormat('simplified')}
                  className={`p-4 rounded-2xl text-xs font-bold text-center transition-all cursor-pointer border ${
                    pdfFormat === 'simplified'
                      ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/20'
                      : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <span className="block text-sm font-black mb-1">🎨 Simplificado</span>
                  <span className={`block text-[10px] font-normal ${pdfFormat === 'simplified' ? 'text-red-100' : 'text-gray-400'}`}>Solo Pizarras y Títulos</span>
                </button>
              </div>
            </div>

            {/* Idiomas */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-400 tracking-wider">Idioma de las Cabeceras</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPdfLang('es')}
                  className={`p-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                    pdfLang === 'es'
                      ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/20'
                      : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <span className="text-base">🇪🇸</span> Español
                </button>
                <button
                  type="button"
                  onClick={() => setPdfLang('it')}
                  className={`p-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                    pdfLang === 'it'
                      ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/20'
                      : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <span className="text-base">🇮🇹</span> Italiano
                </button>
                <button
                  type="button"
                  onClick={() => setPdfLang('en')}
                  className={`p-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                    pdfLang === 'en'
                      ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/20'
                      : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <span className="text-base">🇬🇧</span> English
                </button>
              </div>
            </div>

            {/* Checkbox Player names */}
            {pdfFormat === 'full' && (
              <div className="flex items-center gap-3 py-3 border-t border-b border-gray-100">
                <input
                  type="checkbox"
                  id="pdfWithPlayers"
                  checked={pdfWithPlayers}
                  onChange={(e) => setPdfWithPlayers(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <label htmlFor="pdfWithPlayers" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                  Incluir nombres de los jugadores en la distribución de equipos
                </label>
              </div>
            )}

            {/* Botón Exportar */}
            <button
              onClick={handleExportPdf}
              disabled={isGeneratingPdf}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-red-500/30 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isGeneratingPdf ? 'Generando PDF...' : 'Generar PDF'}
            </button>
          </div>
        </div>
      )}

      {/* Modal Librería Simple */}
      {isLibraryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsLibraryModalOpen(false)} />
          <div className="relative bg-white border border-gray-200 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FolderSearch className="text-red-600" size={20} /> Librería de Tareas
              </h2>
              <button onClick={() => setIsLibraryModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20} /></button>
            </div>

            {/* Filtro por Categorías */}
            {tasks.length > 0 && (
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-2 items-center shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-2">Filtrar por:</span>
                {filterCategories.map(cat => {
                  const count = cat.key === 'all'
                    ? tasks.length
                    : tasks.filter(tk => matchType(tk.types, cat.key)).length;

                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedLibraryCategory(cat.key)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all border cursor-pointer select-none ${
                        selectedLibraryCategory === cat.key
                          ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-500/25'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                      }`}
                    >
                      {cat.label} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
              {tasks.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay tareas en la librería.</p>
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-450">
                  <FolderSearch size={40} className="opacity-20 mb-2" />
                  <p className="text-xs font-bold">No hay tareas en esta categoría.</p>
                </div>
              ) : (
                Object.keys(groupedTasks).sort().map(cat => (
                  <div key={cat} className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 flex items-center gap-1.5 select-none">
                      📁 {cat} <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-black">{groupedTasks[cat].length}</span>
                    </h3>
                    <div className="grid gap-3">
                      {groupedTasks[cat].map(tk => (
                        <div key={tk.id} className="bg-gray-55 border border-gray-200 p-4 rounded-xl flex gap-4 items-center justify-between hover:border-blue-500/30 hover:bg-blue-50/5 transition-all">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900">{tk.title}</h3>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {tk.duration_min ? `⏱️ ${tk.duration_min} min` : ''} 
                              {tk.material ? ` • 🎒 ${tk.material}` : ''}
                            </p>
                            {tk.description && (
                              <p className="text-[11px] text-gray-400 mt-1 line-clamp-1 italic">{stripHtml(tk.description)}</p>
                            )}
                          </div>
                          
                          {/* Tactical / Teams Board Preview */}
                          {getBoardPreview(tk.board_data)}

                          <button 
                            onClick={() => handleAdd(tk.id)} 
                            className="text-xs font-black bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-2 rounded-xl transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
                          >
                            Añadir
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
