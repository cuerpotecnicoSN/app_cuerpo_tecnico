import type { LucideIcon } from 'lucide-react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Dumbbell, 
  Volleyball, 
  MessageCircle,
  UsersRound,
  Target,
  MessageSquareText,
  ClipboardCheck,
  CalendarCheck,
  BookOpen,
  BarChart3,
  Trophy,
  Radio,
  FileText
} from 'lucide-react';

export interface NavChild {
  labelKey: string;
  descKey?: string;
  defaultDesc?: string;
  path: string;
  icon: LucideIcon;
}

export interface NavSection {
  labelKey: string;
  path: string;
  icon: LucideIcon;
  children?: NavChild[];
}

export const navigation: NavSection[] = [
  { labelKey: 'nav.home', path: '/', icon: LayoutDashboard },
  { labelKey: 'nav.calendar', path: '/calendar', icon: CalendarDays },
  { 
    labelKey: 'nav.players', 
    path: '/players', 
    icon: Users,
    children: [
      { labelKey: 'nav.roster', descKey: 'nav.rosterDesc', defaultDesc: 'Fichas, estados y plantilla', path: '/players', icon: UsersRound },
      { labelKey: 'nav.individualPlan', descKey: 'nav.individualPlanDesc', defaultDesc: 'Objetivos de desarrollo', path: '/players?view=plan', icon: Target },
      { labelKey: 'nav.meetings', descKey: 'nav.meetingsDesc', defaultDesc: 'Seguimiento 1 a 1 y acuerdos', path: '/players?view=meetings', icon: MessageSquareText },
      { labelKey: 'nav.evaluations', descKey: 'nav.evaluationsDesc', defaultDesc: 'Informes y evaluaciones', path: '/players?view=evaluations', icon: ClipboardCheck }
    ]
  },
  { 
    labelKey: 'nav.training', 
    path: '/training', 
    icon: Dumbbell,
    children: [
      { labelKey: 'nav.trainingSessions', descKey: 'nav.trainingSessionsDesc', defaultDesc: 'Planificación y sesiones', path: '/training?view=sessions', icon: CalendarCheck },
      { labelKey: 'nav.taskLibrary', descKey: 'nav.taskLibraryDesc', defaultDesc: 'Ejercicios y pizarra táctica', path: '/training?view=library', icon: BookOpen },
      { labelKey: 'nav.taskStats', descKey: 'nav.taskStatsDesc', defaultDesc: 'Métricas y volumen de carga', path: '/training?view=stats', icon: BarChart3 }
    ]
  },
  { 
    labelKey: 'nav.matches', 
    path: '/matches', 
    icon: Volleyball,
    children: [
      { labelKey: 'nav.matchInfo', descKey: 'nav.matchInfoDesc', defaultDesc: 'Resultados, actas e informes', path: '/matches?view=info', icon: Trophy },
      { labelKey: 'nav.matchFocuses', descKey: 'nav.matchFocusesDesc', defaultDesc: 'Planificación de focos', path: '/matches?view=focuses', icon: Target },
      { labelKey: 'nav.matchData', descKey: 'nav.matchDataDesc', defaultDesc: 'Registro en vivo de datos', path: '/matches?view=data', icon: Radio }
    ]
  },
  { 
    labelKey: 'nav.dynamics', 
    path: '/dynamics', 
    icon: MessageCircle,
    children: [
      { labelKey: 'nav.reports', descKey: 'nav.dynamicsDesc', defaultDesc: 'Dinámicas y actas grupales', path: '/dynamics', icon: FileText }
    ]
  },
];

