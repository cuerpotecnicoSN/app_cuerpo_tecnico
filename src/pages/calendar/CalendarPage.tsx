import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Cake, Activity, Dumbbell, MessageCircle } from 'lucide-react';
import { getMatches } from '../../services/matches';
import { getTrainingSessions } from '../../services/training';
import { getMeetings } from '../../services/meetings';
import { useSupabaseData } from '../../hooks/useSupabaseData';

interface CalEvent {
  date: string; // YYYY-MM-DD
  type: 'match' | 'training' | 'meeting' | 'birthday';
  label: string;
}

export default function CalendarPage() {
  const { t } = useTranslation();
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
        ...matches.map((m) => ({ date: m.date, type: 'match' as const, label: `${t('calendarPage.match')}: ${m.opponent}` })),
        ...sessions.map((s) => ({ date: s.date, type: 'training' as const, label: s.title })),
        ...meetings.map((m) => ({ date: m.date, type: 'meeting' as const, label: `${t('calendarPage.meeting')}` })),
      ];
      setEvents(evs);
    })();
  }, []);

  const birthdays = useMemo<CalEvent[]>(() => {
    const year = cursor.getFullYear();
    return (dbPlayers || [])
      .filter((p: any) => p.birth_date)
      .map((p: any) => {
        const bd = new Date(p.birth_date);
        const thisYear = new Date(year, bd.getMonth(), bd.getDate());
        return { date: thisYear.toISOString().slice(0, 10), type: 'birthday' as const, label: `${p.first_name || ''} ${p.last_name || ''}`.trim() };
      });
  }, [dbPlayers, cursor]);

  const allEvents = [...events, ...birthdays];

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const eventsFor = (day: number) => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allEvents.filter((e) => e.date === key);
  };

  const iconFor = (type: CalEvent['type']) => {
    if (type === 'match') return <Activity size={12} className="text-red-500" />;
    if (type === 'training') return <Dumbbell size={12} className="text-blue-500" />;
    if (type === 'meeting') return <MessageCircle size={12} className="text-purple-500" />;
    return <Cake size={12} className="text-amber-500" />;
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">{t('calendarPage.title')}</h1>
        <p className="text-sm text-gray-500">{t('calendarPage.subtitle')}</p>
      </div>

      <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
        <span className="font-bold text-gray-800 capitalize">{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
      </div>

      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-7 gap-2">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = eventsFor(day);
          return (
            <div key={i} className={`min-h-[90px] border rounded-lg p-1.5 text-xs ${key === todayStr ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-white'}`}>
              <span className="font-bold text-gray-600">{day}</span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-1 truncate">
                    {iconFor(e.type)}
                    <span className="truncate">{e.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile agenda list */}
      <div className="md:hidden space-y-2">
        {cells.filter((d): d is number => !!d).map((day) => {
          const dayEvents = eventsFor(day);
          if (dayEvents.length === 0) return null;
          return (
            <div key={day} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
              <p className="text-xs font-bold text-gray-400 mb-1">{day} {cursor.toLocaleDateString(undefined, { month: 'short' })}</p>
              <div className="space-y-1">
                {dayEvents.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {iconFor(e.type)}
                    <span>{e.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {allEvents.filter((e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">{t('calendarPage.noEvents')}</p>
        )}
      </div>
    </div>
  );
}
