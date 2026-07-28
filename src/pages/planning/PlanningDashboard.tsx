import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockSessions } from '../../data/mockTraining';
import { Calendar, Plus, ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TaskLibrary from './TaskLibrary';

const PlanningDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'calendar' | 'library'>('calendar');

  const upcomingSessions = mockSessions.filter(s => !s.isCompleted);
  const pastSessions = mockSessions.filter(s => s.isCompleted);

  return (
    <div className="animate-fade-in p-6">
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="h1">{t('planning.title') || 'Planificación'}</h1>
          <p className="text-muted mt-1">{t('planning.subtitle') || 'Gestión de entrenamientos y biblioteca de tareas'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setActiveTab('library')}>
          {t('planning.goToLibrary') || 'Ir a Biblioteca'}
        </button>
      </div>

      <div className="tabs-list" style={{ marginBottom: '2rem' }}>
        <button 
          className="tab-trigger flex items-center gap-2" 
          data-state={activeTab === 'calendar' ? 'active' : 'inactive'}
          onClick={() => setActiveTab('calendar')}
        >
          <Calendar size={18} />
          {t('planning.calendar') || 'Calendario'}
        </button>
        <button 
          className="tab-trigger flex items-center gap-2" 
          data-state={activeTab === 'library' ? 'active' : 'inactive'}
          onClick={() => setActiveTab('library')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          {t('planning.taskLibrary') || 'Biblioteca de Tareas'}
        </button>
      </div>

      {activeTab === 'library' ? (
        <TaskLibrary />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
          
          {/* Main Content: Weekly Calendar View (Simplified for mock) */}
          <div className="card">
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h3 className="h3">{t('planning.thisWeek') || 'Esta Semana'}</h3>
              <div className="flex gap-2">
                <button className="btn btn-outline" style={{ padding: '0.5rem' }}><ChevronLeft size={16}/></button>
                <button className="btn btn-outline" style={{ padding: '0.5rem' }}><ChevronRight size={16}/></button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1rem' }}>
              {[(t('planning.days.mon') || 'Lun'), (t('planning.days.tue') || 'Mar'), (t('planning.days.wed') || 'Mié'), (t('planning.days.thu') || 'Jue'), (t('planning.days.fri') || 'Vie'), (t('planning.days.sat') || 'Sáb'), (t('planning.days.sun') || 'Dom')].map((day, idx) => (
                <div key={day} style={{ textAlign: 'center' }}>
                  <div className="text-sm text-muted font-medium mb-2">{day}</div>
                  <div style={{ minHeight: '120px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                     {/* Mock inserting a session on some days */}
                     {idx === 2 || idx === 4 ? (
                       <div 
                         onClick={() => navigate('/planning/session/sess-1')}
                         style={{ backgroundColor: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'left' }}
                       >
                         <div className="font-bold text-primary">18:00 - {t('planning.field') || 'Campo'} 1</div>
                         <div className="text-muted truncate">{t('planning.activeRecovery') || 'Recuperación activa...'}</div>
                       </div>
                     ) : (
                       <button className="btn btn-outline" style={{ border: 'none', color: 'var(--color-text-muted)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Plus size={20} />
                       </button>
                     )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar: Upcoming & Past */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <h3 className="h3" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>{t('planning.upcomingSessions') || 'Próximas Sesiones'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {upcomingSessions.map(session => (
                  <div key={session.id} onClick={() => navigate(`/planning/session/${session.id}`)} style={{ display: 'flex', gap: '1rem', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-hover)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                      <span style={{ fontSize: '1.2rem' }}>{new Date(session.date).getDate()}</span>
                      <span className="text-xs uppercase">{new Date(session.date).toLocaleDateString('es-ES', { month: 'short' })}</span>
                    </div>
                    <div>
                      <div className="font-semibold">{session.team}</div>
                      <div className="text-xs text-muted flex items-center gap-1">
                        <Clock size={12} /> {session.time} • {session.duration} min
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="h3" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>{t('planning.recentCompleted') || 'Completadas Recientes'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pastSessions.map(session => (
                  <div key={session.id} onClick={() => navigate(`/planning/session/${session.id}`)} style={{ display: 'flex', gap: '1rem', cursor: 'pointer', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                     <div style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center' }}>
                       <CheckCircle2 size={24} />
                     </div>
                     <div>
                      <div className="font-semibold text-sm">{new Date(session.date).toLocaleDateString()}</div>
                      <div className="text-xs text-muted">Eval: {session.evaluationScore}/10</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default PlanningDashboard;
