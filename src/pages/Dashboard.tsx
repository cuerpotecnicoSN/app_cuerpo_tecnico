import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  Activity,
  Target,
  TrendingUp,
  AlertTriangle,
  Award,
  Clock,
  Shield,
  ArrowRight,
  MapPin,
  Flame,
  Plus,
  FileText,
  ChevronRight,
  HeartPulse,
  Dumbbell,
  BarChart3,
  CheckCircle2,
  CalendarDays,
  Cake,
  Swords,
} from 'lucide-react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { getMatches } from '../services/matches';
import { getTrainingSessions } from '../services/training';
import { getSeasonPaniniReports, type SeasonPaniniEntry } from '../services/paniniReports';
import type { MatchDB, TrainingSessionDB } from '../components/types';
import './Dashboard.css';

type UserRole = 'Entrenador' | 'Preparador Físico' | 'Analista';

/* ==========================================================================
   HELPER COMPONENTS: TeamCrest & ResultBadge
   ========================================================================== */

interface TeamCrestProps {
  name?: string;
  logo?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isMilan?: boolean;
}

const TeamCrest: React.FC<TeamCrestProps> = ({ name = 'Equipo', logo, size = 'md', isMilan = false }) => {
  const [imgError, setImgError] = useState(false);

  const isUs = isMilan || (name && name.toLowerCase().includes('milan'));
  const resolvedLogo = isUs ? '/escudo.png' : logo;

  const sizeClasses = {
    xs: 'w-6 h-6 text-[9px] rounded-lg',
    sm: 'w-8 h-8 text-[10px] rounded-xl',
    md: 'w-11 h-11 text-xs rounded-2xl',
    lg: 'w-16 h-16 text-sm rounded-2xl',
    xl: 'w-20 h-20 text-base rounded-3xl',
  }[size];

  const initials = (name || 'FC')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  if (resolvedLogo && !imgError) {
    return (
      <div
        className={`${sizeClasses} shrink-0 bg-white p-1.5 shadow-md ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-105`}
      >
        <img
          src={resolvedLogo}
          alt={name}
          title={name}
          className="w-full h-full object-contain drop-shadow-xs"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback styled shield
  const gradient = isUs
    ? 'from-[#db0030] via-[#900020] to-black text-white border-red-500/40'
    : 'from-slate-700 via-slate-800 to-slate-900 text-amber-300 border-white/10';

  return (
    <div
      title={name}
      className={`${sizeClasses} shrink-0 bg-gradient-to-br ${gradient} p-1 shadow-md border flex flex-col items-center justify-center font-black uppercase tracking-wider transition-all duration-300 hover:scale-105`}
    >
      <span>{initials}</span>
    </div>
  );
};

const ResultScoreBadge: React.FC<{ our?: number | null; rival?: number | null }> = ({ our = 0, rival = 0 }) => {
  const o = our ?? 0;
  const r = rival ?? 0;
  const isWin = o > r;
  const isLoss = o < r;

  const colorClass = isWin
    ? 'bg-emerald-600 text-white shadow-emerald-950/20 ring-1 ring-emerald-500/30'
    : isLoss
      ? 'bg-[#db0030] text-white shadow-red-950/20 ring-1 ring-[#db0030]/30'
      : 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 ring-1 ring-neutral-700';

  return (
    <span
      className={`px-3 py-1 rounded-xl text-sm md:text-base font-black tabular-nums tracking-tight shadow-sm select-none ${colorClass}`}
    >
      {o} – {r}
    </span>
  );
};

/* ==========================================================================
   MAIN DASHBOARD COMPONENT
   ========================================================================== */

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [currentRole, setCurrentRole] = useState<UserRole>('Entrenador');

  // Supabase Data hooks
  const { data: players = [] } = useSupabaseData<any>('players');
  const { data: profiles = [] } = useSupabaseData<any>('profiles');
  const { data: meetings = [] } = useSupabaseData<any>('individual_meetings');
  const { data: dynamics = [] } = useSupabaseData<any>('team_dynamics');
  const { data: matchFocuses = [] } = useSupabaseData<any>('match_focuses');

  // Local state for matches, training sessions & panini reports
  const [matches, setMatches] = useState<MatchDB[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionDB[]>([]);
  const [paniniEntries, setPaniniEntries] = useState<SeasonPaniniEntry[]>([]);

  useEffect(() => {
    getMatches().then(setMatches).catch(() => setMatches([]));
    getTrainingSessions().then(setSessions).catch(() => setSessions([]));
    getSeasonPaniniReports().then(setPaniniEntries).catch(() => setPaniniEntries([]));
  }, []);

  // Total players & medical status
  const totalPlayers = players.length;
  const injuredPlayers = players.filter(
    (p) => p.medical_status === 'Baja' || p.medical_status === 'Lesionado',
  );
  const doubtfulPlayers = players.filter((p) => p.medical_status === 'Duda');
  const availablePlayers = totalPlayers - injuredPlayers.length;
  const availabilityPct = totalPlayers ? Math.round((availablePlayers / totalPlayers) * 100) : 100;

  // Next upcoming match (from today onwards or Scheduled)
  const nextMatch = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = matches
      .filter((m) => m.date >= todayStr || m.status === 'Scheduled' || m.status === 'Live')
      .sort((a, b) => a.date.localeCompare(b.date));
    return upcoming.length > 0 ? upcoming[0] : matches[0] || null;
  }, [matches]);

  // Last finished match (with score or scouting notes)
  const lastMatch = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const past = matches
      .filter((m) => m.date < todayStr || m.status === 'Finished' || m.result_home !== null || m.scouting_notes)
      .sort((a, b) => b.date.localeCompare(a.date));
    return past.length > 0 ? past[0] : null;
  }, [matches]);

  // Upcoming matches list (next 5 fixtures)
  const upcomingMatches = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return matches
      .filter((m) => m.date >= todayStr || m.status === 'Scheduled')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [matches]);

  // Panini Season Totals & Streak
  const teamSeasonStats = useMemo(() => {
    if (!paniniEntries.length) {
      return {
        record: '0-0-0',
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        gf: 0,
        gc: 0,
        avgXgf: null,
        avgXgc: null,
        avgPos: null,
        streak: [],
      };
    }
    const wins = paniniEntries.filter((e) => e.our.goles > e.rival.goles).length;
    const draws = paniniEntries.filter((e) => e.our.goles === e.rival.goles).length;
    const losses = paniniEntries.length - wins - draws;
    const gf = paniniEntries.reduce((a, e) => a + (e.our.goles || 0), 0);
    const gc = paniniEntries.reduce((a, e) => a + (e.rival.goles || 0), 0);

    const xgfVals = paniniEntries.map((e) => e.our.xg).filter((v): v is number => typeof v === 'number');
    const xgcVals = paniniEntries.map((e) => e.rival.xg).filter((v): v is number => typeof v === 'number');
    const posVals = paniniEntries
      .map((e) => e.our.estadisticas?.total_partido?.posesion_pct)
      .filter((v): v is number => typeof v === 'number');

    const avgXgf = xgfVals.length ? (xgfVals.reduce((a, b) => a + b, 0) / xgfVals.length).toFixed(2) : null;
    const avgXgc = xgcVals.length ? (xggc => (xggc.reduce((a, b) => a + b, 0) / xggc.length).toFixed(2))(xgcVals) : null;
    const avgPos = posVals.length ? `${Math.round(posVals.reduce((a, b) => a + b, 0) / posVals.length)}%` : null;

    const streak = paniniEntries.slice(-5).map((e) => {
      if (e.our.goles > e.rival.goles) return { letter: 'V', color: 'bg-emerald-600 text-white' };
      if (e.our.goles < e.rival.goles) return { letter: 'D', color: 'bg-[#db0030] text-white' };
      return { letter: 'E', color: 'bg-neutral-800 text-white' };
    });

    return {
      record: `${wins}-${draws}-${losses}`,
      wins,
      draws,
      losses,
      points: wins * 3 + draws,
      gf,
      gc,
      avgXgf,
      avgXgc,
      avgPos,
      streak,
    };
  }, [paniniEntries]);

  // Days until next match calculation
  const daysUntilNextMatch = useMemo(() => {
    if (!nextMatch?.date) return null;
    const matchD = new Date(nextMatch.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    matchD.setHours(0, 0, 0, 0);
    const diffTime = matchD.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [nextMatch]);

  // Upcoming Birthdays
  const upcomingBirthdays = useMemo(() => {
    const list: any[] = [];
    const today = new Date();
    const currentYear = today.getFullYear();

    players.forEach((p: any) => {
      if (p.birth_date) {
        const b = new Date(p.birth_date);
        let nextB = new Date(currentYear, b.getMonth(), b.getDate());
        if (nextB < today) nextB = new Date(currentYear + 1, b.getMonth(), b.getDate());
        const days = Math.ceil((nextB.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 45) {
          list.push({
            id: p.id,
            name: p.football_name || `${p.first_name} ${p.last_name}`,
            photo: p.photo_url,
            dorsal: p.kit_number || p.dorsal,
            date: nextB,
            days,
            age: nextB.getFullYear() - b.getFullYear(),
            isStaff: false,
          });
        }
      }
    });

    profiles.forEach((pr: any) => {
      if (pr.birth_date) {
        const b = new Date(pr.birth_date);
        let nextB = new Date(currentYear, b.getMonth(), b.getDate());
        if (nextB < today) nextB = new Date(currentYear + 1, b.getMonth(), b.getDate());
        const days = Math.ceil((nextB.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 45) {
          list.push({
            id: pr.id,
            name: pr.full_name || 'Staff Técnico',
            date: nextB,
            days,
            age: nextB.getFullYear() - b.getFullYear(),
            isStaff: true,
          });
        }
      }
    });

    return list.sort((a, b) => a.days - b.days).slice(0, 4);
  }, [players, profiles]);

  // Upcoming Training Sessions
  const upcomingSessions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return sessions
      .filter((s) => s.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);
  }, [sessions]);

  // Recent activity stream
  const recentActivities = useMemo(() => {
    const acts: any[] = [];

    meetings.forEach((m: any) => {
      acts.push({
        id: `meeting-${m.id}`,
        type: 'Reunión Individual',
        title: m.topic || 'Seguimiento de jugador',
        date: new Date(m.created_at || m.date || Date.now()),
        icon: Users,
        color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
      });
    });

    dynamics.forEach((d: any) => {
      acts.push({
        id: `dynamic-${d.id}`,
        type: 'Dinámica de Grupo',
        title: d.title || 'Sesión colectiva',
        date: new Date(d.created_at || d.date || Date.now()),
        icon: Activity,
        color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30',
      });
    });

    matchFocuses.forEach((f: any) => {
      acts.push({
        id: `focus-${f.id}`,
        type: 'Foco Táctico',
        title: f.title,
        date: new Date(f.created_at || Date.now()),
        icon: Target,
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
      });
    });

    return acts.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  }, [meetings, dynamics, matchFocuses]);

  // Dynamic KPI Stats based on current role
  const kpis = useMemo(() => {
    switch (currentRole) {
      case 'Preparador Físico':
        return [
          {
            title: 'Disponibilidad Médica',
            value: `${availabilityPct}%`,
            subtitle: `${availablePlayers} de ${totalPlayers} aptos`,
            icon: HeartPulse,
            color: 'emerald',
            link: '/players',
          },
          {
            title: 'Bajas / En duda',
            value: `${injuredPlayers.length + doubtfulPlayers.length}`,
            subtitle: injuredPlayers.length > 0 ? `${injuredPlayers[0]?.first_name || '1'} con parte médico` : 'Sin bajas graves',
            icon: AlertTriangle,
            color: injuredPlayers.length > 0 ? 'red' : 'neutral',
            link: '/players',
          },
          {
            title: 'Sesiones de Entrenamiento',
            value: `${sessions.length}`,
            subtitle: `${upcomingSessions.length} programadas`,
            icon: Dumbbell,
            color: 'blue',
            link: '/training',
          },
          {
            title: 'Días para Competir',
            value: daysUntilNextMatch !== null ? `${daysUntilNextMatch}d` : '–',
            subtitle: nextMatch ? `${nextMatch.is_home ? 'vs' : '@'} ${nextMatch.opponent}` : 'Sin partido',
            icon: CalendarDays,
            color: 'gold',
            link: '/calendar',
          },
        ];
      case 'Analista':
        return [
          {
            title: 'Informes Panini',
            value: `${paniniEntries.length}`,
            subtitle: 'Partidos analizados',
            icon: FileText,
            color: 'blue',
            link: '/team',
          },
          {
            title: 'xG Medio Favor / Contra',
            value: teamSeasonStats.avgXgf ? `${teamSeasonStats.avgXgf} / ${teamSeasonStats.avgXgc || '0'}` : '–',
            subtitle: 'Goles esperados por PJ',
            icon: BarChart3,
            color: 'emerald',
            link: '/team',
          },
          {
            title: 'Posesión Media',
            value: teamSeasonStats.avgPos || '–',
            subtitle: 'Control de balón del equipo',
            icon: TrendingUp,
            color: 'purple',
            link: '/team',
          },
          {
            title: 'Focos Tácticos',
            value: `${matchFocuses.length}`,
            subtitle: 'Objetivos en seguimiento',
            icon: Target,
            color: 'gold',
            link: '/matches',
          },
        ];
      default: // Entrenador
        return [
          {
            title: 'Balance Temporada',
            value: teamSeasonStats.record !== '0-0-0' ? teamSeasonStats.record : `${paniniEntries.length} PJ`,
            subtitle: `${teamSeasonStats.points} pts · ${teamSeasonStats.gf} GF / ${teamSeasonStats.gc} GC`,
            icon: Award,
            color: 'red',
            link: '/team',
          },
          {
            title: 'Disponibles',
            value: `${availablePlayers} / ${totalPlayers}`,
            subtitle: `${availabilityPct}% de la plantilla apta`,
            icon: Users,
            color: 'emerald',
            link: '/players',
          },
          {
            title: 'Próximo Rival',
            value: nextMatch ? nextMatch.opponent : '–',
            subtitle: nextMatch
              ? `${nextMatch.is_home ? 'En casa' : 'A domicilio'} · ${daysUntilNextMatch !== null ? (daysUntilNextMatch === 0 ? 'Hoy' : `En ${daysUntilNextMatch} días`) : ''}`
              : 'Calendario libre',
            icon: Target,
            color: 'gold',
            link: nextMatch ? `/matches?matchId=${nextMatch.id}` : '/matches',
          },
          {
            title: 'Focos Activos',
            value: `${matchFocuses.length}`,
            subtitle: 'Consignas tácticas activas',
            icon: Flame,
            color: 'purple',
            link: '/matches',
          },
        ];
    }
  }, [
    currentRole,
    availabilityPct,
    availablePlayers,
    totalPlayers,
    injuredPlayers,
    doubtfulPlayers,
    sessions,
    upcomingSessions,
    daysUntilNextMatch,
    nextMatch,
    paniniEntries,
    teamSeasonStats,
    matchFocuses,
  ]);

  return (
    <div className="space-y-6 animate-fade-in text-gray-900 dark:text-white">
      
      {/* ==========================================================================
          HERO BANNER: Squad Photo Backdrop & Next Match Showcase
          ========================================================================== */}
      <div className="dashboard-hero-banner text-white p-6 sm:p-8 relative">
        <div className="dashboard-hero-bg" />
        <div className="dashboard-hero-overlay" />

        {/* Top Header inside Hero */}
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <TeamCrest name="AC Milan Futuro" isMilan size="lg" />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-[#db0030] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  AC MILAN FUTURO
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-gray-200 text-[11px] font-bold border border-white/10">
                  {t('dashboard.season', 'Temporada 2026/27')}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight uppercase mt-1 drop-shadow-md">
                Centro de Mando Técnico
              </h1>
            </div>
          </div>

          {/* Role Segmented Switcher & Quick Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-1 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 flex gap-1 shadow-xl">
              {(['Entrenador', 'Preparador Físico', 'Analista'] as UserRole[]).map((role) => {
                const active = currentRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setCurrentRole(role)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all duration-300 ${
                      active
                        ? 'bg-gradient-to-r from-[#db0030] to-[#9c0022] text-white shadow-lg scale-[1.02]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {role === 'Entrenador' && <Shield size={15} />}
                    {role === 'Preparador Físico' && <HeartPulse size={15} />}
                    {role === 'Analista' && <BarChart3 size={15} />}
                    <span>{role}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Action Links */}
            <div className="flex items-center gap-2">
              <Link
                to="/matches"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all shadow-sm"
              >
                <Plus size={14} className="text-[#db0030]" />
                <span>Nuevo Partido</span>
              </Link>
              <Link
                to="/training"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all shadow-sm"
              >
                <Plus size={14} className="text-emerald-400" />
                <span>Nueva Sesión</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Hero Next Match Details */}
        <div className="relative z-10 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                <Swords size={14} /> PRÓXIMO ENCUENTRO
              </span>
              {nextMatch?.competition && (
                <span className="text-xs font-bold text-gray-200 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  {nextMatch.competition}
                </span>
              )}
            </div>

            {daysUntilNextMatch !== null && (
              <span className="px-3 py-1 rounded-full bg-[#db0030] text-white text-xs font-black uppercase tracking-wider shadow-md">
                {daysUntilNextMatch === 0
                  ? '¡HOY ES DÍA DE PARTIDO!'
                  : daysUntilNextMatch === 1
                    ? 'MAÑANA'
                    : `FALTAN ${daysUntilNextMatch} DÍAS`}
              </span>
            )}
          </div>

          {nextMatch ? (
            <div className="grid grid-cols-1 sm:grid-cols-11 gap-4 items-center my-3 bg-black/40 backdrop-blur-md p-5 rounded-2xl border border-white/10">
              {/* Team 1: AC Milan Futuro */}
              <div className="sm:col-span-5 flex items-center gap-3.5">
                <TeamCrest name="AC Milan Futuro" isMilan size="lg" />
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-red-400 block">
                    {nextMatch.is_home ? 'LOCAL' : 'VISITANTE'}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                    AC Milan Futuro
                  </h3>
                  <span className="text-xs text-gray-400">Italia · Serie D</span>
                </div>
              </div>

              {/* VS Indicator */}
              <div className="sm:col-span-1 flex flex-col items-center justify-center my-1 sm:my-0">
                <div className="w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-xs font-black text-amber-300">
                  VS
                </div>
              </div>

              {/* Team 2: Opponent */}
              <div className="sm:col-span-5 flex items-center sm:flex-row-reverse sm:text-right gap-3.5">
                <TeamCrest
                  name={nextMatch.opponent}
                  logo={nextMatch.is_home ? nextMatch.away_logo : nextMatch.home_logo}
                  size="lg"
                />
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 block">
                    {nextMatch.is_home ? 'VISITANTE' : 'LOCAL'}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                    {nextMatch.opponent}
                  </h3>
                  <span className="text-xs text-gray-400">Rival de Jornada</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-gray-400 text-sm">
              No hay partidos programados en el calendario próximo.
            </div>
          )}

          {nextMatch && (
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-white/10 text-xs">
              <div className="flex flex-wrap items-center gap-3 text-gray-300 font-semibold">
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                  <Calendar size={13} className="text-indigo-300" />
                  {new Date(nextMatch.date).toLocaleDateString(i18n.language, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                {nextMatch.time && (
                  <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                    <Clock size={13} className="text-indigo-300" />
                    {nextMatch.time}
                  </span>
                )}
                {nextMatch.stadium && (
                  <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                    <MapPin size={13} className="text-indigo-300" />
                    {nextMatch.stadium}
                  </span>
                )}
              </div>

              <Link
                to={`/matches?matchId=${nextMatch.id}`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#db0030] hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md"
              >
                <span>Focos & Scouting</span>
                <ChevronRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================================================
          KPI METRICS RIBBON (CLEAN WHITE THEME)
          ========================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const colorStyles: Record<string, { bg: string; icon: string; border: string }> = {
            red: { bg: 'bg-red-50 dark:bg-red-950/40', icon: 'text-[#db0030]', border: 'border-red-200/80 dark:border-red-800/40' },
            emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', icon: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/80 dark:border-emerald-800/40' },
            blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', icon: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200/80 dark:border-blue-800/40' },
            gold: { bg: 'bg-amber-50 dark:bg-amber-950/40', icon: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200/80 dark:border-amber-800/40' },
            purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', icon: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200/80 dark:border-purple-800/40' },
            neutral: { bg: 'bg-gray-100 dark:bg-neutral-800', icon: 'text-gray-600 dark:text-gray-300', border: 'border-gray-200 dark:border-neutral-700' },
          };
          const style = colorStyles[kpi.color] || colorStyles.red;

          return (
            <Link
              key={index}
              to={kpi.link}
              className="dashboard-card dashboard-card-hover p-5 flex items-center gap-4 group"
            >
              <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 ${style.bg} ${style.border} border shadow-xs group-hover:scale-105 transition-transform`}>
                <kpi.icon className={style.icon} size={24} strokeWidth={2.4} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-0.5">
                  {kpi.title}
                </span>
                <p className="text-2xl font-black text-gray-900 dark:text-white truncate tracking-tight">
                  {kpi.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold truncate mt-0.5">
                  {kpi.subtitle}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-700 dark:group-hover:text-white transition-colors" />
            </Link>
          );
        })}
      </div>

      {/* ==========================================================================
          MAIN DASHBOARD 2-COLUMN GRID (WHITE THEME)
          ========================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ==========================================================================
            LEFT COLUMN (7 cols): LAST MATCH SNAPSHOT, UPCOMING MATCHES & FOCOS
            ========================================================================== */}
        <div className="xl:col-span-7 space-y-6">

          {/* Last Match Snapshot & Form */}
          {lastMatch && (
            <div className="dashboard-card p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Award size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white">
                      Último Partido Disputado
                    </h2>
                    <p className="text-xs text-gray-500">
                      {lastMatch.competition || 'Competición'} ·{' '}
                      {new Date(lastMatch.date).toLocaleDateString(i18n.language, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>

                <Link
                  to="/team"
                  className="text-xs font-bold text-[#db0030] hover:text-red-700 flex items-center gap-1 transition-colors"
                >
                  <span>Ver Informe Panini</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-200/80 dark:border-white/10">
                {/* Milan side */}
                <div className="flex items-center gap-3">
                  <TeamCrest name="Milan Futuro" isMilan size="md" />
                  <div>
                    <span className="font-black text-sm uppercase text-gray-900 dark:text-white block">
                      Milan Futuro
                    </span>
                    <span className="text-[11px] font-bold text-gray-400">
                      {lastMatch.is_home ? 'Local' : 'Visitante'}
                    </span>
                  </div>
                </div>

                {/* Score badge */}
                <div className="flex items-center justify-center">
                  {lastMatch.result_home !== null && lastMatch.result_away !== null ? (
                    <ResultScoreBadge
                      our={lastMatch.is_home ? lastMatch.result_home : lastMatch.result_away}
                      rival={lastMatch.is_home ? lastMatch.result_away : lastMatch.result_home}
                    />
                  ) : (
                    <span className="text-sm font-black text-gray-400">Finalizado</span>
                  )}
                </div>

                {/* Rival side */}
                <div className="flex items-center sm:flex-row-reverse sm:text-right gap-3">
                  <TeamCrest
                    name={lastMatch.opponent}
                    logo={lastMatch.is_home ? lastMatch.away_logo : lastMatch.home_logo}
                    size="md"
                  />
                  <div>
                    <span className="font-black text-sm uppercase text-gray-900 dark:text-white block truncate max-w-[130px]">
                      {lastMatch.opponent}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400">
                      {lastMatch.is_home ? 'Visitante' : 'Local'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Season Streak Bar */}
              {teamSeasonStats.streak.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-500">
                    Racha 5P: <span className="text-gray-900 dark:text-white font-black">{teamSeasonStats.record}</span> ({teamSeasonStats.points} pts)
                  </span>
                  <div className="flex items-center gap-1.5">
                    {teamSeasonStats.streak.map((st, idx) => (
                      <span
                        key={idx}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black ${st.color} shadow-xs`}
                      >
                        {st.letter}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upcoming Matches Schedule with TEAM CRESTS */}
          <div className="dashboard-card p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#db0030] flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white">
                    Calendario de Competición
                  </h2>
                  <p className="text-xs text-gray-500">Próximos partidos oficiales con escudos y fechas</p>
                </div>
              </div>

              <Link
                to="/calendar"
                className="text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Ver Calendario</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingMatches.length > 0 ? (
                upcomingMatches.map((m, idx) => (
                  <Link
                    key={m.id || idx}
                    to={`/matches?matchId=${m.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50/70 hover:bg-gray-100/90 dark:bg-neutral-800/50 dark:hover:bg-neutral-800 border border-gray-200/80 dark:border-white/5 transition-all duration-200 group shadow-xs"
                  >
                    {/* Crests and Match Title */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Matchday Badge */}
                      <span className="px-2 py-1 rounded-lg bg-white dark:bg-neutral-700 text-[10px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 shrink-0 border border-gray-200 dark:border-neutral-600">
                        {m.competition?.match(/jornada\s*(\d+)/i)?.[0] || `P${idx + 1}`}
                      </span>

                      {/* Escudos matchup */}
                      <div className="flex items-center gap-2 shrink-0">
                        <TeamCrest name="Milan Futuro" isMilan size="sm" />
                        <span className="text-xs font-black text-gray-400">vs</span>
                        <TeamCrest
                          name={m.opponent}
                          logo={m.is_home ? m.away_logo : m.home_logo}
                          size="sm"
                        />
                      </div>

                      {/* Team names & Venue */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-gray-900 dark:text-white truncate group-hover:text-[#db0030] transition-colors">
                            {m.is_home ? `vs ${m.opponent}` : `@ ${m.opponent}`}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase ${
                              m.is_home
                                ? 'bg-red-50 text-[#db0030] border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40'
                                : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40'
                            }`}
                          >
                            {m.is_home ? 'Casa' : 'Fuera'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {m.competition || 'Competición oficial'}
                        </p>
                      </div>
                    </div>

                    {/* Date & Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/50 dark:border-white/5">
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-black text-gray-900 dark:text-white">
                          {new Date(m.date).toLocaleDateString(i18n.language, {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                        <p className="text-[11px] text-gray-500">{m.time || '15:00'}</p>
                      </div>
                      <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 text-sm">
                  No hay próximos partidos programados.
                </div>
              )}
            </div>
          </div>

          {/* Active Tactical Focuses */}
          <div className="dashboard-card p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Target size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white">
                    Focos Tácticos de Partido Activos
                  </h2>
                  <p className="text-xs text-gray-500">Consignas y objetivos para el cuerpo técnico</p>
                </div>
              </div>

              <Link
                to="/matches"
                className="text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Gestionar Focos</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {matchFocuses.length > 0 ? (
                matchFocuses.slice(0, 4).map((f: any) => {
                  const phase = f.details?.phase || f.details?.phases?.[0] || 'Ofensivo';
                  const phaseColors: Record<string, string> = {
                    Ofensivo: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
                    Defensivo: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40',
                    ABP: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
                  };
                  return (
                    <div
                      key={f.id}
                      className="p-4 rounded-2xl bg-gray-50/70 dark:bg-neutral-800/50 border border-gray-200/80 dark:border-white/5 flex flex-col justify-between gap-3 hover:border-amber-400 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${phaseColors[phase] || 'bg-gray-100 text-gray-700'}`}>
                            {phase}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            {f.details?.focusType || 'Táctico'}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-gray-900 dark:text-white leading-snug">{f.title}</h4>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-200/50 dark:border-white/5">
                        <span>{f.details?.assignedTo || 'Todo el equipo'}</span>
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 py-6 text-center text-gray-500 text-sm">
                  No hay focos tácticos creados actualmente.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ==========================================================================
            RIGHT COLUMN (5 cols): SQUAD STATUS, TRAINING & BIRTHDAYS
            ========================================================================== */}
        <div className="xl:col-span-5 space-y-6">

          {/* Squad Health & Availability Widget */}
          <div className="dashboard-card p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white">
                    Estado de la Plantilla
                  </h2>
                  <p className="text-xs text-gray-500">Disponibilidad médica del primer equipo</p>
                </div>
              </div>

              <Link
                to="/players"
                className="text-xs font-bold text-[#db0030] hover:text-red-700 transition-colors"
              >
                Ver Plantilla
              </Link>
            </div>

            {/* Availability progress bar */}
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-600 dark:text-gray-300">Aptos para competir</span>
                <span className="text-emerald-600 dark:text-emerald-400">{availablePlayers} de {totalPlayers} ({availabilityPct}%)</span>
              </div>
              <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${(availablePlayers / (totalPlayers || 1)) * 100}%` }}
                />
                <div
                  className="bg-amber-400 h-full transition-all duration-500"
                  style={{ width: `${(doubtfulPlayers.length / (totalPlayers || 1)) * 100}%` }}
                />
                <div
                  className="bg-[#db0030] h-full transition-all duration-500"
                  style={{ width: `${(injuredPlayers.length / (totalPlayers || 1)) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 pt-1">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Aptos: {availablePlayers}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Duda: {doubtfulPlayers.length}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#db0030]" /> Baja: {injuredPlayers.length}</span>
              </div>
            </div>

            {/* Quick list of unavailable / alert players */}
            {injuredPlayers.length > 0 || doubtfulPlayers.length > 0 ? (
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/10">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-gray-400 block mb-2">
                  Partes médicos activos
                </span>
                {[...injuredPlayers, ...doubtfulPlayers].slice(0, 3).map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-200/80 dark:border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-neutral-700 flex items-center justify-center font-black text-xs text-gray-700 dark:text-gray-300">
                        {p.kit_number || p.dorsal || '–'}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {p.football_name || `${p.first_name} ${p.last_name}`}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md font-black uppercase text-[10px] ${
                        p.medical_status === 'Baja'
                          ? 'bg-red-50 text-[#db0030] border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40'
                      }`}
                    >
                      {p.medical_status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>Toda la plantilla está actualmente apta sin bajas.</span>
              </div>
            )}
          </div>

          {/* Upcoming Training Sessions */}
          <div className="dashboard-card p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Activity size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white">
                    Próximas Sesiones
                  </h2>
                  <p className="text-xs text-gray-500">Planificación de entrenamientos</p>
                </div>
              </div>

              <Link
                to="/training"
                className="text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Ver Sesiones</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingSessions.length > 0 ? (
                upcomingSessions.map((s) => (
                  <Link
                    key={s.id}
                    to="/training"
                    className="p-3.5 rounded-2xl bg-gray-50/70 hover:bg-gray-100 dark:bg-neutral-800/50 dark:hover:bg-neutral-800 border border-gray-200/80 dark:border-white/5 flex items-center justify-between gap-3 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center shrink-0">
                        <Clock size={16} />
                        <span className="text-[9px] font-black">{s.time || '10:30'}</span>
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {s.title}
                        </h4>
                        <p className="text-[11px] text-gray-500 truncate max-w-[200px]">
                          {s.objective || 'Trabajo táctico'}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-black text-gray-500 shrink-0">
                      {new Date(s.date).toLocaleDateString(i18n.language, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="py-6 text-center text-gray-500 text-sm">
                  No hay sesiones programadas próximamente.
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Birthdays (Player & Staff) */}
          {upcomingBirthdays.length > 0 && (
            <div className="dashboard-card p-6">
              <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-gray-100 dark:border-white/10">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Cake size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white">
                    Cumpleaños del Mes
                  </h2>
                  <p className="text-xs text-gray-500">Celebraciones de plantilla y cuerpo técnico</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upcomingBirthdays.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-2xl bg-gray-50/70 dark:bg-neutral-800/50 border border-gray-200/80 dark:border-white/5 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black text-xs shrink-0">
                      {b.dorsal ? `#${b.dorsal}` : '🎂'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">{b.name}</h4>
                      <p className="text-[10px] text-purple-600 dark:text-purple-300 font-bold">
                        {b.days === 0 ? '¡Hoy!' : b.days === 1 ? 'Mañana' : `En ${b.days} días`} · Cumple {b.age}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity Timeline */}
          <div className="dashboard-card p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white">
                    Actividad Reciente
                  </h2>
                  <p className="text-xs text-gray-500">Registro de reuniones y dinámicas</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/70 dark:bg-neutral-800/40 border border-gray-200/60 dark:border-white/5"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${act.color}`}>
                      <act.icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-black uppercase tracking-wider text-gray-400">
                          {act.type}
                        </span>
                        <span className="text-[10px] text-gray-400 font-semibold">
                          {act.date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate mt-0.5">
                        {act.title}
                      </h5>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-gray-400 text-xs">
                  Sin actividad reciente registrada.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
