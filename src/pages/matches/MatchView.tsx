import { useParams, useNavigate } from 'react-router-dom';
import { mockMatches } from '../../data/mockMatches';
import { mockPlayers } from '../../data/mockPlayers';
import { ArrowLeft, Play, Users, MapPin, Calendar, CheckSquare } from 'lucide-react';

const MatchView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const match = mockMatches.find(m => m.id === id);

  if (!match) {
    return <div className="p-6">Partido no encontrado</div>;
  }

  return (
    <div className="animate-fade-in p-6">
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-4 items-center">
          <button className="btn btn-outline p-2 rounded-full" onClick={() => navigate('/matches')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="h1">{match.isHome ? 'Local' : 'Visitante'} vs {match.opponent}</h1>
            <p className="text-muted mt-1">{match.competition} • {match.season}</p>
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate(`/matches/${match.id}/live`)}
          style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
        >
          <Play size={18} fill="currentColor" />
          Modo Directo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card md:col-span-2">
          <h3 className="h3 mb-4 flex items-center gap-2"><CheckSquare size={18} /> Convocatoria y Alineación</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2 text-sm text-muted uppercase">Titulares</h4>
              <div className="flex flex-col gap-2">
                {match.lineup.map(pid => {
                  const p = mockPlayers.find(pl => pl.id === pid);
                  return (
                    <div key={pid} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                        {p?.kitNumber}
                      </div>
                      <span className="font-medium">{p?.firstName} {p?.lastName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-sm text-muted uppercase">Banquillo</h4>
              <div className="flex flex-col gap-2">
                {match.callup.filter(id => !match.lineup.includes(id)).map(pid => {
                  const p = mockPlayers.find(pl => pl.id === pid);
                  return (
                    <div key={pid} className="flex items-center gap-3 p-2 border border-gray-100 dark:border-gray-800 rounded">
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center text-xs font-bold">
                        {p?.kitNumber}
                      </div>
                      <span className="text-muted">{p?.firstName} {p?.lastName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card">
            <h3 className="h3 mb-4">Información</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-3 text-muted">
                <Calendar size={18} />
                <span>{new Date(match.date).toLocaleDateString()} a las {match.time}</span>
              </div>
              <div className="flex items-center gap-3 text-muted">
                <MapPin size={18} />
                <span>{match.stadium}</span>
              </div>
              <div className="flex items-center gap-3 text-muted">
                <Users size={18} />
                <span>Staff: {match.staff.length} miembros</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchView;
