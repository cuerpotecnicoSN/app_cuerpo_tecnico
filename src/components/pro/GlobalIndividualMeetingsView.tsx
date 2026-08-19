import { useState, useEffect, useMemo } from 'react';
import { Plus, Users2, MapPin, Search, Trash2, CalendarDays, ChevronRight, BarChart2, List } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { MeetingDB, Player } from '../types';
import { getMeetings, createMeeting, updateMeeting, deleteMeeting, addMeetingPlayer } from '../../services/meetings';
import { supabase } from '../../lib/supabase';
import RichTextEditor from '../common/RichTextEditor';
import { extractFeedbackFromHtml } from '../../utils/feedbackExtractor';

interface GlobalIndividualMeetingsViewProps {
  players: Player[];
}

export default function GlobalIndividualMeetingsView({ players }: GlobalIndividualMeetingsViewProps) {
  const [meetings, setMeetings] = useState<MeetingDB[]>([]);
  const [meetingPlayersMap, setMeetingPlayersMap] = useState<Record<string, string[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlayerId, setFilterPlayerId] = useState('');
  const [filterCoach, setFilterCoach] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'list' | 'summary'>('list');
  const [summaryPlayerId, setSummaryPlayerId] = useState<string>('');

  // Form State
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [coach, setCoach] = useState('');
  const [objective, setObjective] = useState('');
  const [development, setDevelopment] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const allMeetings = await getMeetings('individual');
      setMeetings(allMeetings);

      const { data: mpData } = await supabase.from('meeting_players').select('*');
      if (mpData) {
        const map: Record<string, string[]> = {};
        mpData.forEach((mp: any) => {
          if (!map[mp.meeting_id]) map[mp.meeting_id] = [];
          map[mp.meeting_id].push(mp.player_id);
        });
        setMeetingPlayersMap(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditClick = (m: MeetingDB, playerId: string) => {
    setEditingId(m.id);
    setSelectedPlayerId(playerId);
    setDate(m.date || new Date().toISOString().split('T')[0]);
    setTime(m.time || '');
    setLocation(m.location || '');
    setCoach(m.created_by || '');
    setObjective(m.objective || '');
    setDevelopment(m.development || '');
    
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedPlayerId('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('');
    setLocation('');
    setObjective('');
    setDevelopment('');
    setCoach('');
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!date || !selectedPlayerId) return;
    try {
      if (editingId) {
        await updateMeeting(editingId, {
          date,
          time,
          location,
          objective,
          development,
          created_by: coach
        });
        // We assume the player doesn't change during edit, or we would need to update meeting_players
      } else {
        const m = await createMeeting({ 
          type: 'individual', 
          date, 
          time, 
          location, 
          objective, 
          development,
          created_by: coach
        });
        await addMeetingPlayer(m.id, selectedPlayerId);
      }
      resetForm();
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la reunión');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar esta reunión?')) {
      try {
        await deleteMeeting(id);
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getPlayerName = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || 'Jugador eliminado';
  };

  const getPlayerAvatar = (playerId: string) => {
    return players.find(p => p.id === playerId)?.avatar || '';
  };

  const filteredMeetings = meetings.filter(m => {
    // Texto general
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const pIds = meetingPlayersMap[m.id] || [];
      const pNames = pIds.map(id => getPlayerName(id).toLowerCase()).join(' ');
      if (!((m.objective || '').toLowerCase().includes(q) ||
          (m.created_by || '').toLowerCase().includes(q) ||
          (m.location || '').toLowerCase().includes(q) ||
          pNames.includes(q))) {
        return false;
      }
    }

    // Jugador
    if (filterPlayerId) {
      const pIds = meetingPlayersMap[m.id] || [];
      if (!pIds.includes(filterPlayerId)) return false;
    }

    // Entrenador
    if (filterCoach) {
      if ((m.created_by || '') !== filterCoach) return false;
    }

    // Mes (Formato YYYY-MM)
    if (filterMonth) {
      if (!m.date || !m.date.startsWith(filterMonth)) return false;
    }

    // Día exacto (Formato YYYY-MM-DD)
    if (filterDate) {
      if (m.date !== filterDate) return false;
    }

    return true;
  });

  // Opciones para los filtros
  const uniqueCoaches = useMemo(() => {
    const coaches = new Set<string>();
    meetings.forEach(m => {
      if (m.created_by) coaches.add(m.created_by);
    });
    return Array.from(coaches).sort();
  }, [meetings]);

  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    meetings.forEach(m => {
      if (m.date) months.add(m.date.substring(0, 7)); // YYYY-MM
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a)); // Descendente
  }, [meetings]);

  const formatMonthName = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  };

  // Agrupar reuniones por jugador para el panel de resumen
  const playerSummaries = useMemo(() => {
    const map = new Map<string, MeetingDB[]>();
    meetings.forEach(m => {
      const pIds = meetingPlayersMap[m.id] || [];
      const pId = pIds[0];
      if (pId) {
        if (!map.has(pId)) map.set(pId, []);
        map.get(pId)!.push(m);
      }
    });

    const summaries = Array.from(map.entries()).map(([playerId, mList]) => {
      // Ordenar por fecha más reciente
      mList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const lastMeeting = mList[0];
      return {
        playerId,
        count: mList.length,
        lastDate: lastMeeting.date,
        lastObjective: lastMeeting.objective,
        lastDevelopment: lastMeeting.development
      };
    });

    // Ordenar resúmenes por los jugadores con reuniones más recientes
    return summaries.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
  }, [meetings, meetingPlayersMap]);


  return (
    <div className="w-full mx-auto h-full animate-fade-in pb-8 flex flex-col mt-4">
      
      {/* TABS */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-fit mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
        >
          <List size={18} /> Listado de Reuniones
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
        >
          <BarChart2 size={18} /> Resumen por Jugador
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="flex flex-col xl:flex-row gap-6">
          
          {/* LADO IZQUIERDO: LISTA Y FORMULARIO */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar general..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <button 
            onClick={() => {
              if (showForm) resetForm();
              else setShowForm(true);
            }} 
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all transform hover:scale-[1.02] shrink-0"
          >
            <Plus size={18} className={showForm ? 'rotate-45 transition-transform' : 'transition-transform'} /> 
            {showForm ? 'Cancelar' : 'Agendar Reunión'}
          </button>
        </div>

        {/* Filtros avanzados */}
        {!showForm && (
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-3 items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Filtros:</span>
            
            <select
              value={filterPlayerId}
              onChange={(e) => setFilterPlayerId(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Jugador (Todos)</option>
              {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={filterCoach}
              onChange={(e) => setFilterCoach(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Entrenador (Todos)</option>
              {uniqueCoaches.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                if (e.target.value) setFilterDate(''); // Reset exact date if month is selected
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Mes (Todos)</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m}>{formatMonthName(m)}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  if (e.target.value) setFilterMonth(''); // Reset month if exact date is selected
                }}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
              />
            </div>

            {(filterPlayerId || filterCoach || filterMonth || filterDate) && (
              <button 
                onClick={() => {
                  setFilterPlayerId('');
                  setFilterCoach('');
                  setFilterMonth('');
                  setFilterDate('');
                }}
                className="text-xs text-red-500 hover:text-red-700 font-bold ml-auto px-2"
              >
                Limpiar
              </button>
            )}
          </div>
        )}

        {showForm && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xl shadow-blue-900/5 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
              <Users2 className="text-blue-500" size={20} />
              {editingId ? 'Editar Reunión' : 'Nueva Reunión Individual'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col gap-1.5 xl:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Jugador *</label>
                <select 
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  disabled={!!editingId} // No permitimos cambiar el jugador si estamos editando (simplificación)
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-60"
                  required
                >
                  <option value="">-- Seleccionar jugador --</option>
                  {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha *</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hora</label>
                <input 
                  type="time" 
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lugar</label>
                <input 
                  type="text" 
                  placeholder="Ej. Despacho Míster..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Entrenador/es a cargo</label>
                <input 
                  type="text" 
                  placeholder="Ej. Míster y Segundo Entrenador"
                  value={coach}
                  onChange={(e) => setCoach(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex flex-col gap-1.5 h-full">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contenido / Tema principal</label>
                <div className="h-full min-h-[250px]">
                  <RichTextEditor 
                    value={objective}
                    onChange={setObjective}
                    placeholder="Motivo de la reunión..."
                    className="h-full"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5 h-full">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Observaciones / Notas</label>
                <div className="h-full min-h-[250px]">
                  <RichTextEditor 
                    value={development}
                    onChange={setDevelopment}
                    placeholder="Conclusiones, desarrollo..."
                    className="h-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-100 mt-4">
              {editingId ? (
                <button 
                  onClick={() => handleDelete(editingId)}
                  className="px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} /> Eliminar
                </button>
              ) : <div></div>}
              <div className="flex gap-3">
                <button 
                  onClick={resetForm} 
                  className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={!date || !selectedPlayerId}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                >
                  {editingId ? 'Guardar Cambios' : 'Agendar Reunión'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No hay reuniones</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchQuery 
                ? 'No se han encontrado reuniones que coincidan con tu búsqueda.' 
                : 'Aún no has agendado ninguna reunión individual con tus jugadores.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredMeetings.map(m => {
              const pIds = meetingPlayersMap[m.id] || [];
              const primaryPlayerId = pIds[0];
              const pName = primaryPlayerId ? getPlayerName(primaryPlayerId) : 'Sin asignar';
              const pAvatar = primaryPlayerId ? getPlayerAvatar(primaryPlayerId) : '';

              return (
                <div 
                  key={m.id} 
                  onClick={() => handleEditClick(m, primaryPlayerId)}
                  className={`bg-white border cursor-pointer ${editingId === m.id ? 'border-blue-400 shadow-md ring-2 ring-blue-50' : 'border-gray-100 hover:border-blue-300 hover:shadow-md'} rounded-2xl p-5 shadow-sm transition-all group relative flex items-center justify-between gap-5`}
                >
                  
                  {/* Info Jugador */}
                  <div className="flex items-center gap-4 flex-1">
                    {pAvatar ? (
                      <img src={pAvatar} alt={pName} className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100 shadow-sm">
                        {pName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-gray-900 text-[15px] leading-tight">{pName}</h4>
                      {m.created_by && <span className="text-xs text-gray-500 mt-0.5 block">Entrenador: {m.created_by}</span>}
                    </div>
                  </div>
                  
                  {/* Meta (Fecha, Hora, Lugar) */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <CalendarDays size={14} className="text-blue-500" />
                      <span className="font-medium">{m.date} {m.time ? <span className="text-gray-400 font-normal">| {m.time}</span> : ''}</span>
                    </div>
                    {m.location && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
                        <MapPin size={12} className="text-rose-500" />
                        <span>{m.location}</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LADO DERECHO: PANEL DE RESUMEN POR JUGADOR */}
      <div className="w-full xl:w-96 flex-shrink-0">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden sticky top-6">
          <div className="bg-gray-50 border-b border-gray-200 p-5">
            <h3 className="font-black text-gray-900 flex items-center gap-2">
              <Users2 className="text-blue-600" size={20} />
              Resumen por Jugador
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Información acumulada de las últimas reuniones individuales.
            </p>
          </div>

          <div className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {playerSummaries.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No hay datos acumulados todavía.
              </div>
            ) : (
              <div className="space-y-1">
                {playerSummaries.map((summary) => {
                  const pName = getPlayerName(summary.playerId);
                  const pAvatar = getPlayerAvatar(summary.playerId);

                  return (
                    <div key={summary.playerId} className="p-3 hover:bg-gray-50 rounded-xl transition-colors group cursor-default">
                      <div className="flex items-center gap-3">
                        {pAvatar ? (
                          <img src={pAvatar} alt={pName} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                            {pName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 truncate">{pName}</h4>
                          <p className="text-xs text-blue-600 font-medium">
                            {summary.count} {summary.count === 1 ? 'reunión' : 'reuniones'} 
                            <span className="text-gray-400 mx-1">•</span> 
                            <span className="text-gray-500 font-normal">Última: {summary.lastDate}</span>
                          </p>
                        </div>
                      </div>

                      {/* Snippet de la última reunión (sanitizado) */}
                      {(summary.lastDevelopment || summary.lastObjective) && (
                        <div className="mt-3 pl-13 pr-2">
                          <div className="bg-gray-100/80 rounded-lg p-2.5 text-xs text-gray-600 border border-gray-200/50">
                            <div className="flex gap-1.5 items-start">
                              <ChevronRight size={14} className="text-gray-400 shrink-0 mt-0.5" />
                              <div 
                                className="line-clamp-3 prose prose-sm max-w-none prose-p:my-0 prose-headings:my-0 text-xs"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(summary.lastDevelopment || summary.lastObjective || '') }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
          </div>
        </div>
      ) : (
        <PlayerSummaryView 
          players={players}
          meetings={meetings}
          meetingPlayersMap={meetingPlayersMap}
          summaryPlayerId={summaryPlayerId}
          setSummaryPlayerId={setSummaryPlayerId}
        />
      )}
    </div>
  );
}

function PlayerSummaryView({ players, meetings, meetingPlayersMap, summaryPlayerId, setSummaryPlayerId }: { 
  players: Player[]; 
  meetings: MeetingDB[]; 
  meetingPlayersMap: Record<string, string[]>;
  summaryPlayerId: string;
  setSummaryPlayerId: (id: string) => void;
}) {
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || '';

  // Calculate feedback data for selected player
  const feedbackData = useMemo(() => {
    if (!summaryPlayerId) return null;
    let totalPositives = 0;
    let totalNegatives = 0;
    const items: { date: string; type: 'positive' | 'negative'; text: string }[] = [];

    const playerMeetings = meetings.filter(m => (meetingPlayersMap[m.id] || []).includes(summaryPlayerId));

    playerMeetings.forEach(m => {
      const extracted = extractFeedbackFromHtml(m.objective || '', m.development || '');

      if (extracted.positives.length > 0) {
        totalPositives += extracted.positives.length;
        extracted.positives.forEach(text => items.push({ date: m.date, type: 'positive', text }));
      }
      if (extracted.negatives.length > 0) {
        totalNegatives += extracted.negatives.length;
        extracted.negatives.forEach(text => items.push({ date: m.date, type: 'negative', text }));
      }
    });

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const grouped: Record<string, typeof items> = {};
    items.forEach(i => {
      if (!grouped[i.date]) grouped[i.date] = [];
      grouped[i.date].push(i);
    });

    return { totalPositives, totalNegatives, grouped };
  }, [summaryPlayerId, meetings, meetingPlayersMap]);

  return (
    <div className="space-y-6 animate-fade-in bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Selecciona un Jugador</h3>
          <p className="text-sm text-gray-500">Visualiza el resumen histórico de sus reuniones</p>
        </div>
        <select
          value={summaryPlayerId}
          onChange={(e) => setSummaryPlayerId(e.target.value)}
          className="w-full md:w-64 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          <option value="">-- Jugador --</option>
          {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {!summaryPlayerId ? (
        <div className="py-20 text-center text-gray-400">
          <BarChart2 size={48} className="mx-auto mb-4 opacity-20" />
          <p>Selecciona un jugador en el menú desplegable para ver su resumen.</p>
        </div>
      ) : feedbackData ? (
        <div className="space-y-8 mt-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900">{getPlayerName(summaryPlayerId)}</h2>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider">Historial de Feedback</span>
          </div>

          {feedbackData.totalPositives === 0 && feedbackData.totalNegatives === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
              <p className="text-gray-500">No hay feedback registrado en las reuniones de este jugador todavía.</p>
            </div>
          ) : (
            <>
              {/* Gráfica */}
              <div className="max-w-2xl">
                <div className="flex justify-between mb-2 text-sm font-bold">
                  <span className="text-emerald-600">{feedbackData.totalPositives} Puntos Positivos</span>
                  <span className="text-red-600">{feedbackData.totalNegatives} Puntos A Mejorar</span>
                </div>
                <div className="h-5 w-full bg-gray-100 rounded-full overflow-hidden flex">
                  {feedbackData.totalPositives + feedbackData.totalNegatives > 0 && (
                    <>
                      <div style={{ width: `${(feedbackData.totalPositives / (feedbackData.totalPositives + feedbackData.totalNegatives)) * 100}%` }} className="bg-emerald-500"></div>
                      <div style={{ width: `${(feedbackData.totalNegatives / (feedbackData.totalPositives + feedbackData.totalNegatives)) * 100}%` }} className="bg-red-500"></div>
                    </>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-8 mt-10">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Detalle por Fecha</h4>
                {Object.entries(feedbackData.grouped).map(([date, items]) => (
                  <div key={date} className="relative pl-6 border-l-2 border-gray-100 pb-2">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500"></div>
                    <h5 className="font-bold text-gray-900 mb-4">{new Date(date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {items.filter(i => i.type === 'positive').length > 0 && (
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 shadow-sm">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block mb-3 flex items-center gap-2"><Plus size={14}/> Positivo</span>
                          <ul className="space-y-2.5">
                            {items.filter(i => i.type === 'positive').map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-emerald-900 font-medium">
                                <span className="text-emerald-500 mt-0.5 shrink-0">•</span> {item.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {items.filter(i => i.type === 'negative').length > 0 && (
                        <div className="bg-red-50/50 border border-red-100 rounded-xl p-5 shadow-sm">
                          <span className="text-xs font-bold uppercase tracking-wider text-red-600 block mb-3 flex items-center gap-2"><Trash2 size={14}/> A Mejorar</span>
                          <ul className="space-y-2.5">
                            {items.filter(i => i.type === 'negative').map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-red-900 font-medium">
                                <span className="text-red-500 mt-0.5 shrink-0">•</span> {item.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
