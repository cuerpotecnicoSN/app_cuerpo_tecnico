import { useMemo, useState } from 'react';
import { Search, MapPin, Swords } from 'lucide-react';
import type { MatchDB } from '../types';

export const MY_TEAM_NAME = 'Milan Futuro';

export const getMatchTheme = (m: MatchDB) => {
  const comp = (m.competition || '').toLowerCase();
  if (comp.includes('amistoso')) return { border: 'bg-orange-500', icon: 'text-orange-50', bg: 'bg-orange-50', text: 'text-orange-600', borderLight: 'border-orange-100', hoverText: 'group-hover:text-orange-600' };
  if (comp.includes('copa') || comp.includes('coppa')) return { border: 'bg-purple-500', icon: 'text-purple-50', bg: 'bg-purple-50', text: 'text-purple-600', borderLight: 'border-purple-100', hoverText: 'group-hover:text-purple-600' };
  return { border: 'bg-blue-500', icon: 'text-blue-50', bg: 'bg-blue-50', text: 'text-blue-600', borderLight: 'border-blue-100', hoverText: 'group-hover:text-blue-600' };
};

export const matchLabel = (m: MatchDB) => (m.is_home ? `${MY_TEAM_NAME} vs ${m.opponent}` : `${m.opponent} vs ${MY_TEAM_NAME}`);

interface Props {
  matches: MatchDB[];
  onSelect: (m: MatchDB) => void;
  /** Contenido extra dentro de la tarjeta (por ejemplo, nº de focos ya creados). */
  renderBadge?: (m: MatchDB) => React.ReactNode;
  /** Texto cuando no hay ningún partido disponible (sin búsqueda activa). */
  emptyMessage?: string;
  /** Resalta la tarjeta (por ejemplo, partidos que ya tienen focos). */
  highlight?: (m: MatchDB) => boolean;
}

/** Rejilla de partidos por jugar con el mismo diseño de tarjeta que la página de Partidos. */
export default function UpcomingMatchPicker({ matches, onSelect, renderBadge, emptyMessage = 'No hay partidos por jugar.', highlight }: Props) {
  const [search, setSearch] = useState('');

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const term = search.trim().toLowerCase();
    return matches
      .filter(m => m.timer_is_running || (m.date >= today && m.status !== 'Finished'))
      .filter(m => !term || (m.opponent || '').toLowerCase().includes(term) || (m.competition || '').toLowerCase().includes(term))
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [matches, search]);

  return (
    <div className="space-y-5">
      <div className="relative w-full sm:max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Buscar rival o competición..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {upcoming.map(m => {
          const theme = getMatchTheme(m);
          const homeTeamName = m.is_home ? MY_TEAM_NAME : m.opponent;
          const awayTeamName = m.is_home ? m.opponent : MY_TEAM_NAME;

          return (
            <div
              key={m.id}
              onClick={() => onSelect(m)}
              className={`relative bg-white rounded-[28px] p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group ${highlight?.(m) ? 'border-2 border-indigo-300 ring-4 ring-indigo-100' : 'border border-gray-100'}`}
            >
              <div className={`absolute top-0 left-0 w-2 h-full ${theme.border} rounded-l-[28px]`} />
              <div className={`absolute -right-10 -top-10 ${theme.icon} opacity-50 pointer-events-none group-hover:scale-110 transition-transform duration-500`}>
                <Swords size={160} />
              </div>

              <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <span className={`text-sm font-extrabold ${theme.text} ${theme.bg} border ${theme.borderLight} px-3 py-1 rounded-lg shadow-sm uppercase`}>
                    {m.competition || 'Partido'}
                  </span>
                  <span className="text-sm font-bold text-gray-600 flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg shadow-sm">
                    {m.date ? new Date(m.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Sin fecha'}
                    {m.time && ` | ${m.time}`}
                  </span>
                  {m.stadium && (
                    <span className="text-sm font-bold text-gray-600 flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg shadow-sm">
                      <MapPin size={14} className="text-gray-400" />
                      {m.stadium}
                    </span>
                  )}
                  {m.timer_is_running && (
                    <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg shadow-sm flex items-center gap-1.5 uppercase">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> En juego
                    </span>
                  )}
                  {renderBadge?.(m)}
                </div>

                {/* Equipos y Escudos */}
                <div className="flex items-center justify-center gap-2 sm:gap-6 mt-4">
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gray-50 flex items-center justify-center p-4 border border-gray-100 shadow-sm relative z-10 group-hover:-translate-y-1 transition-transform duration-300">
                      {m.home_logo ? <img src={m.home_logo} alt="Home" className="w-full h-full object-contain drop-shadow-sm" /> : <div className="w-12 h-12 rounded-full bg-gray-200" />}
                    </div>
                    <span className={`mt-4 text-center font-black text-lg sm:text-xl text-gray-900 leading-tight line-clamp-2 ${theme.hoverText} transition-colors`}>{homeTeamName}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center px-1 sm:px-4">
                    <span className="text-xl font-black text-gray-300 uppercase tracking-widest">vs</span>
                  </div>

                  <div className="flex flex-col items-center flex-1">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gray-50 flex items-center justify-center p-4 border border-gray-100 shadow-sm relative z-10 group-hover:-translate-y-1 transition-transform duration-300">
                      {m.away_logo ? <img src={m.away_logo} alt="Away" className="w-full h-full object-contain drop-shadow-sm" /> : <div className="w-12 h-12 rounded-full bg-gray-200" />}
                    </div>
                    <span className={`mt-4 text-center font-black text-lg sm:text-xl text-gray-900 leading-tight line-clamp-2 ${theme.hoverText} transition-colors`}>{awayTeamName}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {upcoming.length === 0 && (
          <p className="text-sm text-gray-400 font-bold col-span-full text-center py-10">
            {search.trim() ? 'No hay partidos que coincidan con la búsqueda.' : emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}
