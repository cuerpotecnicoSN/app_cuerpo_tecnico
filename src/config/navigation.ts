import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  Calendar,
  Activity,
  Database,
  BarChart2,
} from 'lucide-react';

export interface NavChild {
  label: string;
  path: string;
  /** Set when the section reuses an already-implemented page instead of the placeholder. */
  implemented?: boolean;
}

export interface NavSection {
  label: string;
  path: string;
  icon: LucideIcon;
  implemented?: boolean;
  children?: NavChild[];
}

export const navigation: NavSection[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    implemented: true,
  },
  {
    label: 'Equipo Técnico',
    path: '/staff',
    icon: ShieldAlert,
    children: [
      { label: 'Entrenadores', path: '/staff' },
      { label: 'Perfiles individuales', path: '/staff/profiles' },
      { label: 'Roles', path: '/staff/roles' },
      { label: 'Reuniones del cuerpo técnico', path: '/staff/meetings' },
      { label: 'Historial', path: '/staff/history' },
    ],
  },
  {
    label: 'Jugadores',
    path: '/players',
    icon: Users,
    children: [
      { label: 'Plantilla', path: '/players', implemented: true },
      { label: 'Reuniones individuales', path: '/players/meetings', implemented: true },
      { label: 'Evaluaciones', path: '/players/evaluations' },
      { label: 'Objetivos', path: '/players/goals' },
      { label: 'Seguimiento', path: '/players/tracking' },
      { label: 'Historial', path: '/players/history' },
      { label: 'Informes de temporadas anteriores', path: '/players/past-seasons' },
    ],
  },
  {
    label: 'Entrenamientos',
    path: '/training',
    icon: Calendar,
    children: [
      { label: 'Calendario', path: '/training', implemented: true },
      { label: 'Biblioteca de entrenamientos', path: '/training/library' },
      { label: 'Biblioteca de tareas', path: '/training/tasks', implemented: true },
      { label: 'Historial de sesiones', path: '/training/history' },
    ],
  },
  {
    label: 'Partidos',
    path: '/matches',
    icon: Activity,
    children: [
      { label: 'Calendario de partidos', path: '/matches', implemented: true },
      { label: 'Focos', path: '/matches/highlights' },
      { label: 'Recopilación de datos', path: '/matches/data-collection' },
    ],
  },
  {
    label: 'Base de Datos',
    path: '/database',
    icon: Database,
    children: [
      { label: 'Jugadores', path: '/database/players' },
      { label: 'Entrenadores', path: '/database/staff' },
      { label: 'Entrenamientos', path: '/database/trainings' },
      { label: 'Tareas', path: '/database/tasks' },
      { label: 'Reuniones', path: '/database/meetings' },
      { label: 'Partidos', path: '/database/matches' },
      { label: 'Eventos', path: '/database/events' },
    ],
  },
  {
    label: 'Estadísticas e Historial',
    path: '/stats',
    icon: BarChart2,
    children: [
      { label: 'Evolución del jugador', path: '/stats', implemented: true },
      { label: 'Evolución del equipo', path: '/stats/team-evolution' },
      { label: 'Informes', path: '/stats/reports' },
    ],
  },
];
