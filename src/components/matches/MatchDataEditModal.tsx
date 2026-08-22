import { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { MatchDataPoint, DataPointCoordinates } from '../types';
import PitchGraph from './PitchGraph';
import { useSupabaseData } from '../../hooks/useSupabaseData';

export interface DataCaptureConfig {
  needs_pitch?: boolean;
  needs_zones?: boolean;
  needs_players?: boolean;
  needs_player_selection?: boolean;
  needs_comments?: boolean;
  needs_outcome?: boolean;
}

interface MatchDataEditModalProps {
  dataPoint: MatchDataPoint;
  onSave: (updates: Partial<MatchDataPoint>) => Promise<void>;
  onClose: () => void;
  /** Qué se pide para este foco. Si no se pasa (o está vacío), se muestra todo. */
  config?: DataCaptureConfig;
}

export default function MatchDataEditModal({ dataPoint, onSave, onClose, config }: MatchDataEditModalProps) {
  const configured = !!config && Object.values(config).some(Boolean);
  const show = {
    pitch: !configured || !!config?.needs_pitch,
    zones: !configured || !!config?.needs_zones,
    players: !configured || !!config?.needs_players,
    playerSelect: !configured || !!config?.needs_player_selection,
    comments: !configured || !!config?.needs_comments,
    outcome: !configured || !!config?.needs_outcome,
  };
  const [minute, setMinute] = useState<number | ''>(dataPoint.minute ?? '');
  const [outcome, setOutcome] = useState(dataPoint.outcome);
  const [comments, setComments] = useState(dataPoint.comments || '');
  const [playerId, setPlayerId] = useState(dataPoint.player_id || '');
  const [coords, setCoords] = useState<DataPointCoordinates>(dataPoint.coordinates || {});
  
  const { data: dbPlayers } = useSupabaseData('players');
  
  // Local state for clicking two points to draw a line
  const [clickStep, setClickStep] = useState<'start' | 'end'>('start');
  
  const handlePitchClick = (x: number, y: number) => {
    if (clickStep === 'start') {
      setCoords({ ...coords, x, y, endX: undefined, endY: undefined });
      setClickStep('end');
    } else {
      setCoords({ ...coords, endX: x, endY: y });
      setClickStep('start');
    }
  };

  const clearCoords = () => {
    setCoords({});
    setClickStep('start');
  };

  const handleSave = async () => {
    await onSave({
      minute: minute === '' ? undefined : Number(minute),
      outcome,
      comments,
      player_id: playerId || null,
      coordinates: Object.keys(coords).length > 0 ? coords : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="font-extrabold text-gray-900 text-lg">Editar Registro: {dataPoint.type}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 space-y-6 flex-1">
          {/* Header Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Minuto</label>
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={minute} onChange={(e) => setMinute(e.target.value ? Number(e.target.value) : '')} />
            </div>
            {show.outcome && <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Resultado</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={outcome} onChange={(e) => setOutcome(e.target.value as any)}>
                <option value="Success">Éxito (Bien)</option>
                <option value="Neutral">Neutral</option>
                <option value="Failure">Fallo (Mal)</option>
              </select>
            </div>}
            {show.playerSelect && <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Jugador Implicado</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
                <option value="">— Ninguno / Todo el equipo —</option>
                {[...(dbPlayers || [])].sort((a:any,b:any) => String(a?.first_name || '').localeCompare(String(b?.first_name || ''))).map((p:any) => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>}
          </div>
          
          {/* Zonas y Jugadores */}
          {(show.zones || show.players) && <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
            <h4 className="text-sm font-bold text-gray-700">Detalles de Jugada</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {show.zones && <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Zona</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={coords.zone || ''} onChange={(e) => setCoords({...coords, zone: e.target.value})}>
                  <option value="">Ninguna</option>
                  <option value="Área Propia">Área Propia</option>
                  <option value="Fuera Área Propia">Fuera Área Propia</option>
                  <option value="Medio Campo Propio">Medio Campo Propio</option>
                  <option value="Medio Campo Rival">Medio Campo Rival</option>
                  <option value="Fuera Área Rival">Fuera Área Rival</option>
                  <option value="Área Rival">Área Rival</option>
                </select>
              </div>}
              {show.players && <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nº Ataque</label>
                <input type="text" placeholder="Ej. 4" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={coords.attackingPlayers || ''} onChange={(e) => setCoords({...coords, attackingPlayers: e.target.value})} />
              </div>}
              {show.players && <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nº Defensa / Rechace</label>
                <input type="text" placeholder="Ej. 3" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={coords.defendingPlayers || ''} onChange={(e) => setCoords({...coords, defendingPlayers: e.target.value})} />
              </div>}
            </div>
          </div>}

          {/* Pitch Interactive */}
          {show.pitch && <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Posición en Campo</label>
              <button onClick={clearCoords} className="text-xs text-red-500 hover:text-red-700 font-bold">Limpiar Campo</button>
            </div>
            <p className={`text-xs font-bold mb-2 ${clickStep === 'start' ? 'text-blue-600' : 'text-red-600'}`}>
              {clickStep === 'start' ? '1) Haz clic en el punto de inicio de la acción.' : '2) Haz clic en el punto final (dibuja la flecha) o deja solo el punto.'}
            </p>
            <div className="border-4 border-gray-200 rounded-xl overflow-hidden relative">
              <PitchGraph 
                onPitchClick={handlePitchClick}
                events={[]} // We will draw the custom points here as an overlay to support lines
              />
              {/* Overlay for current coordinate */}
              {coords.x != null && coords.y != null && (
                <div style={{ position: 'absolute', left: `${coords.x}%`, top: `${coords.y}%`, width: 14, height: 14, backgroundColor: '#3b82f6', borderRadius: '50%', transform: 'translate(-50%, -50%)', border: '2px solid white', pointerEvents: 'none' }} />
              )}
              {coords.endX != null && coords.endY != null && (
                 <div style={{ position: 'absolute', left: `${coords.endX}%`, top: `${coords.endY}%`, width: 14, height: 14, backgroundColor: '#ef4444', borderRadius: '50%', transform: 'translate(-50%, -50%)', border: '2px solid white', pointerEvents: 'none' }} />
              )}
              {coords.x != null && coords.y != null && coords.endX != null && coords.endY != null && (
                 <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                   <defs>
                     <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                       <polygon points="0 0, 10 3.5, 0 7" fill="black" />
                     </marker>
                   </defs>
                   <line x1={`${coords.x}%`} y1={`${coords.y}%`} x2={`${coords.endX}%`} y2={`${coords.endY}%`} stroke="black" strokeWidth="2" strokeDasharray="4" markerEnd="url(#arrowhead)" />
                 </svg>
              )}
            </div>
          </div>}

          {show.comments && <div>
             <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Comentarios Libres</label>
             <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={comments} onChange={(e) => setComments(e.target.value)} rows={2} />
          </div>}
        </div>
        
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
           <button onClick={onClose} className="px-4 py-2 text-gray-600 font-bold text-sm">Cancelar</button>
           <button onClick={handleSave} className="px-5 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg flex items-center gap-2 hover:bg-blue-700">
             <Check size={16} /> Guardar
           </button>
        </div>
      </div>
    </div>
  );
}
