import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Cake, Activity, Dumbbell, MessageCircle, Clock, Plus, X, Users2, Trash2 } from 'lucide-react';
import { getMatches, createMatch, deleteMatch } from '../../services/matches';
import { getTrainingSessions, createTrainingSession, deleteTrainingSession } from '../../services/training';
import { getMeetings, createMeeting, addMeetingPlayer, deleteMeeting } from '../../services/meetings';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { supabase } from '../../lib/supabase';

interface CalEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  type: 'match' | 'training' | 'meeting' | 'birthday' | 'dynamics';
  originalType?: string; // para saber si es individual o grupal en reuniones
  label: string;
  home_logo?: string;
  away_logo?: string;
  competition?: string;
  result_home?: number | null;
  result_away?: number | null;
  location?: string;
  coach?: string;
  objective?: string;
  playerName?: string;
}

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const { data: dbPlayers } = useSupabaseData<any>('players');
  const [hoveredEvent, setHoveredEvent] = useState<{event: CalEvent, x: number, y: number} | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [eventType, setEventType] = useState('Partido');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [opponent, setOpponent] = useState('');
  const [competition, setCompetition] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [meetingPlayerId, setMeetingPlayerId] = useState('');
  const [meetingCoach, setMeetingCoach] = useState('');

  const loadEvents = async () => {
    if (!dbPlayers) return;
    
    try {
      // Run sequentially to avoid multiple concurrent ensureContext() calls failing
      const matches = await getMatches().catch(e => { console.error('Matches error:', e); return []; });
      const sessions = await getTrainingSessions().catch(e => { console.error('Sessions error:', e); return []; });
      const meetings = await getMeetings().catch(e => { console.error('Meetings error:', e); return []; });
      let meetingLinksResult = { data: [] as any[] };
      try {
        meetingLinksResult = await supabase.from('meeting_players').select('*');
      } catch (e) {
        console.error('Meeting links error:', e);
      }
      
      const meetingLinks = meetingLinksResult.data || [];
      
      const getPlayerName = (meetingId: string) => {
         const link = meetingLinks.find((l: any) => l.meeting_id === meetingId);
         if (!link) return undefined;
         const p = dbPlayers.find((dp: any) => dp.id === link.player_id);
         if (p) return `${p.first_name} ${p.last_name}`;
         return undefined;
      };

      const evs: CalEvent[] = [
        ...matches.map((m) => ({ 
          id: m.id,
          date: m.date, 
          time: m.time, 
          type: 'match' as const, 
          label: m.is_home ? `AC Milan Sub-23 vs ${m.opponent}` : `${m.opponent} vs AC Milan Sub-23`,
          home_logo: m.home_logo,
          away_logo: m.away_logo,
          competition: m.competition,
          result_home: m.result_home,
          result_away: m.result_away,
          location: m.stadium
        })),
        ...sessions.map((s) => ({ 
          id: s.id,
          date: s.date, 
          time: s.time, 
          type: 'training' as const, 
          label: `ENTRENAMIENTO: ${s.title}`,
          location: s.location,
          objective: s.objective
        })),
        ...meetings.map((m) => ({ 
          id: m.id,
          date: m.date, 
          time: m.time, 
          type: (m.type === 'grupal' ? 'dynamics' : 'meeting') as const, 
          originalType: m.type,
          label: m.type === 'grupal' ? 'DINÁMICA' : 'REUNIÓN',
          location: m.location,
          objective: m.objective,
          coach: m.created_by,
          playerName: m.type === 'individual' ? getPlayerName(m.id) : undefined
        })),
      ];
      console.log("EVENTS LOADED:", evs); 
      setEvents(evs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [t, dbPlayers]);

  const handleAddEvent = async () => {
    if (!eventDate) return;
    try {
      if (eventType === 'Partido') {
        if (!opponent) return;
        await createMatch({
          date: eventDate,
          time: eventTime,
          opponent,
          competition,
          stadium: eventLocation,
          is_home: isHome,
          status: 'Scheduled'
        });
      } else if (eventType === 'Sesión entrenamiento') {
        await createTrainingSession({
          date: eventDate,
          time: eventTime,
          title: 'Entrenamiento',
          location: eventLocation
        });
      } else if (eventType === 'Reunión individual') {
        const m = await createMeeting({
          type: 'individual',
          date: eventDate,
          time: eventTime,
          location: eventLocation,
          objective: 'Reunión',
          created_by: meetingCoach
        });
        if (meetingPlayerId) {
          await addMeetingPlayer(m.id, meetingPlayerId);
        }
      } else if (eventType === 'Dinámicas') {
        await createMeeting({
          type: 'grupal',
          date: eventDate,
          time: eventTime,
          location: eventLocation,
          objective: 'Dinámica'
        });
      }
      setShowForm(false);
      setEventDate(''); setEventTime(''); setEventLocation(''); setOpponent(''); setCompetition('');
      setMeetingCoach(''); setMeetingPlayerId('');
      loadEvents();
    } catch (e) {
      console.error(e);
      alert('Error al crear evento');
    }
  };

  const birthdays = useMemo<CalEvent[]>(() => {
    const year = cursor.getFullYear();
    return (dbPlayers || [])
      .filter((p: any) => p.birth_date)
      .map((p: any) => {
        const bd = new Date(p.birth_date);
        const thisYear = new Date(year, bd.getMonth(), bd.getDate());
        return { id: `bday-${p.id}`, date: thisYear.toISOString().slice(0, 10), type: 'birthday' as const, label: `CUMPLEAÑOS: ${p.first_name || ''} ${p.last_name || ''}`.trim() };
      });
  }, [dbPlayers, cursor]);

  const allEvents = [...events, ...birthdays];

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  
  // Fill the end with nulls to make complete weeks (rows of 7)
  const remainingCells = (7 - (cells.length % 7)) % 7;
  const fullGridCells = [...cells, ...Array(remainingCells).fill(null)];

  const eventsFor = (day: number) => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allEvents
      .filter((e) => e.date === key)
      .sort((a, b) => {
        // Events without time go first (all day)
        if (!a.time && b.time) return -1;
        if (a.time && !b.time) return 1;
        if (!a.time && !b.time) return 0;
        
        // Sort by time
        const [aH, aM] = (a.time as string).split(':').map(Number);
        const [bH, bM] = (b.time as string).split(':').map(Number);
        return (aH * 60 + aM) - (bH * 60 + bM);
      });
  };

  const getEventStyles = (type: CalEvent['type'], competition?: string) => {
    switch (type) {
      case 'match':
        const comp = (competition || '').toLowerCase();
        if (comp.includes('amistoso')) return 'bg-orange-50 text-orange-700 border-orange-200';
        if (comp.includes('copa')) return 'bg-purple-50 text-purple-700 border-purple-200';
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'training': return 'bg-red-50 text-red-700 border-red-200';
      case 'meeting': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'dynamics': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'birthday': return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getEventIcon = (type: CalEvent['type']) => {
    switch (type) {
      case 'match': return <Activity size={12} className="shrink-0" />;
      case 'training': return <Dumbbell size={12} className="shrink-0" />;
      case 'meeting': return <MessageCircle size={12} className="shrink-0" />;
      case 'dynamics': return <Users2 size={12} className="shrink-0" />;
      case 'birthday': return <Cake size={12} className="shrink-0" />;
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  // Generate localized weekday names (starting on Monday)
  const weekDays = [1, 2, 3, 4, 5, 6, 0].map(d => {
    const date = new Date(2024, 0, 1 + (d === 0 ? 6 : d - 1)); // 1st Jan 2024 was Monday
    return date.toLocaleDateString(i18n.language, { weekday: 'short' });
  });

  const handleMouseEnterEvent = (e: React.MouseEvent, event: CalEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredEvent({ event, x: rect.left + rect.width / 2, y: rect.top });
  };

  const handleDeleteEvent = async (e: React.MouseEvent, event: CalEvent) => {
    e.stopPropagation();
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${event.label}"?`)) return;
    
    try {
      if (event.type === 'match') {
        await deleteMatch(event.id);
      } else if (event.type === 'training') {
        await deleteTrainingSession(event.id);
      } else if (event.type === 'meeting' || event.type === 'dynamics') {
        await deleteMeeting(event.id);
      }
      loadEvents();
      setHoveredEvent(null);
    } catch (err) {
      console.error(err);
      alert('Error al eliminar evento');
    }
  };

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 space-y-4">
      {/* Tooltip render */}
      {hoveredEvent && (
        <div 
          className="fixed z-[100] bg-gray-900 text-white text-xs rounded-xl p-4 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full min-w-[200px] max-w-[280px]"
          style={{ left: hoveredEvent.x, top: hoveredEvent.y - 8 }}
        >
          <p className="font-extrabold text-sm border-b border-gray-700 pb-2 mb-2 break-words">{hoveredEvent.event.label}</p>
          <div className="space-y-1.5">
            {hoveredEvent.event.time && <p className="flex items-start gap-2"><span className="text-gray-400 w-16 shrink-0">Hora:</span> <span>{hoveredEvent.event.time}</span></p>}
            {hoveredEvent.event.location && <p className="flex items-start gap-2"><span className="text-gray-400 w-16 shrink-0">Lugar:</span> <span>{hoveredEvent.event.location}</span></p>}
            {hoveredEvent.event.type === 'match' && hoveredEvent.event.competition && <p className="flex items-start gap-2"><span className="text-gray-400 w-16 shrink-0">Torneo:</span> <span>{hoveredEvent.event.competition}</span></p>}
            {hoveredEvent.event.type === 'meeting' && hoveredEvent.event.playerName && <p className="flex items-start gap-2"><span className="text-gray-400 w-16 shrink-0">Jugador:</span> <span className="font-bold text-blue-300">{hoveredEvent.event.playerName}</span></p>}
            {(hoveredEvent.event.type === 'meeting' || hoveredEvent.event.type === 'dynamics') && hoveredEvent.event.coach && <p className="flex items-start gap-2"><span className="text-gray-400 w-16 shrink-0">Entrenador:</span> <span>{hoveredEvent.event.coach}</span></p>}
            {hoveredEvent.event.objective && <p className="flex items-start gap-2"><span className="text-gray-400 w-16 shrink-0">Objetivo:</span> <span className="italic">{hoveredEvent.event.objective}</span></p>}
          </div>
          
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45"></div>
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{t('calendarPage.title')}</h1>
          <p className="text-sm text-gray-500 mb-3">{t('calendarPage.subtitle')}</p>
          
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Partido</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Entrenamiento</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Dinámica</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div> Reunión</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Cumpleaños</div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-4 mt-4 xl:mt-0">
          <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <span className="font-bold text-gray-800 capitalize w-36 text-center">
              {cursor.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={16} /> Añadir evento
          </button>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-extrabold text-gray-900">Añadir Nuevo Evento</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Tipo de Evento</label>
                <select 
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  <option value="Partido">Partido</option>
                  <option value="Sesión entrenamiento">Sesión entrenamiento</option>
                  <option value="Dinámicas">Dinámicas</option>
                  <option value="Reunión individual">Reunión individual</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Fecha *</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Hora</label>
                  <input 
                    type="time" 
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Lugar del Evento</label>
                <input 
                  type="text" 
                  placeholder="Ej: Ciudad Deportiva, Estadio..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                />
              </div>

              {eventType === 'Partido' && (
                <div className="space-y-4 pt-4 border-t border-gray-100 mt-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Equipo Rival *</label>
                    <input 
                      type="text" 
                      placeholder="Nombre del rival"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      value={opponent}
                      onChange={(e) => setOpponent(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Competición</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Liga, Copa..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        value={competition}
                        onChange={(e) => setCompetition(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">¿Juega en casa?</label>
                      <select 
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        value={isHome ? 'yes' : 'no'}
                        onChange={(e) => setIsHome(e.target.value === 'yes')}
                      >
                        <option value="yes">Local</option>
                        <option value="no">Visitante</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
              {eventType === 'Reunión individual' && (
                <div className="space-y-4 pt-4 border-t border-gray-100 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Jugador *</label>
                      <select 
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        value={meetingPlayerId}
                        onChange={(e) => setMeetingPlayerId(e.target.value)}
                      >
                        <option value="">Selecciona un jugador</option>
                        {(dbPlayers || []).map((p: any) => (
                          <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Entrenador</label>
                      <input 
                        type="text" 
                        placeholder="Nombre del entrenador"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        value={meetingCoach}
                        onChange={(e) => setMeetingCoach(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddEvent}
                disabled={!eventDate || (eventType === 'Partido' && !opponent) || (eventType === 'Reunión individual' && !meetingPlayerId)}
                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar Evento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Calendar Grid */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 shrink-0">
          {weekDays.map((d, i) => (
            <div key={i} className="text-center text-xs font-black text-gray-500 py-3 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        
        {/* Calendar Body */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
          {fullGridCells.map((day, i) => {
            const isToday = day && `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` === todayStr;
            const isWeekend = i % 7 === 5 || i % 7 === 6;
            
            return (
              <div 
                key={i} 
                className={`
                  border-r border-b border-gray-100 p-2 flex flex-col overflow-hidden transition-colors min-h-[100px]
                  ${!day ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50/30'}
                  ${isWeekend && day ? 'bg-gray-50/20' : ''}
                  ${i % 7 === 6 ? 'border-r-0' : ''}
                `}
              >
                {day && (
                  <>
                    <div className="flex justify-between items-start shrink-0 mb-1.5">
                      <span className={`
                        w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold
                        ${isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'text-gray-700'}
                      `}>
                        {day}
                      </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {eventsFor(day).map((e, idx) => {
                        if (e.type === 'match') {
                          return (
                            <div 
                              key={idx} 
                              onMouseEnter={(ev) => handleMouseEnterEvent(ev, e)}
                              onMouseLeave={() => setHoveredEvent(null)}
                              className={`group flex flex-col px-2 py-2 rounded-xl border shadow-sm transition-transform hover:scale-[1.02] cursor-default relative ${getEventStyles(e.type, e.competition)}`}
                            >
                              <button 
                                onClick={(ev) => handleDeleteEvent(ev, e)}
                                className="absolute top-1 right-1 p-1 bg-white/80 rounded hover:bg-red-50 hover:text-red-600 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                title="Eliminar evento"
                              >
                                <Trash2 size={12} />
                              </button>
                              <div className="flex justify-between items-center mb-1 pr-4">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-80 truncate pr-1">
                                  {e.competition || 'PARTIDO'}
                                </span>
                                {e.time && <span className="text-[10px] font-bold opacity-80 shrink-0">{e.time}</span>}
                              </div>
                              
                              <div className="flex items-center justify-between gap-1 mt-1">
                                <div className="flex flex-col items-center flex-1">
                                  {e.home_logo ? <img src={e.home_logo} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md" /> : <div className="w-8 h-8 rounded-full bg-black/5" />}
                                </div>
                                
                                <div className="flex flex-col items-center justify-center px-1">
                                  {(e.result_home != null && e.result_away != null) ? (
                                    <div className="bg-black/90 text-white font-black text-xs px-2 py-0.5 rounded shadow-sm tracking-widest">
                                      {e.result_home}-{e.result_away}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-black opacity-50">VS</span>
                                  )}
                                </div>

                                <div className="flex flex-col items-center flex-1">
                                  {e.away_logo ? <img src={e.away_logo} className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md" /> : <div className="w-8 h-8 rounded-full bg-black/5" />}
                                </div>
                              </div>
                              <div className="text-center mt-1.5 font-bold text-[10px] truncate leading-tight opacity-90">
                                {e.label}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div 
                            key={idx} 
                            onMouseEnter={(ev) => handleMouseEnterEvent(ev, e)}
                            onMouseLeave={() => setHoveredEvent(null)}
                            className={`group flex flex-col px-2 py-1.5 rounded-lg border shadow-sm transition-transform hover:scale-[1.02] cursor-default relative ${getEventStyles(e.type, e.competition)}`}
                          >
                            <button 
                              onClick={(ev) => handleDeleteEvent(ev, e)}
                              className="absolute top-1 right-1 p-1 bg-white/80 rounded hover:bg-red-50 hover:text-red-600 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              title="Eliminar evento"
                            >
                              <Trash2 size={12} />
                            </button>
                            <div className="flex items-center gap-1.5 font-bold mb-0.5 text-xs pr-4">
                              {getEventIcon(e.type)}
                              <span className="truncate">{e.label}</span>
                            </div>
                            {e.time && (
                              <div className="flex items-center gap-1 text-[10px] opacity-80 font-semibold pl-4">
                                <Clock size={10} /> {e.time}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Agenda View */}
      <div className="md:hidden flex-1 overflow-y-auto space-y-3 pb-4">
        {cells.filter((d): d is number => !!d).map((day) => {
          const dayEvents = eventsFor(day);
          if (dayEvents.length === 0) return null;
          
          const date = new Date(year, month, day);
          const isToday = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` === todayStr;
          
          return (
            <div key={day} className={`bg-white border rounded-xl p-4 shadow-sm ${isToday ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-lg font-black ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>{day}</span>
                <span className="text-sm font-bold text-gray-500 uppercase">{date.toLocaleDateString(i18n.language, { weekday: 'long', month: 'short' })}</span>
                {isToday && <span className="ml-auto bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Hoy</span>}
              </div>
              <div className="space-y-3">
                {dayEvents.map((e, idx) => {
                  if (e.type === 'match') {
                    return (
                      <div 
                        key={idx} 
                        onMouseEnter={(ev) => handleMouseEnterEvent(ev, e)}
                        onMouseLeave={() => setHoveredEvent(null)}
                        className={`group flex flex-col gap-3 p-4 rounded-2xl border shadow-sm relative ${getEventStyles(e.type, e.competition)}`}
                      >
                        <button 
                          onClick={(ev) => handleDeleteEvent(ev, e)}
                          className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          title="Eliminar evento"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="flex justify-between items-center pr-6">
                          <span className="text-xs font-black uppercase tracking-widest opacity-80">{e.competition || 'PARTIDO'}</span>
                          {e.time && <span className="text-xs font-bold opacity-80 flex items-center gap-1"><Clock size={12}/> {e.time}</span>}
                        </div>
                        <div className="flex items-center justify-between gap-4 mt-2 mb-1">
                          <div className="flex flex-col items-center flex-1">
                            {e.home_logo ? <img src={e.home_logo} className="w-14 h-14 object-contain drop-shadow-md" /> : <div className="w-12 h-12 rounded-full bg-black/5" />}
                          </div>
                          
                          <div className="flex flex-col items-center justify-center">
                            {(e.result_home != null && e.result_away != null) ? (
                              <div className="bg-black/90 text-white font-black text-xl px-4 py-1.5 rounded-xl shadow-md tracking-widest">
                                {e.result_home} - {e.result_away}
                              </div>
                            ) : (
                              <span className="text-lg font-black opacity-50">VS</span>
                            )}
                          </div>

                          <div className="flex flex-col items-center flex-1">
                            {e.away_logo ? <img src={e.away_logo} className="w-14 h-14 object-contain drop-shadow-md" /> : <div className="w-12 h-12 rounded-full bg-black/5" />}
                          </div>
                        </div>
                        <div className="text-center font-bold text-sm truncate opacity-90">{e.label}</div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={idx} 
                      onMouseEnter={(ev) => handleMouseEnterEvent(ev, e)}
                      onMouseLeave={() => setHoveredEvent(null)}
                      className={`group flex items-start gap-3 p-3 rounded-xl border relative ${getEventStyles(e.type, e.competition)}`}
                    >
                      <button 
                        onClick={(ev) => handleDeleteEvent(ev, e)}
                        className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Eliminar evento"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className={`mt-0.5 bg-white p-1.5 rounded-full shadow-sm text-current`}>
                        {getEventIcon(e.type)}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-bold text-sm truncate">{e.label}</span>
                        {e.time && (
                          <span className="text-xs font-semibold opacity-80 mt-0.5 flex items-center gap-1">
                            <Clock size={12} /> {e.time}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {allEvents.filter((e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Activity size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-500">{t('calendarPage.noEvents')}</p>
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
      `}} />
    </div>
  );
}
