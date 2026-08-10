
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
  viewMode?: 'grid' | 'list';
  isEditMode?: boolean;
}

export const getFlagEmoji = (countryName?: string) => {
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
    'paises bajos': '🇳🇱', 'países bajos': '🇳🇱', 'holanda': '🇳🇱', 'netherlands': '🇳🇱',
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
    'surinam': '🇸🇷', 'suriname': '🇸🇷',
    'bulgaria': '🇧🇬',
    'eslovenia': '🇸🇮', 'slovenia': '🇸🇮',
  };
  return flags[name] || '';
};

export const getPositionColor = (position?: string) => {
  if (!position || position === 'Sin definir') return 'bg-gray-100 text-gray-700 border-gray-200';
  const pos = position.toLowerCase();
  if (pos.includes('portero') || pos.includes('arquero')) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (pos.includes('defensa') || pos.includes('lateral') || pos.includes('central') || pos.includes('carrilero')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (pos.includes('centrocampista') || pos.includes('medio') || pos.includes('pivote') || pos.includes('mediapunta') || pos.includes('volante')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (pos.includes('delantero') || pos.includes('extremo') || pos.includes('punta') || pos.includes('atacante')) return 'bg-rose-100 text-rose-800 border-rose-200';
  
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

export default function PlayersManagementView({ players, onUpdatePlayer, onDeletePlayer, viewMode = 'grid', isEditMode = false }: PlayersManagementViewProps) {
  const navigate = useNavigate();

  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm mt-6 animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
              <tr>
                <th className="px-6 py-3 font-semibold">Jugador</th>
                <th className="px-6 py-3 font-semibold">Posición</th>
                <th className="px-6 py-3 font-semibold">Edad</th>
                <th className="px-6 py-3 font-semibold">Pie Dominante</th>
                <th className="px-6 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {players.map(player => (
                <tr 
                  key={player.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors group"
                  onClick={() => navigate(`/players/${player.id}${window.location.search}`)}
                >
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img 
                        src={player.avatar} 
                        alt={player.name}
                        className="w-10 h-10 rounded-full object-cover bg-gray-100 border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100';
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                          {player.footballName || player.name}
                          {player.nationality && (
                            <span title={player.nationality} className="text-base leading-none">
                              {getFlagEmoji(player.nationality)}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-gray-600">
                    <span className={`px-2.5 py-1 text-xs rounded-lg font-medium border ${getPositionColor(player.position)}`}>
                      {player.position}
                    </span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-gray-600">
                    {player.age ? `${player.age} años` : '-'}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    {player.dominantFoot ? (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        {player.dominantFoot}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isEditMode && onUpdatePlayer && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onUpdatePlayer(player); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar jugador"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {isEditMode && onDeletePlayer && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeletePlayer(player.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Eliminar jugador"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-3 animate-fade-in mt-6">
      {players.map(player => (
        <div 
          key={player.id} 
          onClick={() => navigate(`/players/${player.id}${window.location.search}`)}
          className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-red-500/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col relative"
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
            
            {isEditMode && (
              <div className="absolute top-2 right-2 flex gap-1.5">
                {onUpdatePlayer && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdatePlayer(player); }}
                    className="p-1.5 bg-white/90 hover:bg-white text-gray-700 hover:text-blue-600 rounded-md backdrop-blur-md transition-colors shadow-sm"
                    title="Editar jugador"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
                {onDeletePlayer && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeletePlayer(player.id); }}
                    className="p-1.5 bg-white/90 hover:bg-white text-gray-700 hover:text-red-600 rounded-md backdrop-blur-md transition-colors shadow-sm"
                    title="Eliminar jugador"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Datos */}
          <div className="p-2 flex flex-col items-center justify-center text-center bg-white border-t border-gray-100">
            <div className="w-full flex items-center justify-center gap-1">
              <h3 className="text-xs font-extrabold text-gray-900 truncate max-w-[85%]">{player.footballName || player.name}</h3>
              {player.nationality && (
                <span title={player.nationality} className="text-xs flex-shrink-0 leading-none">
                  {getFlagEmoji(player.nationality)}
                </span>
              )}
            </div>
            <div className="mt-1">
              <span className={`px-1.5 py-0.5 text-[9px] rounded border font-bold ${getPositionColor(player.position)}`}>
                {player.position}
              </span>
            </div>
            <div className="flex items-center justify-center mt-1 gap-1.5">
              <span className="text-gray-500 font-medium text-[10px]">{player.age ? `${player.age}a` : '-'}</span>
              {player.dominantFoot && (
                <span className="px-1 text-gray-500 text-[9px] rounded-sm border border-gray-200 uppercase tracking-wider font-bold bg-gray-50">
                  {player.dominantFoot.charAt(0)}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
