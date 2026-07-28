import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { MatchEvent } from '../../data/mockMatches';
import { mockMatches } from '../../data/mockMatches';
import { mockPlayers } from '../../data/mockPlayers';
import PitchGraph from '../../components/matches/PitchGraph';
import { ArrowLeft, Activity, Check, X, AlertCircle, Target } from 'lucide-react';

const LiveTracker = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match] = useState(mockMatches.find(m => m.id === id));
  
  // State for recording a new event
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{x: number, y: number} | null>(null);
  
  // Local list of events for immediate feedback
  const [events, setEvents] = useState<MatchEvent[]>(match?.events || []);

  if (!match) {
    return <div className="p-6">Partido no encontrado</div>;
  }

  const handlePitchClick = (x: number, y: number) => {
    setCoordinates({ x, y });
  };

  const registerEvent = (type: string, outcome: 'Success' | 'Failure' | 'Neutral') => {
    if (!coordinates) {
      alert("Toca el campo primero para marcar dónde ocurrió la acción");
      return;
    }

    const newEvent: MatchEvent = {
      id: `ev-${Date.now()}`,
      matchId: match.id,
      playerId: selectedPlayer || undefined,
      staffId: 'current-user',
      timestamp: '45:00', // Mock time
      minute: 45,
      type,
      outcome,
      coordinates
    };

    setEvents(prev => [newEvent, ...prev]);
    // Reset selection after recording
    setCoordinates(null);
    setSelectedPlayer(null);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      
      {/* Left Sidebar: Feed & Players */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full z-10 shadow-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
           <button className="flex items-center gap-2 text-primary text-sm font-medium hover:underline mb-4" onClick={() => navigate(`/matches/${match.id}`)}>
             <ArrowLeft size={16} /> Salir del Directo
           </button>
           <h2 className="text-lg font-bold truncate">{match.opponent}</h2>
           <div className="flex justify-between mt-1 text-sm text-muted">
             <span>Min: 45:00</span>
             <span className="font-bold text-red-600 animate-pulse flex items-center gap-1"><Activity size={14}/> EN VIVO</span>
           </div>
        </div>

        {/* Player Selection */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
           <h3 className="text-xs uppercase font-bold text-muted mb-2">1. Selecciona Jugador</h3>
           <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
             <button 
                onClick={() => setSelectedPlayer(null)}
                className={`flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full font-bold text-sm border-2 transition-all ${
                  selectedPlayer === null ? 'bg-primary text-white border-primary' : 'bg-gray-100 dark:bg-gray-700 border-transparent text-gray-500'
                }`}
              >
                EQP
              </button>
             {match.lineup.map(pid => {
               const p = mockPlayers.find(pl => pl.id === pid);
               return (
                 <button 
                   key={pid}
                   onClick={() => setSelectedPlayer(pid)}
                   className={`flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full font-bold text-sm border-2 transition-all ${
                     selectedPlayer === pid ? 'bg-primary text-white border-primary scale-110' : 'bg-gray-100 dark:bg-gray-700 border-transparent'
                   }`}
                 >
                   {p?.kitNumber}
                 </button>
               );
             })}
           </div>
        </div>

        {/* Live Event Feed */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <h3 className="text-xs uppercase font-bold text-muted mb-1 sticky top-0 bg-white dark:bg-gray-800 pb-2">Historial</h3>
          {events.length === 0 ? (
            <p className="text-sm text-center text-muted mt-10">Esperando eventos...</p>
          ) : (
            events.map(ev => {
              const p = mockPlayers.find(pl => pl.id === ev.playerId);
              return (
                <div key={ev.id} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700 text-sm animate-fade-in flex flex-col gap-1">
                   <div className="flex justify-between">
                     <span className="font-bold">{ev.type}</span>
                     <span className="text-muted text-xs">{ev.timestamp}'</span>
                   </div>
                   <div className="flex justify-between items-center mt-1">
                     <span className="text-muted text-xs">{p ? `${p.firstName} ${p.lastName}` : 'Equipo'}</span>
                     {ev.outcome === 'Success' && <Check size={14} className="text-green-500" />}
                     {ev.outcome === 'Failure' && <X size={14} className="text-red-500" />}
                   </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Area: Pitch & Action Buttons */}
      <div className="flex-1 flex flex-col">
        {/* Step 2 indicator */}
        <div className="p-4 flex justify-center bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {!coordinates ? (
               <><span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span> Toca el campo</>
            ) : (
               <><span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span> Selecciona la acción</>
            )}
          </h2>
        </div>

        {/* Pitch Area */}
        <div className="flex-1 p-8 flex items-center justify-center overflow-hidden">
          <div className="w-full max-w-4xl relative">
            <PitchGraph onPitchClick={handlePitchClick} events={events} />
            
            {/* Blinking indicator for current selected coordinates before action */}
            {coordinates && (
              <div 
                style={{
                  position: 'absolute',
                  left: `${coordinates.x}%`,
                  top: `${coordinates.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-white shadow-lg animate-ping pointer-events-none"
              />
            )}
          </div>
        </div>

        {/* Action Panel (Shows up vividly when coordinate is selected) */}
        <div className={`transition-all duration-300 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${coordinates ? 'opacity-100 translate-y-0 h-64' : 'opacity-50 translate-y-4 h-32 pointer-events-none'}`}>
           <div className="p-4 h-full flex flex-col">
             <div className="grid grid-cols-4 gap-3 flex-1">
                {/* Positive Actions */}
                <button onClick={() => registerEvent('Pase', 'Success')} className="btn bg-green-50 hover:bg-green-100 text-green-700 border-green-200 flex flex-col gap-1 items-center justify-center p-2 h-full">
                  <Check size={24} /> Pase Correcto
                </button>
                <button onClick={() => registerEvent('Recuperación', 'Success')} className="btn bg-green-50 hover:bg-green-100 text-green-700 border-green-200 flex flex-col gap-1 items-center justify-center p-2 h-full">
                  <Check size={24} /> Recuperación
                </button>
                <button onClick={() => registerEvent('Tiro a puerta', 'Success')} className="btn bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 flex flex-col gap-1 items-center justify-center p-2 h-full font-bold">
                  <Target size={24} /> Tiro
                </button>
                <button onClick={() => registerEvent('Gol', 'Success')} className="btn bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-yellow-300 flex flex-col gap-1 items-center justify-center p-2 h-full font-bold text-lg">
                  ⚽️ GOL
                </button>

                {/* Negative Actions */}
                <button onClick={() => registerEvent('Pase fallado', 'Failure')} className="btn bg-red-50 hover:bg-red-100 text-red-700 border-red-200 flex flex-col gap-1 items-center justify-center p-2 h-full">
                  <X size={24} /> Pase Fallado
                </button>
                <button onClick={() => registerEvent('Pérdida', 'Failure')} className="btn bg-red-50 hover:bg-red-100 text-red-700 border-red-200 flex flex-col gap-1 items-center justify-center p-2 h-full">
                  <X size={24} /> Pérdida
                </button>
                <button onClick={() => registerEvent('Falta', 'Neutral')} className="btn bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 flex flex-col gap-1 items-center justify-center p-2 h-full">
                  <AlertCircle size={24} /> Falta Cometida
                </button>
                <button onClick={() => registerEvent('Tarjeta', 'Failure')} className="btn bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300 flex flex-col gap-1 items-center justify-center p-2 h-full">
                  🟨 Tarjeta
                </button>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default LiveTracker;
