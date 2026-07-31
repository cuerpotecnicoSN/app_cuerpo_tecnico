import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Cake, Activity, Dumbbell, MessageCircle, Clock } from 'lucide-react';
import { getMatches } from '../../services/matches';
import { getTrainingSessions } from '../../services/training';
import { getMeetings } from '../../services/meetings';
import { useSupabaseData } from '../../hooks/useSupabaseData';

interface CalEvent {
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  type: 'match' | 'training' | 'meeting' | 'birthday';
  label: string;
  home_logo?: string;
  away_logo?: string;
  competition?: string;
  result_home?: number;
  result_away?: number;
}

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const { data: dbPlayers } = useSupabaseData<any>('players');

  useEffect(() => {
    (async () => {
      const [matches, sessions, meetings] = await Promise.all([
        getMatches().catch(() => []),
        getTrainingSessions().catch(() => []),
        getMeetings().catch(() => []),
      ]);
      const evs: CalEvent[] = [
        ...matches.map((m) => ({ 
          date: m.date, 
          time: m.time, 
          type: 'match' as const, 
          label: m.opponent,
          home_logo: m.home_logo,
          away_logo: m.away_logo,
          competition: m.competition,
          result_home: m.result_home,
          result_away: m.result_away
        })),
        ...sessions.map((s) => ({ date: s.date, time: s.time, type: 'training' as const, label: `ENTRENAMIENTO: ${s.title}` })),
        ...meetings.map((m) => ({ date: m.date, time: m.time, type: 'meeting' as const, label: `REUNIÓN` })),
      ];
      setEvents(evs);
    })();
  }, [t]);

  const birthdays = useMemo<CalEvent[]>(() => {
    const year = cursor.getFullYear();
    return (dbPlayers || [])
      .filter((p: any) => p.birth_date)
      .map((p: any) => {
        const bd = new Date(p.birth_date);
        const thisYear = new Date(year, bd.getMonth(), bd.getDate());
        return { date: thisYear.toISOString().slice(0, 10), type: 'birthday' as const, label: `CUMPLEAÑOS: ${p.first_name || ''} ${p.last_name || ''}`.trim() };
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
      case 'birthday': return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getEventIcon = (type: CalEvent['type']) => {
    switch (type) {
      case 'match': return <Activity size={12} className="shrink-0" />;
      case 'training': return <Dumbbell size={12} className="shrink-0" />;
      case 'meeting': return <MessageCircle size={12} className="shrink-0" />;
      case 'birthday': return <Cake size={12} className="shrink-0" />;
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  // Generate localized weekday names (starting on Monday)
  const weekDays = [1, 2, 3, 4, 5, 6, 0].map(d => {
    const date = new Date(2024, 0, 1 + (d === 0 ? 6 : d - 1)); // 1st Jan 2024 was Monday
    return date.toLocaleDateString(i18n.language, { weekday: 'short' });
  });

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{t('calendarPage.title')}</h1>
          <p className="text-sm text-gray-500">{t('calendarPage.subtitle')}</p>
        </div>
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
                              className={`flex flex-col px-2 py-2 rounded-xl border shadow-sm transition-transform hover:scale-[1.02] cursor-default ${getEventStyles(e.type, e.competition)}`}
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
                            className={`flex flex-col px-2 py-1.5 rounded-lg border shadow-sm transition-transform hover:scale-[1.02] cursor-default ${getEventStyles(e.type, e.competition)}`}
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
                      <div key={idx} className={`flex flex-col gap-3 p-4 rounded-2xl border shadow-sm ${getEventStyles(e.type, e.competition)}`}>
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
                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border ${getEventStyles(e.type, e.competition)}`}>
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
