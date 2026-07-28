import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, MoreVertical, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ensureContext, getPlayers, seedDatabase } from '../../lib/dataService';
import '../../components/players/players.css';

const TeamList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonId, setSeasonId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const sId = await ensureContext();
      setSeasonId(sId);
      const p = await getPlayers(sId);
      setPlayers(p || []);
    } catch (e) {
      console.error(e);
      alert('Error cargando datos de Supabase. Asegúrate de haber ejecutado el SQL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSeed = async () => {
    if (!seasonId) return;
    setLoading(true);
    await seedDatabase(seasonId);
    await loadData();
  };

  const filteredPlayers = players.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.main_position && p.main_position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-fade-in p-6">
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="h1">{t('players.title')}</h1>
          <p className="text-muted mt-1">{t('players.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {players.length === 0 && !loading && (
             <button className="btn btn-secondary" onClick={handleSeed}>
                <RefreshCw size={20} />
                Cargar Demo (AC Milan)
             </button>
          )}
          <button className="btn btn-primary">
            <Plus size={20} />
            {t('players.newPlayer')}
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-center" style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: '1', maxWidth: '400px' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={20} />
          <input 
            type="text" 
            placeholder={t('players.search')}
            style={{ width: '100%', paddingLeft: '2.75rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-outline">
          <Filter size={20} />
          {t('players.filters')}
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-muted">Cargando jugadores desde Supabase...</div>
      ) : (
        <div className="player-grid">
          {filteredPlayers.map(player => (
            <div 
              key={player.id} 
              className="player-card"
              onClick={() => navigate(`/team/player/${player.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="player-card-header">
                <button 
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: 'white', opacity: 0.8 }}
                  onClick={(e) => { e.stopPropagation(); }}
                >
                  <MoreVertical size={20} />
                </button>
              </div>
              
              <div className="player-card-body">
                <div className="player-avatar-container">
                  <img 
                    src={player.photo_url || `https://ui-avatars.com/api/?name=${player.first_name}+${player.last_name}&background=db0030&color=fff`} 
                    alt={`${player.first_name} ${player.last_name}`} 
                    className="player-avatar"
                  />
                </div>
                
                <div className="player-kit-number">
                  {player.kit_number}
                </div>

                <div className="player-info">
                  <h3 className="player-name">
                    {player.first_name} {player.last_name}
                  </h3>
                  <p className="player-position">
                    {player.main_position}
                  </p>
                  
                  <div className="player-stats">
                    <div className="stat-item">
                      <span className="stat-label">{t('players.age')}</span>
                      <span className="stat-value">
                        {Math.floor((new Date().getTime() - new Date(player.birth_date).getTime()) / 3.15576e+10)} {t('players.age')}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">{t('players.foot')}</span>
                      <span className="stat-value">
                        {player.dominant_foot}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">{t('players.nationality')}</span>
                      <span className="stat-value">{player.nationality}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamList;
