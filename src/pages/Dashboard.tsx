import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Users, Activity, Target, TrendingUp, AlertTriangle, Video, Award, Clock } from 'lucide-react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { getMatches } from '../services/matches';
import { getTrainingSessions } from '../services/training';
import type { MatchDB, TrainingSessionDB } from '../components/types';
import './Dashboard.css';

type UserRole = 'Entrenador' | 'Preparador Físico' | 'Analista';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [currentRole, setCurrentRole] = useState<UserRole>('Entrenador');

  const { data: players = [] } = useSupabaseData<any>('players');
  const { data: profiles = [] } = useSupabaseData<any>('profiles');
  const { data: meetings = [] } = useSupabaseData<any>('individual_meetings');
  const { data: dynamics = [] } = useSupabaseData<any>('team_dynamics');
  const { data: matchFocuses = [] } = useSupabaseData<any>('match_focuses');

  const [matches, setMatches] = useState<MatchDB[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionDB[]>([]);

  useEffect(() => {
    getMatches().then(setMatches).catch(() => setMatches([]));
    getTrainingSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  const totalPlayers = players.length;
  const injuredPlayers = players.filter(p => p.medical_status === 'Baja' || p.medical_status === 'Lesionado').length;
  const availablePlayers = totalPlayers - injuredPlayers;

  const getStatsByRole = () => {
    switch(currentRole) {
      case 'Preparador Físico':
        return [
          { title: t('dashboard.weeklyLoadAccumulated'), value: '0 AU', subtitle: t('dashboard.dbConnected'), icon: Activity, color: 'secondary' },
          { title: t('dashboard.playersAtRisk'), value: injuredPlayers.toString(), subtitle: t('dashboard.highFatigue'), icon: AlertTriangle, color: 'danger' },
          { title: t('dashboard.medicalAvailability'), value: totalPlayers ? `${Math.round((availablePlayers/totalPlayers)*100)}%` : '0%', subtitle: `${injuredPlayers} ${t('dashboard.injuredSuffix')}`, icon: Users, color: 'primary' },
          { title: t('dashboard.avgRpeYesterday'), value: 'N/A', subtitle: t('dashboard.waitingData'), icon: TrendingUp, color: 'accent' },
        ];
      case 'Analista':
        return [
          { title: t('dashboard.nextOpponent'), value: t('dashboard.toBeDefined'), subtitle: t('dashboard.noMatchesInDb'), icon: Target, color: 'primary' },
          { title: t('dashboard.pendingVideoClips'), value: '0', subtitle: t('dashboard.forTacticalMeeting'), icon: Video, color: 'secondary' },
          { title: t('dashboard.xgLastMatch'), value: '0.00', subtitle: '-', icon: Activity, color: 'accent' },
          { title: t('dashboard.lossesOwnHalf'), value: '0', subtitle: t('dashboard.waitingData'), icon: TrendingUp, color: 'secondary' },
        ];
      default:
        return [
          { title: t('dashboard.nextMatch'), value: t('dashboard.noEvents'), subtitle: t('dashboard.addInCalendar'), icon: Target, color: 'primary' },
          { title: t('dashboard.availablePlayers'), value: `${availablePlayers} / ${totalPlayers}`, subtitle: injuredPlayers > 0 ? `${injuredPlayers} ${t('dashboard.injuredSuffix')}` : t('dashboard.allHealthy'), icon: Users, color: 'secondary' },
          { title: t('dashboard.trainingLoad'), value: 'N/A', subtitle: t('dashboard.missingSessionData'), icon: Activity, color: 'accent' },
          { title: t('dashboard.daysToComp'), value: '-', subtitle: t('dashboard.emptyCalendar'), icon: Calendar, color: 'primary' },
        ];
    }
  };

  const stats = getStatsByRole();

  const calendarEvents = useMemo(() => {
    const events: any[] = [];
    const today = new Date();
    
    players.forEach((player: any) => {
      if (player.birth_date) {
        const birthDate = new Date(player.birth_date);
        const currentYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        events.push({
          id: `bday-${player.id}`,
          title: `Cumpleaños: ${player.first_name} ${player.last_name}`,
          date: currentYearBirthday,
          type: 'birthday',
          description: `${player.first_name} cumple años!`
        });
      }
    });

    profiles.forEach((profile: any) => {
      if (profile.birth_date) {
        const birthDate = new Date(profile.birth_date);
        const currentYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        events.push({
          id: `bday-staff-${profile.id}`,
          title: `Cumpleaños Staff: ${profile.full_name || 'Entrenador'}`,
          date: currentYearBirthday,
          type: 'birthday',
          description: `¡El entrenador ${profile.full_name || ''} cumple años!`
        });
      }
    });

    sessions.forEach((s) => {
      events.push({ id: `train-${s.id}`, title: s.title, date: new Date(s.date), type: 'training', description: s.objective || '' });
    });

    matches.forEach((m) => {
      events.push({ id: `match-${m.id}`, title: `${m.is_home ? 'vs' : '@'} ${m.opponent}`, date: new Date(m.date), type: 'match', time: m.time || '', description: m.competition || '' });
    });

    return events;
  }, [players, matches, sessions, profiles]);

  // Find next match for the Hero section
  const nextMatch = useMemo(() => {
    const upcomingMatches = matches.filter(m => new Date(m.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return upcomingMatches.length > 0 ? upcomingMatches[0] : null;
  }, [matches]);

  // Format upcoming events for cards
  const upcomingEvents = useMemo(() => {
    return calendarEvents
      .filter(e => e.date >= new Date(new Date().setHours(0,0,0,0))) // From today onwards
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5); // Show next 5
  }, [calendarEvents]);

  const recentActivities = useMemo(() => {
    const activities: any[] = [];
    
    meetings.forEach((m: any) => {
      activities.push({
        id: `meeting-${m.id}`,
        type: 'Reunión',
        title: m.topic || 'Reunión Individual',
        date: new Date(m.created_at),
        icon: Users,
        color: 'text-blue-600 bg-blue-50 border-blue-200'
      });
    });

    dynamics.forEach((d: any) => {
      activities.push({
        id: `dynamic-${d.id}`,
        type: 'Dinámica',
        title: d.title,
        date: new Date(d.created_at),
        icon: Activity,
        color: 'text-purple-600 bg-purple-50 border-purple-200'
      });
    });

    matchFocuses.forEach((f: any) => {
      activities.push({
        id: `focus-${f.id}`,
        type: 'Foco de Partido',
        title: f.title,
        date: new Date(f.created_at),
        icon: Target,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
      });
    });

    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 6);
  }, [meetings, dynamics, matchFocuses]);

  return (
    <div className="hero-gradient flex flex-col p-2 sm:p-4 lg:p-6 animate-fade-in text-[var(--color-text-primary)] rounded-3xl min-h-[calc(100vh-120px)] border border-[var(--color-border)] shadow-sm">
      
      {/* Hero Section */}
      <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center mb-8 animate-fade-in-up">
        <div className="flex-1 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-surface)] backdrop-blur-md border border-[var(--color-border)] mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm font-medium tracking-wide uppercase text-[var(--color-text-secondary)]">Temporada 2026/27</span>
          </div>
          {nextMatch && (
            <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)] uppercase tracking-tight">
              Próximo partido: {nextMatch.is_home ? 'vs' : '@'} {nextMatch.opponent}
            </p>
          )}
        </div>

        {/* Role Selector (Glassmorphism) */}
        <div className="glass-panel rounded-2xl p-2 flex flex-wrap gap-2 w-full xl:w-auto">
          {(['Entrenador', 'Preparador Físico', 'Analista'] as UserRole[]).map(role => (
            <button
              key={role}
              onClick={() => setCurrentRole(role)}
              className={`flex-1 xl:flex-none px-6 py-3 rounded-xl text-sm sm:text-base font-bold transition-all duration-300 ${
                currentRole === role
                  ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30 scale-[1.02]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              {role === 'Preparador Físico' ? t('dashboard.roleFitness') : role === 'Analista' ? t('dashboard.roleAnalyst') : t('dashboard.roleTrainer')}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10 animate-fade-in-up delay-100">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="glass-panel hover-lift rounded-3xl p-6 flex items-center gap-5 relative overflow-hidden group"
          >
            {/* Background Accent Gradient */}
            <div className={`absolute -right-10 -top-10 w-32 h-32 bg-${stat.color}-glow rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500`}></div>
            
            <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center bg-${stat.color}-glow border border-[var(--color-border)] z-10`}>
              <stat.icon className={`text-${stat.color}`} size={26} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 z-10 flex-1">
              <h3 className="text-sm text-[var(--color-text-muted)] font-bold uppercase tracking-wider mb-1">{stat.title}</h3>
              <p className="text-3xl font-black text-[var(--color-text-primary)] truncate mb-1">{stat.value}</p>
              <p className="text-sm text-[var(--color-text-secondary)] truncate font-medium">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in-up delay-200 flex-1">
        
        {/* Recent Activity Feed */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col hover-lift">
          <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-3">
               <Clock className="text-[var(--color-primary)]" size={24} />
               <h3 className="text-lg font-black uppercase tracking-wider text-[var(--color-text-primary)]">Actividad Reciente</h3>
             </div>
          </div>
          
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
            {recentActivities.length > 0 ? recentActivities.map((act) => (
              <div key={act.id} className="flex items-center gap-4 bg-[var(--color-bg-surface)] border border-[var(--color-border)] p-3 rounded-2xl hover:bg-[var(--color-bg-hover)] transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${act.color}`}>
                  <act.icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{act.type}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
                      {act.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--color-text-primary)] truncate">{act.title}</h4>
                </div>
              </div>
            )) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-muted)] opacity-50 p-6 text-center">
                <Clock size={32} className="mb-3" />
                <p className="text-sm font-medium">No hay actividad reciente registrada en el sistema.</p>
              </div>
            )}
          </div>
        </div>

        {/* Calendar / Events Cards */}
        <div className="glass-panel rounded-3xl p-6 xl:col-span-2 flex flex-col hover-lift">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="text-[var(--color-secondary)]" size={24} />
            <h3 className="text-lg font-black uppercase tracking-wider text-[var(--color-text-primary)]">{t('dashboard.upcomingDbEvents', 'Próximos Eventos')}</h3>
          </div>
          
          <div className="flex-1 flex flex-col gap-4">
             {upcomingEvents.length > 0 ? upcomingEvents.map((event, idx) => (
               <div key={idx} className="flex items-center gap-4 bg-[var(--color-bg-base)] border border-[var(--color-border)] p-4 rounded-2xl hover:bg-[var(--color-bg-hover)] transition-colors">
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                   event.type === 'match' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' :
                   event.type === 'training' ? 'bg-blue-500/10 text-blue-500' :
                   'bg-yellow-500/10 text-yellow-500'
                 }`}>
                   {event.type === 'match' ? <Target size={24} /> : event.type === 'training' ? <Activity size={24} /> : <Award size={24} />}
                 </div>
                 <div className="flex-1 min-w-0">
                   <h4 className="text-base font-bold text-[var(--color-text-primary)] truncate">{event.title}</h4>
                   <p className="text-sm text-[var(--color-text-secondary)] truncate">{event.description}</p>
                 </div>
                 <div className="text-right shrink-0">
                   <p className="text-sm font-bold text-[var(--color-text-primary)]">{event.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                   {event.time && <p className="text-xs text-[var(--color-text-muted)]">{event.time}</p>}
                 </div>
               </div>
             )) : (
               <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)] font-medium">
                 No hay próximos eventos programados.
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
