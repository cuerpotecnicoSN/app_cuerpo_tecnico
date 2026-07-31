import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Users, Activity, Target, TrendingUp, AlertTriangle, Video } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSupabaseData } from '../hooks/useSupabaseData';
import WeeklyCalendar, { CalendarEvent } from '../components/dashboard/WeeklyCalendar';
import { getMatches } from '../services/matches';
import { getTrainingSessions } from '../services/training';
import type { MatchDB, TrainingSessionDB } from '../components/types';
import './Dashboard.css';

type UserRole = 'Entrenador' | 'Preparador Físico' | 'Analista';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [currentRole, setCurrentRole] = useState<UserRole>('Entrenador');

  // Fetch real data from Supabase
  const { data: players = [], loading: loadingPlayers } = useSupabaseData<any>('players');
  const { data: profiles = [] } = useSupabaseData<any>('profiles');
  const { data: physicalStats = [] } = useSupabaseData<any>('physical_metrics_history');
  const [matches, setMatches] = useState<MatchDB[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionDB[]>([]);

  useEffect(() => {
    getMatches().then(setMatches).catch(() => setMatches([]));
    getTrainingSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  // Calcular métricas reales
  const totalPlayers = players.length;
  const injuredPlayers = players.filter(p => p.medical_status === 'Baja' || p.medical_status === 'Lesionado').length;
  const availablePlayers = totalPlayers - injuredPlayers;

  // Generar datos para el gráfico a partir de datos reales (o cero si no hay)
  const performanceData = useMemo(() => {
    if (!physicalStats || physicalStats.length === 0) {
      return [
        { name: t('dashboard.days.mon'), load: 0, intensity: 0 },
        { name: t('dashboard.days.tue'), load: 0, intensity: 0 },
        { name: t('dashboard.days.wed'), load: 0, intensity: 0 },
        { name: t('dashboard.days.thu'), load: 0, intensity: 0 },
        { name: t('dashboard.days.fri'), load: 0, intensity: 0 },
        { name: t('dashboard.days.sat'), load: 0, intensity: 0 },
      ];
    }
    // Lógica básica para mapear datos reales (se puede expandir)
    return physicalStats.slice(0, 6).map((stat: any, i: number) => ({
      name: `${t('dashboard.dayLabel')} ${i+1}`,
      load: stat.fatigue_level * 100 || 0,
      intensity: stat.stress_level * 100 || 0
    }));
  }, [physicalStats, t]);

  const getStatsByRole = () => {
    switch(currentRole) {
      case 'Preparador Físico':
        return [
          { title: t('dashboard.weeklyLoadAccumulated'), value: physicalStats.length > 0 ? t('dashboard.calculating') : '0 AU', subtitle: t('dashboard.dbConnected'), icon: Activity, color: 'secondary' },
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
      default: // Entrenador
        return [
          { title: t('dashboard.nextMatch'), value: t('dashboard.noEvents'), subtitle: t('dashboard.addInCalendar'), icon: Target, color: 'primary' },
          { title: t('dashboard.availablePlayers'), value: `${availablePlayers} / ${totalPlayers}`, subtitle: injuredPlayers > 0 ? `${injuredPlayers} ${t('dashboard.injuredSuffix')}` : t('dashboard.allHealthy'), icon: Users, color: 'secondary' },
          { title: t('dashboard.trainingLoad'), value: 'N/A', subtitle: t('dashboard.missingSessionData'), icon: Activity, color: 'accent' },
          { title: t('dashboard.daysToComp'), value: '-', subtitle: t('dashboard.emptyCalendar'), icon: Calendar, color: 'primary' },
        ];
    }
  };

  const stats = getStatsByRole();

  // Generar eventos para el calendario
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    const today = new Date();
    
    // 1. Cumpleaños de la semana actual
    players.forEach((player: any) => {
      if (player.birth_date) {
        const birthDate = new Date(player.birth_date);
        // Set the birthday to the current year
        const currentYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        
        // Comprobar si es de esta semana (simplificado: cae cerca de hoy o simplemente lo añadimos al día correspondiente)
        events.push({
          id: `bday-${player.id}`,
          title: `Cumpleaños: ${player.first_name} ${player.last_name}`,
          date: currentYearBirthday,
          type: 'birthday',
          description: `${player.first_name} cumple años!`
        });
      }
    });

    // 1b. Cumpleaños del cuerpo técnico
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
  }, [players, matches, sessions]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">

        {/* Simulador de Roles */}
        <div className="flex gap-1 bg-[var(--color-bg-surface)] p-1 rounded-xl border border-[var(--color-border)]">
          {(['Entrenador', 'Preparador Físico', 'Analista'] as UserRole[]).map(role => (
            <button
              key={role}
              onClick={() => setCurrentRole(role)}
              className={`px-4 py-2 rounded-lg text-base font-semibold transition-all ${
                currentRole === role
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              {role === 'Preparador Físico' ? t('dashboard.roleFitness') : role === 'Analista' ? t('dashboard.roleAnalyst') : t('dashboard.roleTrainer')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-${stat.color}-glow`}>
              <stat.icon className={`text-${stat.color}`} size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm text-[var(--color-text-muted)] font-semibold">{stat.title}</h3>
              <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-0.5 truncate">{stat.value}</p>
              <p className="text-sm mt-0.5 text-[var(--color-text-secondary)] truncate">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">{t('dashboard.weeklyLoadVsIntensity')}</h3>
            <span className="badge badge-neutral">{t('dashboard.realDbData')}</span>
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="load" stroke="var(--color-primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLoad)" />
                <Area type="monotone" dataKey="intensity" stroke="var(--color-secondary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm flex flex-col xl:col-span-2">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-5">
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">{t('dashboard.upcomingDbEvents', 'Calendario Semanal')}</h3>
            <span className="badge badge-neutral text-xs px-2 py-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#eab308]"></span> Cumpleaños
              <span className="w-2 h-2 rounded-full bg-[#3b82f6] ml-2"></span> Entrenamientos
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] ml-2"></span> Partidos
            </span>
          </div>
          <WeeklyCalendar events={calendarEvents} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
