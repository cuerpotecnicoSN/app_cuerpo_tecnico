import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Users, Activity, Target, TrendingUp, AlertTriangle, Video } from 'lucide-react';
import { usePrint } from "../components/reports/PrintContext";
import InterventionReport from "../components/reports/InterventionReport";
import PlayerSlideReport from "../components/reports/PlayerSlideReport";
import StaffSlideReport from "../components/reports/StaffSlideReport";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSupabaseData } from '../hooks/useSupabaseData';
import './Dashboard.css';

type UserRole = 'Entrenador' | 'Preparador Físico' | 'Analista';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { printReport } = usePrint();
  const [currentRole, setCurrentRole] = useState<UserRole>('Entrenador');
  
  // Fetch real data from Supabase
  const { data: players = [], loading: loadingPlayers } = useSupabaseData<any>('players');
  const { data: physicalStats = [] } = useSupabaseData<any>('physical_metrics_history');
  const { data: matches = [] } = useSupabaseData<any>('sports_stats');

  // Calcular métricas reales
  const totalPlayers = players.length;
  const injuredPlayers = players.filter(p => p.medical_status === 'Baja' || p.medical_status === 'Lesionado').length;
  const availablePlayers = totalPlayers - injuredPlayers;

  // Generar datos para el gráfico a partir de datos reales (o cero si no hay)
  const performanceData = useMemo(() => {
    if (!physicalStats || physicalStats.length === 0) {
      return [
        { name: 'Lun', load: 0, intensity: 0 },
        { name: 'Mar', load: 0, intensity: 0 },
        { name: 'Mié', load: 0, intensity: 0 },
        { name: 'Jue', load: 0, intensity: 0 },
        { name: 'Vie', load: 0, intensity: 0 },
        { name: 'Sáb', load: 0, intensity: 0 },
      ];
    }
    // Lógica básica para mapear datos reales (se puede expandir)
    return physicalStats.slice(0, 6).map((stat: any, i: number) => ({
      name: `Día ${i+1}`,
      load: stat.fatigue_level * 100 || 0,
      intensity: stat.stress_level * 100 || 0
    }));
  }, [physicalStats]);

  const getStatsByRole = () => {
    switch(currentRole) {
      case 'Preparador Físico':
        return [
          { title: 'Carga Semanal Acumulada', value: physicalStats.length > 0 ? 'Calculando...' : '0 AU', subtitle: 'Base de datos conectada', icon: Activity, color: 'secondary' },
          { title: 'Jugadores en Riesgo', value: injuredPlayers.toString(), subtitle: 'Fatiga alta (>80%)', icon: AlertTriangle, color: 'danger' },
          { title: 'Disponibilidad Médica', value: totalPlayers ? `${Math.round((availablePlayers/totalPlayers)*100)}%` : '0%', subtitle: `${injuredPlayers} Lesionados`, icon: Users, color: 'primary' },
          { title: 'RPE Promedio Ayer', value: 'N/A', subtitle: 'Esperando datos', icon: TrendingUp, color: 'accent' },
        ];
      case 'Analista':
        return [
          { title: 'Próximo Rival', value: 'Por definir', subtitle: 'Sin partidos en BD', icon: Target, color: 'primary' },
          { title: 'Clips de Video Pendientes', value: '0', subtitle: 'Para reunión táctica', icon: Video, color: 'secondary' },
          { title: 'xG Último Partido', value: '0.00', subtitle: '-', icon: Activity, color: 'accent' },
          { title: 'Pérdidas en Campo Propio', value: '0', subtitle: 'Esperando datos', icon: TrendingUp, color: 'secondary' },
        ];
      default: // Entrenador
        return [
          { title: t('dashboard.nextMatch'), value: 'Sin eventos', subtitle: 'Añadir en Calendario', icon: Target, color: 'primary' },
          { title: t('dashboard.availablePlayers'), value: `${availablePlayers} / ${totalPlayers}`, subtitle: injuredPlayers > 0 ? `${injuredPlayers} lesionados` : 'Todos sanos', icon: Users, color: 'secondary' },
          { title: t('dashboard.trainingLoad'), value: 'N/A', subtitle: 'Faltan datos de sesión', icon: Activity, color: 'accent' },
          { title: t('dashboard.daysToComp'), value: '-', subtitle: 'Calendario vacío', icon: Calendar, color: 'primary' },
        ];
    }
  };

  const stats = getStatsByRole();

  return (
    <div className="dashboard animate-fade-in">
      <div className="flex gap-2 mb-6 p-4 bg-slate-900 border border-slate-700 rounded-xl">
        <span className="text-slate-400 font-bold self-center">Probar Informes:</span>
        <button onClick={() => printReport(<InterventionReport player={{name: "Sergio Navarro", birthDate: "01/01/2000", position: "Mediocentro"}} interventions={[]} />)} className="btn btn-sm btn-outline text-red-500 border-red-500 hover:bg-red-500 hover:text-white">Imprimir Tabla Excel</button>
        <button onClick={() => printReport(<PlayerSlideReport player={{name: "SERGIO NAVARRO", position: "Mediocentro", info: "Información General"}} data={{personalInfo: "Jugador de la cantera...", sportsAssessment: "Buen rendimiento físico", implementation: "A mejorar", sportsInfo: "Partidos jugados: 10", development: "Progresión rápida", future: "Potencial alto"}} />)} className="btn btn-sm btn-outline text-white border-white hover:bg-white hover:text-black">Imprimir Diapositiva Jugador</button>
        <button onClick={() => printReport(<StaffSlideReport staff={{name: "VALERIO BRANDI", role: "Technical Assistant", periodFrom: "Enero", periodTo: "Junio"}} data={{selfOrganization: "Buena gestión del tiempo", matchPlan: "Táctico", prePostTraining: "Siempre preparado", interventionFeedback: "Claro y directo", trainingExercises: "Innovadores", rolesResponsibilities: "Cumplidas", coachStaffRelationships: "Excelente compañerismo", keyPoints: "Liderazgo"}} />)} className="btn btn-sm btn-outline text-white border-white hover:bg-white hover:text-black">Imprimir Diapositiva Staff</button>
      </div>
      
      <div className="dashboard-header flex justify-between items-center">
        <div>
          <h1 className="h1">{t('dashboard.welcome')}, Staff {loadingPlayers && <span className="text-sm font-normal text-muted">(Conectando BD...)</span>}</h1>
          <p className="text-muted mt-1">{t('dashboard.summary')}</p>
        </div>
        
        {/* Simulador de Roles */}
        <div className="flex gap-2 bg-surface p-1 rounded-md border border-zinc-800">
          {(['Entrenador', 'Preparador Físico', 'Analista'] as UserRole[]).map(role => (
            <button
              key={role}
              onClick={() => setCurrentRole(role)}
              className={`px-4 py-2 rounded text-sm font-bold transition-colors ${
                currentRole === role ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="card stat-card glass-panel">
            <div className={`stat-icon-wrapper bg-${stat.color}-glow`}>
              <stat.icon className={`text-${stat.color}`} size={24} />
            </div>
            <div className="stat-info">
              <h3 className="text-xs text-muted font-bold uppercase tracking-wider">{stat.title}</h3>
              <p className="h2 stat-value font-display mt-1">{stat.value}</p>
              <p className="text-xs stat-subtitle mt-1 text-secondary">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-content grid-2">
        <div className="card glass-panel flex-col flex">
          <div className="flex justify-between items-center mb-6">
            <h3 className="h3 font-display">Carga Semanal vs Intensidad</h3>
            <span className="badge badge-neutral">Datos Reales BD</span>
          </div>
          <div className="flex-1 min-h-[250px]">
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
                  contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="load" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorLoad)" />
                <Area type="monotone" dataKey="intensity" stroke="var(--color-secondary)" strokeWidth={3} fillOpacity={1} fill="url(#colorInt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card glass-panel flex flex-col">
          <h3 className="h3 font-display mb-6">Próximos Eventos de BD</h3>
          <div className="flex flex-col gap-4">
            {matches.length === 0 ? (
              <div className="p-8 text-center text-muted border border-dashed border-zinc-700 rounded-lg">
                No hay eventos próximos registrados en la base de datos de Supabase.
              </div>
            ) : (
              matches.slice(0, 3).map((match: any) => (
                <div key={match.id} className="flex items-center gap-4 p-3 rounded-lg border border-zinc-800 bg-surface/50 hover:border-accent transition-colors cursor-pointer">
                  <div className="bg-accent/20 p-3 rounded-md text-accent">
                    <Target size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold">Partido registrado</h4>
                    <p className="text-sm text-muted">ID: {match.id}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
