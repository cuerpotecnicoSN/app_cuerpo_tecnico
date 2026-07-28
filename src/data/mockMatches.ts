export interface MatchEvent {
  id: string;
  matchId: string;
  playerId?: string;
  staffId: string;
  timestamp: string; // e.g. "45:12"
  minute: number;
  type: string;
  outcome: 'Success' | 'Failure' | 'Neutral';
  coordinates?: { x: number; y: number }; // x and y as percentages 0-100
  comments?: string;
}

export interface Match {
  id: string;
  competition: string;
  season: string;
  date: string;
  time: string;
  opponent: string;
  isHome: boolean;
  stadium: string;
  status: 'Scheduled' | 'Live' | 'Finished';
  result?: { home: number; away: number };
  callup: string[]; // player IDs
  lineup: string[]; // player IDs
  staff: string[]; // staff IDs
  events: MatchEvent[];
}

export const EVENT_TYPES = [
  'Gol', 'Asistencia', 'Tiro', 'Tiro a puerta', 'Pérdida', 'Recuperación',
  'Pase', 'Pase fallado', 'Centro', 'Regate', 'Duelo ganado', 'Duelo perdido',
  'Falta', 'Tarjeta Amarilla', 'Tarjeta Roja', 'Corner', 'Saque de banda',
  'Fuera de juego', 'Acción defensiva', 'Acción ofensiva', 'Transición',
  'Error', 'Buena acción', 'Mala acción'
];

export const mockMatches: Match[] = [
  {
    id: 'm1',
    competition: 'Liga - Jornada 12',
    season: '2026-2027',
    date: '2026-10-24',
    time: '18:00',
    opponent: 'FC Example',
    isHome: true,
    stadium: 'Estadio Municipal',
    status: 'Scheduled',
    callup: ['1', '2', '3', '4'],
    lineup: ['1', '2'],
    staff: ['st1', 'st2'],
    events: []
  },
  {
    id: 'm2',
    competition: 'Copa del Rey - 1/16',
    season: '2026-2027',
    date: '2026-10-18',
    time: '20:30',
    opponent: 'Deportivo Rival',
    isHome: false,
    stadium: 'El Gran Estadio',
    status: 'Finished',
    result: { home: 1, away: 2 },
    callup: ['1', '2', '3', '4'],
    lineup: ['1', '2', '3'],
    staff: ['st1'],
    events: [
      {
        id: 'ev1',
        matchId: 'm2',
        playerId: '1',
        staffId: 'st1',
        timestamp: '12:45',
        minute: 12,
        type: 'Gol',
        outcome: 'Success',
        coordinates: { x: 85, y: 50 },
        comments: 'Tiro cruzado'
      },
      {
        id: 'ev2',
        matchId: 'm2',
        playerId: '2',
        staffId: 'st1',
        timestamp: '34:10',
        minute: 34,
        type: 'Pérdida',
        outcome: 'Failure',
        coordinates: { x: 45, y: 20 },
      }
    ]
  }
];
