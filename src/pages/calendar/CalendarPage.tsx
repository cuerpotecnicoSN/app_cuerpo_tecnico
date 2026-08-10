import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Cake, Activity, Dumbbell, MessageCircle, Clock, Plus, X, Users2, Trash2, Pencil, Check, MapPin, Trophy, User, CalendarDays, Home, Plane, Sparkles, FileDown, Loader2, AlertTriangle } from 'lucide-react';
import { getMatches, createMatch, updateMatch, deleteMatch } from '../../services/matches';
import { getTrainingSessions, createTrainingSession, updateTrainingSession, deleteTrainingSession } from '../../services/training';
import { getMeetings, createMeeting, updateMeeting, addMeetingPlayer, deleteMeeting } from '../../services/meetings';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { supabase } from '../../lib/supabase';
import { exportCalendarPdf, type PdfEvent } from '../../utils/calendarPdf';

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
  playerId?: string;
  opponent?: string;
  is_home?: boolean;
  title?: string;
}

const EVENT_TYPE_OPTIONS = [
  { value: 'Partido', label: 'Partido', hint: 'Competición', Icon: Activity, active: 'border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-500/10', iconBg: 'bg-blue-100 text-blue-600' },
  { value: 'Sesión entrenamiento', label: 'Entrenamiento', hint: 'Sesión', Icon: Dumbbell, active: 'border-red-500 bg-red-50 text-red-700 ring-4 ring-red-500/10', iconBg: 'bg-red-100 text-red-600' },
  { value: 'Dinámicas', label: 'Dinámica', hint: 'Grupal', Icon: Users2, active: 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10', iconBg: 'bg-emerald-100 text-emerald-600' },
  { value: 'Reunión individual', label: 'Reunión', hint: 'Individual', Icon: MessageCircle, active: 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-4 ring-indigo-500/10', iconBg: 'bg-indigo-100 text-indigo-600' },
];

const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none transition-all placeholder:font-normal placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10';
const labelCls = 'mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-gray-500';

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const { data: dbPlayers } = useSupabaseData<any>('players');
  const [hoveredEvent, setHoveredEvent] = useState<{event: CalEvent, x: number, y: number} | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; label: string; tone: 'danger' | 'primary'; run: () => void } | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [clubName, setClubName] = useState('');
  const [eventType, setEventType] = useState('Partido');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventObjective, setEventObjective] = useState('');
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
      let meetingLinksResult: { data: any[] | null } = { data: [] };
      try {
        meetingLinksResult = await supabase.from('meeting_players').select('*');
      } catch (e) {
        console.error('Meeting links error:', e);
      }
      
      const meetingLinks = meetingLinksResult.data || [];
      
      const getPlayerId = (meetingId: string) => {
         const link = meetingLinks.find((l: any) => l.meeting_id === meetingId);
         return link ? link.player_id : undefined;
      };

      const getPlayerName = (meetingId: string) => {
         const playerId = getPlayerId(meetingId);
         if (!playerId) return undefined;
         const p = dbPlayers.find((dp: any) => dp.id === playerId);
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
          location: m.stadium,
          opponent: m.opponent,
          is_home: m.is_home
        })),
        ...sessions.map((s) => ({ 
          id: s.id,
          date: s.date, 
          time: s.time, 
          type: 'training' as const, 
          label: `ENTRENAMIENTO: ${s.title}`,
          location: s.location,
          objective: s.objective,
          title: s.title
        })),
        ...meetings.map((m) => ({ 
          id: m.id,
          date: m.date, 
          time: m.time, 
          type: (m.type === 'grupal' ? 'dynamics' : 'meeting') as CalEvent['type'],
          originalType: m.type,
          label: m.type === 'grupal' ? 'DINÁMICA' : 'REUNIÓN',
          location: m.location,
          objective: m.objective,
          coach: m.created_by,
          playerName: m.type === 'individual' ? getPlayerName(m.id) : undefined,
          playerId: m.type === 'individual' ? getPlayerId(m.id) : undefined
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

  // Cerrar capas con Escape (de la más superficial a la más profunda)
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      if (confirmAction) setConfirmAction(null);
      else if (showForm) closeForm();
      else if (showExport) setShowExport(false);
      else if (selectedEvent) setSelectedEvent(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmAction, showForm, showExport, selectedEvent]);

  // Nombre del club para la cabecera del PDF
  useEffect(() => {
    const fetchClubName = async () => {
      try {
        const { data } = await supabase.from('clubs').select('*').limit(1);
        setClubName(data?.[0]?.name || '');
      } catch (err) {
        setClubName('');
      }
    };
    fetchClubName();
  }, []);

  const resetForm = () => {
    setEditingEvent(null);
    setEventType('Partido');
    setEventDate(''); setEventTime(''); setEventLocation(''); setEventTitle(''); setEventObjective('');
    setOpponent(''); setCompetition(''); setIsHome(true);
    setMeetingCoach(''); setMeetingPlayerId('');
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const openCreateForm = (presetDate?: string) => {
    resetForm();
    setEventDate(presetDate || '');
    setShowForm(true);
  };

  const openEditForm = (event: CalEvent) => {
    setHoveredEvent(null);
    setSelectedEvent(null);
    setEditingEvent(event);
    setEventType(
      event.type === 'match' ? 'Partido'
      : event.type === 'training' ? 'Sesión entrenamiento'
      : event.type === 'dynamics' ? 'Dinámicas'
      : 'Reunión individual'
    );
    setEventDate(event.date);
    setEventTime(event.time || '');
    setEventLocation(event.location || '');
    setEventTitle(event.title || '');
    setEventObjective(event.objective || '');
    setOpponent(event.opponent || '');
    setCompetition(event.competition || '');
    setIsHome(event.is_home !== false);
    setMeetingCoach(event.coach || '');
    setMeetingPlayerId(event.playerId || '');
    setShowForm(true);
  };

  const isFormValid = !!eventDate
    && !(eventType === 'Partido' && !opponent)
    && !(eventType === 'Reunión individual' && !meetingPlayerId);

  const requestSaveEvent = () => {
    if (!isFormValid || saving) return;
    if (editingEvent) {
      setConfirmAction({
        title: 'Guardar cambios',
        message: `Se actualizará "${editingEvent.label}" con los nuevos datos. ¿Quieres continuar?`,
        label: 'Guardar cambios',
        tone: 'primary',
        run: handleSaveEvent
      });
      return;
    }
    handleSaveEvent();
  };

  const handleSaveEvent = async () => {
    if (!eventDate || saving) return;
    setSaving(true);
    try {
      if (editingEvent) {
        if (editingEvent.type === 'match') {
          if (!opponent) return;
          await updateMatch(editingEvent.id, {
            date: eventDate,
            time: eventTime,
            opponent,
            competition,
            stadium: eventLocation,
            is_home: isHome
          });
        } else if (editingEvent.type === 'training') {
          await updateTrainingSession(editingEvent.id, {
            date: eventDate,
            time: eventTime,
            title: eventTitle || 'Entrenamiento',
            location: eventLocation,
            objective: eventObjective
          });
        } else {
          await updateMeeting(editingEvent.id, {
            date: eventDate,
            time: eventTime,
            location: eventLocation,
            objective: eventObjective,
            created_by: editingEvent.type === 'meeting' ? meetingCoach : undefined
          });
          if (editingEvent.type === 'meeting' && meetingPlayerId !== (editingEvent.playerId || '')) {
            await supabase.from('meeting_players').delete().eq('meeting_id', editingEvent.id);
            if (meetingPlayerId) await addMeetingPlayer(editingEvent.id, meetingPlayerId);
          }
        }
      } else if (eventType === 'Partido') {
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
          title: eventTitle || 'Entrenamiento',
          location: eventLocation,
          objective: eventObjective
        });
      } else if (eventType === 'Reunión individual') {
        const m = await createMeeting({
          type: 'individual',
          date: eventDate,
          time: eventTime,
          location: eventLocation,
          objective: eventObjective || 'Reunión',
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
          objective: eventObjective || 'Dinámica'
        });
      }
      closeForm();
      loadEvents();
    } catch (e) {
      console.error(e);
      alert(editingEvent ? 'Error al actualizar evento' : 'Error al crear evento');
    } finally {
      setSaving(false);
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

  // ===== Exportación a PDF =====
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const openExport = () => {
    setExportFrom(monthStart);
    setExportTo(monthEnd);
    setShowExport(true);
  };

  const applyPreset = (preset: 'month' | 'week' | 'next30') => {
    const today = new Date();
    if (preset === 'month') {
      setExportFrom(monthStart);
      setExportTo(monthEnd);
      return;
    }
    const days = preset === 'week' ? 6 : 29;
    const end = new Date(today);
    end.setDate(end.getDate() + days);
    setExportFrom(toIso(today));
    setExportTo(toIso(end));
  };

  const rangeIsValid = !!exportFrom && !!exportTo && exportFrom <= exportTo;
  const eventsInRange = rangeIsValid ? allEvents.filter((e) => e.date >= exportFrom && e.date <= exportTo) : [];
  const rangeDays = rangeIsValid
    ? Math.round((new Date(`${exportTo}T00:00:00`).getTime() - new Date(`${exportFrom}T00:00:00`).getTime()) / 86400000) + 1
    : 0;

  const toPdfEvent = (e: CalEvent): PdfEvent => {
    const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ') || undefined;
    switch (e.type) {
      case 'match':
        return { date: e.date, time: e.time, type: 'match', typeLabel: e.competition || 'Partido', title: e.label, meta: e.location };
      case 'training':
        return { date: e.date, time: e.time, type: 'training', typeLabel: 'Entrenamiento', title: e.title || 'Entrenamiento', meta: join(e.objective, e.location) };
      case 'meeting':
        return { date: e.date, time: e.time, type: 'meeting', typeLabel: 'Reunión individual', title: e.playerName ? `Reunión · ${e.playerName}` : 'Reunión individual', meta: join(e.coach, e.location) };
      case 'dynamics':
        return { date: e.date, time: e.time, type: 'dynamics', typeLabel: 'Dinámica', title: e.objective || 'Dinámica de grupo', meta: e.location };
      case 'birthday':
        return { date: e.date, type: 'birthday', typeLabel: 'Cumpleaños', title: e.label.replace(/^CUMPLEAÑOS:\s*/i, '') };
    }
  };

  const handleExportPdf = async () => {
    if (!rangeIsValid || exporting) return;
    setExporting(true);
    try {
      await exportCalendarPdf({
        events: eventsInRange.map(toPdfEvent),
        from: exportFrom,
        to: exportTo,
        locale: i18n.language,
        clubName,
      });
      setShowExport(false);
    } catch (err) {
      console.error(err);
      alert('Error al generar el PDF');
    } finally {
      setExporting(false);
    }
  };

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

  const getEventIcon = (type: CalEvent['type'], size = 12) => {
    switch (type) {
      case 'match': return <Activity size={size} className="shrink-0" />;
      case 'training': return <Dumbbell size={size} className="shrink-0" />;
      case 'meeting': return <MessageCircle size={size} className="shrink-0" />;
      case 'dynamics': return <Users2 size={size} className="shrink-0" />;
      case 'birthday': return <Cake size={size} className="shrink-0" />;
    }
  };

  const getEventTypeLabel = (event: CalEvent) => {
    switch (event.type) {
      case 'match': return event.competition || 'Partido';
      case 'training': return 'Entrenamiento';
      case 'meeting': return 'Reunión individual';
      case 'dynamics': return 'Dinámica de grupo';
      case 'birthday': return 'Cumpleaños';
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

  const requestDeleteEvent = (event: CalEvent) => {
    setConfirmAction({
      title: '¿Eliminar este evento?',
      message: `"${event.label}" se eliminará de forma permanente. Esta acción no se puede deshacer.`,
      label: 'Sí, eliminar',
      tone: 'danger',
      run: () => handleDeleteEvent(event)
    });
  };

  const handleDeleteEvent = async (event: CalEvent) => {
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
      setSelectedEvent(null);
    } catch (err) {
      console.error(err);
      alert('Error al eliminar evento');
    }
  };

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 space-y-4">
      {/* Tooltip render */}
      {hoveredEvent && !showForm && !selectedEvent && !confirmAction && !showExport && (
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

          {hoveredEvent.event.type !== 'birthday' && (
            <p className="mt-2.5 flex items-center gap-1.5 border-t border-gray-700 pt-2 text-[10px] font-semibold text-gray-400">
              <Pencil size={10} /> Pulsa para editar o eliminar
            </p>
          )}

          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45"></div>
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full">
        <div className="flex-1">
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

        <div className="flex-1 flex justify-center mt-4 xl:mt-0">
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
        </div>

        <div className="flex-1 flex items-center justify-end flex-wrap gap-3 mt-4 xl:mt-0">
          <span className="hidden 2xl:flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
            <Sparkles size={13} className="text-gray-300" /> Pulsa un evento para editarlo o eliminarlo
          </span>
          <button
            onClick={openExport}
            className="group inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md focus-visible:ring-4 focus-visible:ring-gray-900/10 active:translate-y-0 active:scale-[0.98]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors group-hover:bg-gray-900 group-hover:text-white">
              <FileDown size={14} strokeWidth={2.5} />
            </span>
            Exportar PDF
          </button>
          <button
            onClick={() => openCreateForm()}
            className="group relative inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/35 focus-visible:ring-4 focus-visible:ring-emerald-500/30 active:translate-y-0 active:scale-[0.98]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover:rotate-90">
              <Plus size={15} strokeWidth={3} />
            </span>
            Añadir evento
          </button>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeForm(); }}
        >
          <div className="animate-fade-in flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded bg-white shadow-2xl ring-1 ring-black/5">
            {/* Cabecera */}
            <div className="relative shrink-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-5 py-5 text-white sm:px-6">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                  {editingEvent ? <Pencil size={19} /> : <CalendarDays size={19} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-extrabold leading-tight">{editingEvent ? 'Editar evento' : 'Nuevo evento'}</h2>
                  <p className="mt-0.5 truncate text-xs font-medium text-gray-400">
                    {editingEvent ? editingEvent.label : 'Elige el tipo y completa los datos'}
                  </p>
                </div>
                <button
                  onClick={closeForm}
                  className="-mr-1 -mt-1 rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Cerrar"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <div>
                <label className={labelCls}>Tipo de evento</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {EVENT_TYPE_OPTIONS.map((opt) => {
                    const isActive = eventType === opt.value;
                    const locked = !!editingEvent && !isActive;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={!!editingEvent}
                        onClick={() => setEventType(opt.value)}
                        className={`flex items-center gap-2.5 rounded-2xl border-2 p-3 text-left transition-all duration-150 ${
                          isActive ? opt.active : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50'
                        } ${locked ? 'pointer-events-none opacity-40' : ''}`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isActive ? opt.iconBg : 'bg-gray-100 text-gray-400'}`}>
                          <opt.Icon size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold leading-tight">{opt.label}</span>
                          <span className="block truncate text-[10px] font-semibold uppercase tracking-wider opacity-60">{opt.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {editingEvent && (
                  <p className="mt-2 text-[11px] font-medium text-gray-400">El tipo de evento no se puede cambiar al editar.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}><CalendarDays size={12} /> Fecha *</label>
                  <input type="date" className={inputCls} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}><Clock size={12} /> Hora</label>
                  <input type="time" className={inputCls} value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
                </div>
              </div>

              <div>
                <label className={labelCls}><MapPin size={12} /> Lugar</label>
                <input
                  type="text"
                  placeholder="Ej: Ciudad Deportiva, Estadio..."
                  className={inputCls}
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                />
              </div>

              {eventType === 'Partido' && (
                <div className="space-y-4 rounded-2xl bg-blue-50/50 p-4 ring-1 ring-blue-100">
                  <div>
                    <label className={labelCls}><Users2 size={12} /> Equipo rival *</label>
                    <input
                      type="text"
                      placeholder="Nombre del rival"
                      className={inputCls}
                      value={opponent}
                      onChange={(e) => setOpponent(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}><Trophy size={12} /> Competición</label>
                    <input
                      type="text"
                      placeholder="Ej: Liga, Copa, Amistoso..."
                      className={inputCls}
                      value={competition}
                      onChange={(e) => setCompetition(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>¿Dónde se juega?</label>
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-1 ring-1 ring-gray-200">
                      <button
                        type="button"
                        onClick={() => setIsHome(true)}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-all ${isHome ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Home size={14} /> Local
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsHome(false)}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-all ${!isHome ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Plane size={14} /> Visitante
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {eventType === 'Sesión entrenamiento' && (
                <div className="space-y-4 rounded-2xl bg-red-50/50 p-4 ring-1 ring-red-100">
                  <div>
                    <label className={labelCls}><Dumbbell size={12} /> Título de la sesión</label>
                    <input
                      type="text"
                      placeholder="Ej: Entrenamiento"
                      className={inputCls}
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Objetivo</label>
                    <input
                      type="text"
                      placeholder="Ej: Presión tras pérdida"
                      className={inputCls}
                      value={eventObjective}
                      onChange={(e) => setEventObjective(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {eventType === 'Reunión individual' && (
                <div className="space-y-4 rounded-2xl bg-indigo-50/50 p-4 ring-1 ring-indigo-100">
                  <div>
                    <label className={labelCls}><User size={12} /> Jugador *</label>
                    <select className={inputCls} value={meetingPlayerId} onChange={(e) => setMeetingPlayerId(e.target.value)}>
                      <option value="">Selecciona un jugador</option>
                      {(dbPlayers || []).map((p: any) => (
                        <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Entrenador</label>
                    <input
                      type="text"
                      placeholder="Nombre del entrenador"
                      className={inputCls}
                      value={meetingCoach}
                      onChange={(e) => setMeetingCoach(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Objetivo</label>
                    <input
                      type="text"
                      placeholder="Ej: Seguimiento del plan individual"
                      className={inputCls}
                      value={eventObjective}
                      onChange={(e) => setEventObjective(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {eventType === 'Dinámicas' && (
                <div className="rounded-2xl bg-emerald-50/50 p-4 ring-1 ring-emerald-100">
                  <label className={labelCls}><Users2 size={12} /> Objetivo de la dinámica</label>
                  <input
                    type="text"
                    placeholder="Ej: Cohesión de grupo"
                    className={inputCls}
                    value={eventObjective}
                    onChange={(e) => setEventObjective(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Pie */}
            <div className="shrink-0 border-t border-gray-100 bg-gray-50/80 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeForm}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 sm:flex-none"
                >
                  Cancelar
                </button>
                <button
                  onClick={requestSaveEvent}
                  disabled={!isFormValid || saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/35 active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
                >
                  <Check size={16} strokeWidth={3} />
                  {saving ? 'Guardando...' : editingEvent ? 'Guardar cambios' : 'Crear evento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exportar a PDF */}
      {showExport && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowExport(false); }}
        >
          <div className="animate-fade-in w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:max-w-md sm:rounded-3xl">
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-5 py-5 text-white sm:px-6">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                  <FileDown size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-extrabold leading-tight">Exportar calendario</h2>
                  <p className="mt-0.5 text-xs font-medium text-gray-400">PDF horizontal, siempre en una sola página</p>
                </div>
                <button
                  onClick={() => setShowExport(false)}
                  className="-mr-1 -mt-1 rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Cerrar"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6">
              <div>
                <label className={labelCls}>Atajos</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: 'month' as const, label: 'Mes visible' },
                    { key: 'week' as const, label: 'Próximos 7 días' },
                    { key: 'next30' as const, label: 'Próximos 30 días' },
                  ]).map((p) => (
                    <button
                      key={p.key}
                      onClick={() => applyPreset(p.key)}
                      className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-600 transition-all hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}><CalendarDays size={12} /> Desde</label>
                  <input type="date" className={inputCls} value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}><CalendarDays size={12} /> Hasta</label>
                  <input type="date" className={inputCls} value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
                </div>
              </div>

              {rangeIsValid ? (
                <div className="flex items-center gap-4 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
                  <div className="text-center">
                    <p className="text-2xl font-black leading-none text-gray-900">{eventsInRange.length}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-gray-400">Eventos</p>
                  </div>
                  <div className="h-8 w-px bg-gray-200" />
                  <div className="text-center">
                    <p className="text-2xl font-black leading-none text-gray-900">{rangeDays}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-gray-400">Días</p>
                  </div>
                  <p className="flex-1 text-right text-[11px] font-medium leading-snug text-gray-500">
                    El diseño se ajusta solo<br />para caber en una hoja
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 p-4 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
                  <AlertTriangle size={16} className="shrink-0" />
                  La fecha de inicio debe ser anterior a la de fin.
                </div>
              )}

              {rangeIsValid && eventsInRange.length > 150 && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 p-4 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
                  <AlertTriangle size={16} className="shrink-0" />
                  Con tantos eventos el texto quedará muy pequeño. Prueba con un tramo más corto.
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-gray-50/80 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowExport(false)}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 sm:flex-none"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={!rangeIsValid || exporting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-gray-900/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gray-900/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
                >
                  {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                  {exporting ? 'Generando...' : 'Descargar PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detalle del evento: editar / eliminar */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedEvent(null); }}
        >
          <div className="animate-fade-in flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded bg-white shadow-2xl ring-1 ring-black/5">
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-5 py-5 text-white">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                  {getEventIcon(selectedEvent.type, 20)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{getEventTypeLabel(selectedEvent)}</p>
                  <h2 className="mt-0.5 break-words text-base font-extrabold leading-tight">{selectedEvent.label}</h2>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="-mr-1 -mt-1 rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Cerrar"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto custom-scrollbar px-5 py-5 text-sm">
              <div className="flex items-center gap-2.5 text-gray-700">
                <CalendarDays size={15} className="shrink-0 text-gray-400" />
                <span className="font-semibold capitalize">
                  {new Date(`${selectedEvent.date}T00:00:00`).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              {selectedEvent.time && (
                <div className="flex items-center gap-2.5 text-gray-700">
                  <Clock size={15} className="shrink-0 text-gray-400" />
                  <span className="font-semibold">{selectedEvent.time}</span>
                </div>
              )}
              {selectedEvent.location && (
                <div className="flex items-center gap-2.5 text-gray-700">
                  <MapPin size={15} className="shrink-0 text-gray-400" />
                  <span className="font-semibold">{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.competition && (
                <div className="flex items-center gap-2.5 text-gray-700">
                  <Trophy size={15} className="shrink-0 text-gray-400" />
                  <span className="font-semibold">{selectedEvent.competition}</span>
                </div>
              )}
              {selectedEvent.playerName && (
                <div className="flex items-center gap-2.5 text-gray-700">
                  <User size={15} className="shrink-0 text-gray-400" />
                  <span className="font-semibold">{selectedEvent.playerName}</span>
                </div>
              )}
              {selectedEvent.coach && (
                <div className="flex items-center gap-2.5 text-gray-700">
                  <Users2 size={15} className="shrink-0 text-gray-400" />
                  <span className="font-semibold">{selectedEvent.coach}</span>
                </div>
              )}
              {selectedEvent.objective && (
                <p className="rounded-xl bg-gray-50 p-3 text-xs font-medium italic text-gray-600">{selectedEvent.objective}</p>
              )}
            </div>

            <div className="shrink-0 border-t border-gray-100 bg-gray-50/80 px-5 py-4">
              {selectedEvent.type === 'birthday' ? (
                <p className="text-center text-xs font-semibold text-gray-500">
                  Los cumpleaños se calculan desde la ficha del jugador.
                </p>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openEditForm(selectedEvent)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/35 active:translate-y-0"
                  >
                    <Pencil size={15} /> Editar
                  </button>
                  <button
                    onClick={() => requestDeleteEvent(selectedEvent)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-500/25"
                  >
                    <Trash2 size={15} /> Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmación */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/70 p-4 backdrop-blur-sm">
          <div className="animate-fade-in w-full max-w-sm overflow-hidden rounded bg-white p-6 text-center shadow-2xl ring-1 ring-black/5">
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${confirmAction.tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
              {confirmAction.tone === 'danger' ? <Trash2 size={24} /> : <Check size={24} />}
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-gray-900">{confirmAction.title}</h3>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-gray-500">{confirmAction.message}</p>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => { const run = confirmAction.run; setConfirmAction(null); run(); }}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 ${
                  confirmAction.tone === 'danger'
                    ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/35'
                    : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35'
                }`}
              >
                {confirmAction.label}
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
                  group/day border-r border-b border-gray-100 p-2 flex flex-col overflow-hidden transition-colors min-h-[100px]
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
                      <button
                        onClick={() => openCreateForm(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
                        title="Añadir evento este día"
                        className="opacity-0 group-hover/day:opacity-100 focus:opacity-100 flex h-6 w-6 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-emerald-50 hover:text-emerald-600"
                      >
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {eventsFor(day).map((e, idx) => {
                        if (e.type === 'match') {
                          return (
                            <div 
                              key={idx} 
                              onMouseEnter={(ev) => handleMouseEnterEvent(ev, e)}
                              onMouseLeave={() => setHoveredEvent(null)}
                              onClick={() => { setHoveredEvent(null); setSelectedEvent(e); }}
                              className={`group flex flex-col px-2 py-2 rounded-xl border shadow-sm transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer relative ${getEventStyles(e.type, e.competition)}`}
                            >
                              <div className="flex justify-between items-center mb-1">
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
                            onClick={() => { setHoveredEvent(null); setSelectedEvent(e); }}
                            className={`group flex flex-col px-2 py-1.5 rounded-lg border shadow-sm transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer relative ${getEventStyles(e.type, e.competition)}`}
                          >
                            <div className="flex items-center gap-1.5 font-bold mb-0.5 text-xs">
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
                        onClick={() => { setHoveredEvent(null); setSelectedEvent(e); }}
                        className={`group flex flex-col gap-3 p-4 rounded-2xl border shadow-sm relative cursor-pointer transition-all active:scale-[0.99] ${getEventStyles(e.type, e.competition)}`}
                      >
                        <div className="flex justify-between items-center">
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
                      onClick={() => { setHoveredEvent(null); setSelectedEvent(e); }}
                      className={`group flex items-start gap-3 p-3 rounded-xl border relative cursor-pointer transition-all active:scale-[0.99] ${getEventStyles(e.type, e.competition)}`}
                    >
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
