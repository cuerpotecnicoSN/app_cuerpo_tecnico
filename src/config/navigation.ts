import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, CalendarDays, Users, Dumbbell, Volleyball, MessageCircle } from 'lucide-react';

export interface NavSection {
  labelKey: string;
  path: string;
  icon: LucideIcon;
  children?: { labelKey: string; path: string }[];
}

export const navigation: NavSection[] = [
  { labelKey: 'nav.home', path: '/', icon: LayoutDashboard },
  { labelKey: 'nav.calendar', path: '/calendar', icon: CalendarDays },
  { 
    labelKey: 'nav.players', 
    path: '/players', 
    icon: Users,
    children: [
      { labelKey: 'nav.roster', path: '/players' },
      { labelKey: 'nav.individualPlan', path: '/players?view=plan' },
      { labelKey: 'nav.meetings', path: '/players?view=meetings' },
      { labelKey: 'nav.evaluations', path: '/players?view=evaluations' }
    ]
  },
  { 
    labelKey: 'nav.training', 
    path: '/training', 
    icon: Dumbbell,
    children: [
      { labelKey: 'nav.trainingSessions', path: '/training?view=sessions' },
      { labelKey: 'nav.taskLibrary', path: '/training?view=library' }
    ]
  },
  { 
    labelKey: 'nav.matches', 
    path: '/matches', 
    icon: Volleyball,
    children: [
      { labelKey: 'nav.matchInfo', path: '/matches?view=info' },
      { labelKey: 'nav.matchFocuses', path: '/matches?view=focuses' },
      { labelKey: 'nav.matchData', path: '/matches?view=data' }
    ]
  },
  { 
    labelKey: 'nav.dynamics', 
    path: '/dynamics', 
    icon: MessageCircle,
    children: [
      { labelKey: 'nav.reports', path: '/dynamics' }
    ]
  },
];
