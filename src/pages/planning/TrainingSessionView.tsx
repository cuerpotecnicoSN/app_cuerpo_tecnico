import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockSessions, mockTasks } from '../../data/mockTraining';
import { ArrowLeft, Clock, MapPin, Edit3, AlertTriangle, Save, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TrainingSessionView = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const session = mockSessions.find(s => s.id === id);
  
  const [activeTab, setActiveTab] = useState<'plan' | 'eval'>('plan');

  if (!session) {
    return (
      <div className="p-6 text-center">
        <h2 className="h2 mb-4">{t('planning.sessionNotFound') || 'Entrenamiento no encontrado'}</h2>
        <button className="btn btn-primary" onClick={() => navigate('/planning')}>{t('planning.back') || 'Volver'}</button>
      </div>
    );
  }

  // Get full task details for the session
  const plannedTasks = session.tasks.map(st => ({
    ...st,
    taskDetails: mockTasks.find(t => t.id === st.taskId)!
  }));

  return (
    <div className="animate-fade-in p-6">
      {/* Header */}
      <div className="flex justify-between items-start" style={{ marginBottom: '2rem' }}>
        <div className="flex gap-4 items-center">
          <button className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: 'var(--radius-full)' }} onClick={() => navigate('/planning')}>
            <ArrowLeft size={20} />
          </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="h1">{t('planning.training') || 'Entrenamiento'} - {session.team}</h1>
            {session.isCompleted ? (
               <span style={{ backgroundColor: 'var(--color-success)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                 {t('planning.completed') || 'Completado'}
               </span>
            ) : (
               <span style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                 {t('planning.planned') || 'Planificado'}
               </span>
            )}
          </div>
          <p className="text-muted mt-1 flex gap-4 items-center">
            <span>{new Date(session.date).toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><Clock size={14} /> {session.time} ({session.duration}')</span>
            <span className="flex items-center gap-1"><MapPin size={14} /> {session.location}</span>
          </p>
        </div>
      </div>
      <button className="btn btn-primary">
        <Edit3 size={18} />
        {t('planning.editSession') || 'Editar Sesión'}
      </button>
      </div>

      {/* Global Meta */}
      <div className="card" style={{ marginBottom: '2rem' }}>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
           <div>
             <div className="stat-label">{t('planning.microcycle') || 'Microciclo'}</div>
             <div className="font-semibold">{session.microcycle}</div>
           </div>
           <div>
             <div className="stat-label">{t('planning.mesocycle') || 'Mesociclo'}</div>
             <div className="font-semibold">{session.mesocycle}</div>
           </div>
           <div style={{ gridColumn: 'span 2' }}>
             <div className="stat-label flex items-center gap-1"><Target size={14} /> {t('planning.mainObjectives') || 'Objetivos Principales'}</div>
             <div className="font-semibold text-primary">{session.objectives}</div>
           </div>
         </div>
      </div>

      {/* Tabs */}
      <div className="tabs-list" style={{ marginBottom: '2rem' }}>
        <button 
          className="tab-trigger flex items-center gap-2" 
          data-state={activeTab === 'plan' ? 'active' : 'inactive'}
          onClick={() => setActiveTab('plan')}
        >
          {t('planning.tabs.initialPlan') || 'Planificación Inicial'}
        </button>
        <button 
          className="tab-trigger flex items-center gap-2" 
          data-state={activeTab === 'eval' ? 'active' : 'inactive'}
          onClick={() => setActiveTab('eval')}
        >
          {t('planning.tabs.evaluationReal') || 'Evaluación y Realidad'}
        </button>
      </div>

      {activeTab === 'plan' ? (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {plannedTasks.map(st => (
            <div key={st.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: '40px', backgroundColor: 'var(--color-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-text-muted)', borderRight: '1px solid var(--color-border)' }}>
                {st.order}
              </div>
              
              <div style={{ padding: '1.5rem', flex: 1 }}>
                 <div className="flex justify-between items-start mb-2">
                   <h3 className="h3 text-primary">{st.taskDetails.name}</h3>
                   <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">{st.taskDetails.category}</span>
                 </div>
                 <p className="text-sm font-medium mb-4">{st.taskDetails.objective}</p>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                   <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-800">
                     <div className="text-muted text-xs mb-1">{t('planning.task.organization') || 'Organización / Jugadores'}</div>
                     <div className="font-semibold">{st.taskDetails.organization} ({st.taskDetails.playersCount})</div>
                   </div>
                   <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-800">
                     <div className="text-muted text-xs mb-1">{t('planning.task.durationLoad') || 'Duración y Carga'}</div>
                     <div className="font-semibold">{st.taskDetails.duration}' • {t('planning.task.int') || 'Int'}: {st.taskDetails.intensity}</div>
                   </div>
                   <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-800">
                     <div className="text-muted text-xs mb-1">{t('planning.task.seriesRecovery') || 'Series / Recup.'}</div>
                     <div className="font-semibold">{st.taskDetails.reps}x • {st.taskDetails.recoveryTime}</div>
                   </div>
                   <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-800">
                     <div className="text-muted text-xs mb-1">{t('planning.task.space') || 'Espacio'}</div>
                     <div className="font-semibold">{st.taskDetails.space}</div>
                   </div>
                 </div>
                 
                 <div className="text-sm border-t border-gray-100 dark:border-gray-800 pt-3 mt-2">
                    <strong className="text-emerald-600 dark:text-emerald-400">{t('planning.task.instructions') || 'Consignas'}: </strong>
                    {st.taskDetails.instructions}
                 </div>
              </div>

              {st.taskDetails.mediaUrl && (
                <div style={{ width: '250px', borderLeft: '1px solid var(--color-border)' }}>
                   <img src={st.taskDetails.mediaUrl} alt="Diagrama" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>
          ))}
          <button className="btn btn-outline" style={{ padding: '2rem', borderStyle: 'dashed' }}>
             + {t('planning.addTaskFromLibrary') || 'Añadir tarea desde la biblioteca'}
          </button>
        </div>
      ) : (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
           {/* Left: Tasks executed */}
           <div>
             <h3 className="h3 mb-4">{t('planning.taskEvaluation') || 'Evaluación de las Tareas'}</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {plannedTasks.map(st => (
                  <div key={st.id} className="card p-4" style={{ 
                    borderLeft: `4px solid ${st.status === 'Completed' ? 'var(--color-success)' : st.status === 'Modified' ? '#f59e0b' : 'var(--color-border)'}` 
                  }}>
                     <div className="flex justify-between items-center mb-3">
                       <h4 className="font-semibold">{st.order}. {st.taskDetails.name}</h4>
                       <select 
                          defaultValue={st.status} 
                          className="text-sm p-1 border rounded"
                          style={{ backgroundColor: 'var(--color-bg)' }}
                       >
                         <option value="Planned">{t('planning.status.planned') || 'Planificada'}</option>
                         <option value="Completed">{t('planning.status.completed') || 'Realizada (Completa)'}</option>
                         <option value="Modified">{t('planning.status.modified') || 'Realizada con Cambios'}</option>
                         <option value="Skipped">{t('planning.status.skipped') || 'No Realizada'}</option>
                       </select>
                     </div>
                     
                     {st.status === 'Modified' && (
                       <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded text-sm mb-3">
                         <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                           <AlertTriangle size={14} /> {t('planning.modificationsDesc') || 'Modificaciones durante la sesión'}
                         </div>
                         <textarea 
                           defaultValue={st.modifications} 
                           className="w-full bg-transparent border-none p-0 focus:ring-0 resize-none text-amber-900 dark:text-amber-100"
                           rows={2}
                           placeholder={t('planning.modificationsPlaceholder') || '¿Qué cambiaste de la tarea y por qué?'}
                         />
                       </div>
                     )}

                     <div className="mt-2">
                       <label className="text-xs text-muted font-semibold mb-1 block">{t('planning.executionNotes') || 'Notas de Ejecución (Opcional)'}</label>
                       <input 
                         type="text" 
                         defaultValue={st.executionNotes} 
                         className="w-full text-sm p-2 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900"
                         placeholder={t('planning.executionNotesPlaceholder') || 'Ej: Los jugadores asimilaron bien el concepto...'}
                       />
                     </div>
                  </div>
                ))}
             </div>
           </div>

           {/* Right: Global Evaluation */}
           <div>
             <div className="card sticky top-6">
                <h3 className="h3 mb-4">{t('planning.sessionClose') || 'Cierre de Sesión'}</h3>
                
                <div className="mb-4">
                  <label className="text-sm font-semibold mb-1 block">{t('planning.generalScore') || 'Nota General (1-10)'}</label>
                  <input type="number" min="1" max="10" defaultValue={session.evaluationScore} className="w-full text-lg p-2" />
                </div>
                
                <div className="mb-6">
                  <label className="text-sm font-semibold mb-1 block">{t('planning.staffFeedback') || 'Feedback del Cuerpo Técnico'}</label>
                  <textarea 
                    rows={6} 
                    defaultValue={session.evaluationFeedback} 
                    className="w-full p-2"
                    placeholder={t('planning.staffFeedbackPlaceholder') || 'Resumen general de las sensaciones del entrenamiento...'}
                  />
                </div>

                <button className="btn btn-primary w-full flex justify-center items-center gap-2">
                  <Save size={18} />
                  {t('planning.saveEvaluation') || 'Guardar Evaluación'}
                </button>
             </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default TrainingSessionView;
