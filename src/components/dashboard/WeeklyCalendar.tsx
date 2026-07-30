import React, { useMemo } from 'react';

import { Calendar, Cake, Dumbbell, Target } from 'lucide-react';

export type EventType = 'match' | 'training' | 'birthday' | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: EventType;
  time?: string;
  description?: string;
}

interface WeeklyCalendarProps {
  events: CalendarEvent[];
}

// Helper to get Monday of current week
const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ events }) => {
  

  const weekDays = useMemo(() => {
    const monday = getMonday(new Date());
    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
  }, []);

  const getEventsForDate = (date: Date) => {
    return events.filter(e => 
      e.date.getDate() === date.getDate() && 
      e.date.getMonth() === date.getMonth() &&
      e.date.getFullYear() === date.getFullYear()
    );
  };

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'birthday': return <Cake size={14} />;
      case 'match': return <Target size={14} />;
      case 'training': return <Dumbbell size={14} />;
      default: return <Calendar size={14} />;
    }
  };

  const getEventColors = (type: EventType) => {
    switch (type) {
      case 'birthday': return 'bg-[#eab308]/10 text-[#eab308] border-[#eab308]/30'; // Tailwind yellow-500 hex fallback just in case
      case 'match': return 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/30';
      case 'training': return 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30'; // Tailwind blue-500
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {weekDays.map((date, index) => {
          const dayEvents = getEventsForDate(date);
          const isToday = new Date().toDateString() === date.toDateString();

          return (
            <div 
              key={index} 
              className={`flex flex-col rounded-xl border p-3 min-h-[140px] transition-all hover:bg-[var(--color-bg-hover)] ${
                isToday 
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-[0_0_20px_rgba(219,0,48,0.1)]' 
                  : 'border-[var(--color-border)] bg-[var(--color-bg-surface)]/40'
              }`}
            >
              <div className="flex flex-col items-center mb-3 pb-2 border-b border-[var(--color-border)]/50">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{dayNames[index]}</span>
                <span className={`text-xl font-display ${isToday ? 'text-[var(--color-primary)] font-bold' : 'text-[var(--color-text-primary)]'}`}>
                  {date.getDate()}
                </span>
              </div>
              
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                {dayEvents.length > 0 ? (
                  dayEvents.map(event => (
                    <div 
                      key={event.id}
                      className={`flex flex-col gap-1 p-2 rounded border text-xs cursor-pointer hover:opacity-80 transition-opacity ${getEventColors(event.type)}`}
                      title={event.description}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {getEventIcon(event.type)}
                        <span className="truncate">{event.title}</span>
                      </div>
                      {event.time && (
                        <span className="text-[10px] opacity-80 font-medium pl-5">{event.time}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center flex-1 text-[var(--color-text-muted)]/30">
                    <span className="text-xs">-</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyCalendar;
