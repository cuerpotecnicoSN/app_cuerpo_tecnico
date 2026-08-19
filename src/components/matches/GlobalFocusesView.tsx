import { useState, useEffect } from 'react';
import { ChevronLeft, Target, Users, User, ShieldAlert, Flag, Shield, Activity, CalendarDays } from 'lucide-react';
import { getAllMatchFocuses } from '../../services/matches';
import type { MatchDB, MatchFocus, FocusDetails } from '../types';

interface GlobalFocusesViewProps {
  matches: MatchDB[];
  onBack: () => void;
}

export default function GlobalFocusesView({ matches, onBack }: GlobalFocusesViewProps) {
  const [focuses, setFocuses] = useState<MatchFocus[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeFilterType, setActiveFilterType] = useState<'Todos' | 'Colectivo' | 'Individual' | 'Rival'>('Todos');
  const [activeFilterPhase, setActiveFilterPhase] = useState<'Todas' | 'Ofensivo' | 'Defensivo' | 'ABP'>('Todas');

  useEffect(() => {
    getAllMatchFocuses().then(data => {
      setFocuses(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  // Map matches for easy lookup
  const matchesMap = new Map(matches.map(m => [m.id, m]));

  // Parse JSON and filter
  const processedFocuses = focuses.map(f => {
    let details: FocusDetails | null = null;
    let plainDesc = f.description;
    try {
      if (f.description && f.description.startsWith('{')) {
        details = JSON.parse(f.description);
        plainDesc = details?.text || '';
      }
    } catch (e) {
      // legacy
    }
    return { ...f, details, plainDesc };
  });

  const filteredFocuses = processedFocuses.filter(f => {
    if (activeFilterType !== 'Todos' && f.details?.focusType !== activeFilterType) return false;
    if (activeFilterPhase !== 'Todas') {
      const hasPhase = f.details?.phases?.includes(activeFilterPhase as any) || f.details?.phase === activeFilterPhase;
      if (!hasPhase) return false;
    }
    return true;
  });

  // Group by Match
  const groupedByMatch = new Map<string, typeof filteredFocuses>();
  filteredFocuses.forEach(f => {
    if (!groupedByMatch.has(f.match_id)) groupedByMatch.set(f.match_id, []);
    groupedByMatch.get(f.match_id)!.push(f);
  });

  // Sort match IDs by date descending
  const sortedMatchIds = Array.from(groupedByMatch.keys()).sort((a, b) => {
    const matchA = matchesMap.get(a);
    const matchB = matchesMap.get(b);
    if (!matchA || !matchB) return 0;
    return new Date(matchB.date).getTime() - new Date(matchA.date).getTime();
  });

  const getTypeIcon = (type?: string) => {
    if (type === 'Colectivo') return <Users size={16} />;
    if (type === 'Individual') return <User size={16} />;
    if (type === 'Rival') return <ShieldAlert size={16} />;
    return <Target size={16} />;
  };

  const getPhaseIcon = (phase?: string) => {
    if (phase === 'Ofensivo') return <Activity size={16} />;
    if (phase === 'Defensivo') return <Shield size={16} />;
    if (phase === 'ABP') return <Flag size={16} />;
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
          <ChevronLeft size={16} /> Volver a Partidos
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <Target className="text-indigo-600" /> Dashboard Global de Focos
        </h1>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Filtrar por Tipo</label>
          <div className="flex bg-gray-100 p-1.5 rounded-xl gap-1">
            {['Todos', 'Colectivo', 'Individual', 'Rival'].map(t => (
              <button 
                key={t}
                onClick={() => setActiveFilterType(t as any)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeFilterType === t ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Filtrar por Fase</label>
          <div className="flex bg-gray-100 p-1.5 rounded-xl gap-1">
            {['Todas', 'Ofensivo', 'Defensivo', 'ABP'].map(p => (
              <button 
                key={p}
                onClick={() => setActiveFilterPhase(p as any)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeFilterPhase === p ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-12 text-gray-500">Cargando focos...</div>
      ) : sortedMatchIds.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-500 shadow-sm flex flex-col items-center">
          <Target size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-bold text-gray-600">No hay focos registrados</p>
          <p className="text-sm">Prueba a cambiar los filtros o añade focos en la página de un partido concreto.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedMatchIds.map(matchId => {
            const match = matchesMap.get(matchId);
            const matchFocuses = groupedByMatch.get(matchId) || [];
            
            if (!match) return null;

            // Agrupar por responsable
            const groupedByRole = new Map<string, typeof matchFocuses>();
            matchFocuses.forEach(f => {
              const role = f.details?.assignedTo?.trim() || 'General';
              if (!groupedByRole.has(role)) groupedByRole.set(role, []);
              groupedByRole.get(role)!.push(f);
            });

            return (
              <div key={matchId} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-blue-500" />
                
                <div className="flex items-center gap-4 mb-6 ml-2 border-b border-gray-100 pb-4">
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 shadow-inner">
                    <CalendarDays size={24} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight">
                      {match.is_home ? 'vs' : '@'} {match.opponent}
                    </h3>
                    <p className="text-sm font-bold text-gray-500">
                      {new Date(match.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {match.competition ? ` • ${match.competition}` : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 ml-2">
                  {Array.from(groupedByRole.entries()).map(([role, roleFocuses]) => (
                    <div key={role} className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col">
                      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-200">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner">
                          <User size={20} />
                        </div>
                        <h4 className="font-extrabold text-gray-900 text-lg uppercase tracking-tight">{role}</h4>
                        <span className="ml-auto bg-white border border-gray-200 text-gray-600 text-xs font-black px-2.5 py-1 rounded-full shadow-sm">{roleFocuses.length}</span>
                      </div>
                      
                      <div className="space-y-4">
                        {roleFocuses.map(f => {
                          const typeColors = {
                            Colectivo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                            Grupal: 'bg-teal-50 text-teal-700 border-teal-200',
                            Individual: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            Rival: 'bg-rose-50 text-rose-700 border-rose-200'
                          };
                          const phaseColors = {
                            Ofensivo: 'text-blue-600 bg-blue-50 border-blue-200',
                            Defensivo: 'text-red-600 bg-red-50 border-red-200',
                            ABP: 'text-amber-600 bg-amber-50 border-amber-200'
                          };

                          const tColor = f.details?.focusType ? typeColors[f.details.focusType] : 'bg-gray-50 text-gray-700 border-gray-200';

                          return (
                            <div key={f.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                              <div className="flex flex-wrap items-start justify-start gap-2 mb-2">
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${tColor}`}>
                                  {getTypeIcon(f.details?.focusType)}
                                  {f.details?.focusType || 'General'}
                                </div>
                                {f.details?.phase && (
                                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${phaseColors[f.details.phase as keyof typeof phaseColors] || phaseColors.Ofensivo}`}>
                                    {getPhaseIcon(f.details.phase)}
                                    {f.details.phase}
                                  </div>
                                )}
                                {f.details?.phases?.map(ph => (
                                  <div key={ph} className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${phaseColors[ph as keyof typeof phaseColors] || phaseColors.Ofensivo}`}>
                                    {getPhaseIcon(ph)}
                                    {ph}
                                  </div>
                                ))}
                              </div>

                              <h5 className="font-bold text-gray-900 text-[14px] leading-tight mb-1.5">{f.title}</h5>
                              
                              {f.plainDesc && (
                                <p className="text-xs text-gray-500 leading-relaxed mb-1">
                                  {f.plainDesc}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
