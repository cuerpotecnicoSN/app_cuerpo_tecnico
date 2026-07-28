import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Users, Activity, Target } from 'lucide-react';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();

  const stats = [
    { title: 'Próximo Partido', value: 'vs. Real Madrid B', subtitle: 'Sábado, 18:00', icon: Target, color: 'primary' },
    { title: 'Jugadores Disponibles', value: '22 / 24', subtitle: '2 Lesionados', icon: Users, color: 'secondary' },
    { title: 'Carga de Entrenamiento', value: 'Alta', subtitle: 'Sesión Táctica - 90min', icon: Activity, color: 'accent' },
    { title: 'Días para Competición', value: '3 Días', subtitle: 'Jornada 12', icon: Calendar, color: 'primary' },
  ];

  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="h2">{t('welcome')}, Admin</h1>
          <p className="text-muted">Aquí tienes el resumen de tu equipo para hoy.</p>
        </div>
        <button className="btn btn-primary">
          <Calendar size={18} />
          <span>Nueva Sesión</span>
        </button>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="card stat-card">
            <div className={`stat-icon-wrapper bg-${stat.color}-light`}>
              <stat.icon className={`text-${stat.color}`} size={24} />
            </div>
            <div className="stat-info">
              <h3 className="text-sm text-muted">{stat.title}</h3>
              <p className="h3 stat-value">{stat.value}</p>
              <p className="text-xs stat-subtitle">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-content grid-2">
        <div className="card">
          <h3 className="h3" style={{ marginBottom: '1rem' }}>Últimas Evaluaciones</h3>
          <div className="empty-state">
            <p className="text-muted">No hay evaluaciones recientes.</p>
          </div>
        </div>
        <div className="card">
          <h3 className="h3" style={{ marginBottom: '1rem' }}>Alertas Médicas</h3>
          <div className="empty-state">
            <p className="text-muted">No hay reportes de lesiones nuevos.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
