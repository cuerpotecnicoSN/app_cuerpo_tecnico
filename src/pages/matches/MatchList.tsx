import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockMatches } from '../../data/mockMatches';
import { Plus, Search, MapPin, Calendar, Clock, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MatchList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMatches = mockMatches.filter(m => 
    m.opponent.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.competition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in p-6">
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="h1">{t('matches.title') || 'Partidos y Eventos'}</h1>
          <p className="text-muted mt-1">{t('matches.subtitle') || 'Gestiona los encuentros y analiza en directo'}</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={20} />
          {t('matches.newMatch') || 'Nuevo Partido'}
        </button>
      </div>

      <div className="flex gap-4 items-center" style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: '1', maxWidth: '400px' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={20} />
          <input 
            type="text" 
            placeholder={t('matches.search') || 'Buscar por rival o competición...'}
            style={{ width: '100%', paddingLeft: '2.75rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {filteredMatches.map(match => (
          <div key={match.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/matches/${match.id}`)}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  match.status === 'Live' ? 'bg-red-100 text-red-600' : 
                  match.status === 'Finished' ? 'bg-gray-100 text-gray-600' : 
                  'bg-blue-100 text-blue-600'
                }`}>
                  {match.status === 'Live' ? 'EN DIRECTO' : match.status === 'Finished' ? 'Finalizado' : 'Próximamente'}
                </span>
                <h3 className="text-lg font-bold mt-2">{match.opponent}</h3>
                <p className="text-sm text-muted">{match.competition}</p>
              </div>
              {match.result && (
                <div className="text-xl font-bold bg-gray-50 p-2 rounded border">
                  {match.result.home} - {match.result.away}
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2 text-sm text-muted mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{new Date(match.date).toLocaleDateString()}</span>
                <Clock size={16} className="ml-2" />
                <span>{match.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>{match.stadium} ({match.isHome ? 'Local' : 'Visitante'})</span>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <span className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
                Ver Detalles <ChevronRight size={16} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchList;
