import { useState } from 'react';
import { mockMeetings, mockPlayers } from '../../data/mockPlayers';
import { Search, Plus, Filter, Calendar, Users, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MeetingFormModal from '../../components/meetings/MeetingFormModal';

const MeetingsList = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredMeetings = mockMeetings.filter(m => 
    m.objective.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in p-6">
      <MeetingFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="h1">{t('meetings.title') || 'Reuniones e Intervenciones'}</h1>
          <p className="text-muted mt-1">{t('meetings.subtitle') || 'Historial general de interacciones con la plantilla'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          {t('meetings.newMeeting') || 'Nueva Reunión'}
        </button>
      </div>

      <div className="flex gap-4 items-center" style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: '1', maxWidth: '400px' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={20} />
          <input 
            type="text" 
            placeholder={t('meetings.search') || 'Buscar por objetivo o tipo...'}
            style={{ width: '100%', paddingLeft: '2.75rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-outline">
          <Filter size={20} />
          {t('meetings.filters') || 'Filtros'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredMeetings.map(meeting => (
          <div key={meeting.id} className="card" style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem' }}>
            <div style={{ width: '120px', flexShrink: 0, borderRight: '1px solid var(--color-border)', paddingRight: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
              <Calendar size={24} style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }} />
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>{new Date(meeting.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
              <span className="text-sm">{meeting.time}</span>
            </div>
            
            <div style={{ flex: '1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 className="h3" style={{ fontSize: '1.25rem' }}>{meeting.objective}</h3>
                <span style={{ backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-primary)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: '500' }}>
                  {meeting.type}
                </span>
              </div>
              
              <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>{meeting.development}</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
                  <Users size={16} />
                  <span>
                    {meeting.playerIds.map(pid => {
                      const p = mockPlayers.find(player => player.id === pid);
                      return p ? `${p.firstName} ${p.lastName}` : t('meetings.player') || 'Jugador';
                    }).join(', ')}
                  </span>
                </div>
                
                {meeting.agreements && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
                    <FileText size={16} />
                    <span>{t('meetings.withAgreements') || 'Con acuerdos'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MeetingsList;
