import React from 'react';
import type { Player, DevTask, MedicalRecord, SportsStats } from '../types';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2 } from 'lucide-react';

export interface PlayersManagementViewProps {
  players: Player[];
  onAddPlayer?: (player: Player) => void;
  onUpdatePlayer?: (player: Player) => void;
  onDeletePlayer?: (id: string) => void;
  tasks?: DevTask[];
  onAddTask?: (task: DevTask) => void;
  onUpdateTaskProgress?: (id: string, progress: number) => void;
  onAddTaskComment?: (taskId: string, comment: string) => void;
  onUpdateTask?: (task: DevTask) => void;
  medicals?: Record<string, MedicalRecord>;
  onUpdateMedical?: (medical: MedicalRecord) => void;
  stats?: Record<string, SportsStats>;
  onUpdateStats?: (playerId: string, stats: SportsStats) => void;
  activeRole?: string;
  language?: string;
}

const getFlagEmoji = (countryName?: string) => {
  if (!countryName) return '';
  const name = countryName.toLowerCase().trim();
  const flags: Record<string, string> = {
    'españa': '🇪🇸', 'spain': '🇪🇸',
    'argentina': '🇦🇷',
    'brasil': '🇧🇷', 'brazil': '🇧🇷',
    'francia': '🇫🇷', 'france': '🇫🇷',
    'italia': '🇮🇹', 'italy': '🇮🇹',
    'alemania': '🇩🇪', 'germany': '🇩🇪',
    'portugal': '🇵🇹',
    'inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'england': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'marruecos': '🇲🇦', 'morocco': '🇲🇦',
    'uruguay': '🇺🇾',
    'colombia': '🇨🇴',
    'chile': '🇨🇱',
    'mexico': '🇲🇽', 'méxico': '🇲🇽',
    'senegal': '🇸🇳',
    'ghana': '🇬🇭',
    'camerun': '🇨🇲', 'camerún': '🇨🇲',
    'costa de marfil': '🇨🇮',
    'mali': '🇲🇱', 'malí': '🇲🇱',
    'estados unidos': '🇺🇸', 'usa': '🇺🇸',
    'paises bajos': '🇳🇱', 'holanda': '🇳🇱', 'netherlands': '🇳🇱',
    'bélgica': '🇧🇪', 'belgica': '🇧🇪',
    'suecia': '🇸🇪', 'sweden': '🇸🇪',
    'suiza': '🇨🇭', 'switzerland': '🇨🇭',
    'croacia': '🇭🇷', 'croatia': '🇭🇷',
    'serbia': '🇷🇸',
    'polonia': '🇵🇱', 'poland': '🇵🇱',
    'dinamarca': '🇩🇰', 'denmark': '🇩🇰',
    'japón': '🇯🇵', 'japon': '🇯🇵', 'japan': '🇯🇵',
    'corea del sur': '🇰🇷', 'south korea': '🇰🇷',
    'gales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    'escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'nigeria': '🇳🇬',
    'argelia': '🇩🇿', 'algeria': '🇩🇿',
    'egipto': '🇪🇬', 'egypt': '🇪🇬',
    'grecia': '🇬🇷', 'greece': '🇬🇷',
    'turquía': '🇹🇷', 'turquia': '🇹🇷', 'turkey': '🇹🇷',
    'austria': '🇦🇹',
    'república checa': '🇨🇿', 'republica checa': '🇨🇿', 'czech republic': '🇨🇿',
    'rumania': '🇷🇴', 'romania': '🇷🇴',
    'ucrania': '🇺🇦', 'ukraine': '🇺🇦',
    'ecuador': '🇪🇨',
    'perú': '🇵🇪', 'peru': '🇵🇪',
    'paraguay': '🇵🇾',
    'venezuela': '🇻🇪',
    'bolivia': '🇧🇴',
  };
  return flags[name] || '';
};

export default function PlayersManagementView({ players, onUpdatePlayer, onDeletePlayer }: PlayersManagementViewProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in mt-6">
      {players.map(player => (
        <div 
          key={player.id} 
          onClick={() => navigate(`/players/${player.id}`)}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:border-red-500/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col relative"
        >
          {/* Foto */}
          <div className="w-full aspect-square relative bg-gray-50 flex items-center justify-center overflow-hidden">
            <img 
              src={player.avatar} 
              alt={player.name}
              className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400';
              }}
            />
            
            <div className="absolute top-3 right-3 flex gap-2">
              {onUpdatePlayer && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdatePlayer(player); }}
                  className="p-1.5 bg-white/90 hover:bg-white text-gray-700 hover:text-blue-600 rounded-md backdrop-blur-md transition-colors shadow-sm"
                  title="Editar jugador"
                >
                  <Edit2 size={16} />
                </button>
              )}
              {onDeletePlayer && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeletePlayer(player.id); }}
                  className="p-1.5 bg-white/90 hover:bg-white text-gray-700 hover:text-red-600 rounded-md backdrop-blur-md transition-colors shadow-sm"
                  title="Eliminar jugador"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
          
          {/* Datos */}
          <div className="p-4 flex flex-col items-center justify-center text-center bg-white border-t border-gray-100">
            <div className="w-full flex items-center justify-center gap-1.5">
              <h3 className="text-lg font-extrabold text-gray-900 truncate max-w-[85%]">{player.name}</h3>
              {player.nationality && (
                <span title={player.nationality} className="text-base flex-shrink-0 leading-none">
                  {getFlagEmoji(player.nationality)}
                </span>
              )}
            </div>
            <div className="flex flex-col items-center mt-1 gap-1">
              <p className="text-gray-500 font-medium text-sm">{player.age ? `${player.age} años` : '-'}</p>
              {player.dominantFoot && (
                <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded-full border border-gray-200">
                  Pie: {player.dominantFoot}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
