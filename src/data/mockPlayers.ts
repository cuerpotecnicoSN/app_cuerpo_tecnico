import type { Player, PlayerAssessment, Meeting, PlayerObjective } from '../types/player';

export const mockPlayers: Player[] = [
  {
    id: '1',
    firstName: 'Lionel',
    lastName: 'Messi',
    photoUrl: 'https://i.pravatar.cc/300?img=11',
    birthDate: '1987-06-24',
    nationality: 'Argentina',
    birthCountry: 'Argentina',
    birthCity: 'Rosario',
    height: 170,
    weight: 72,
    dominantFoot: 'Left',
    mainPosition: 'Extremo Derecho',
    secondaryPositions: ['Falso 9', 'Mediapunta'],
    kitNumber: 10,
    category: 'Primer Equipo',
    team: 'A',
    season: '2023/2024',
    joinDate: '2023-07-15',
    previousClub: 'PSG',
    clubHistory: ['FC Barcelona', 'PSG'],
    minutesPlayed: 1450,
    matches: 18,
    goals: 12,
    assists: 8,
    cards: { yellow: 2, red: 0 }
  },
  {
    id: '2',
    firstName: 'Pedri',
    lastName: 'González',
    photoUrl: 'https://i.pravatar.cc/300?img=12',
    birthDate: '2002-11-25',
    nationality: 'Spain',
    birthCountry: 'Spain',
    birthCity: 'Tegueste',
    height: 174,
    weight: 60,
    dominantFoot: 'Right',
    mainPosition: 'Centrocampista',
    secondaryPositions: ['Mediapunta'],
    kitNumber: 8,
    category: 'Primer Equipo',
    team: 'A',
    season: '2023/2024',
    joinDate: '2020-08-01',
    previousClub: 'UD Las Palmas',
    clubHistory: ['Juventud Laguna', 'UD Las Palmas'],
    minutesPlayed: 1200,
    matches: 15,
    goals: 3,
    assists: 5,
    cards: { yellow: 1, red: 0 }
  }
];

export const mockMeetings: Meeting[] = [
  {
    id: 'meet-1',
    date: '2023-10-15',
    time: '10:00',
    location: 'Despacho Entrenador',
    type: 'Reunión individual',
    playerIds: ['1'],
    coachIds: ['coach-1'],
    createdBy: 'Pep Guardiola',
    objective: 'Análisis de rendimiento reciente',
    development: 'Reunión para analizar el rendimiento en los últimos 3 partidos y ajustar la carga física.',
    topics: ['Carga física', 'Posicionamiento táctico'],
    positivePoints: 'Buena actitud defensiva',
    improvements: 'Movilidad sin balón',
    agreements: 'Realizar sesiones extra de estiramientos',
    nextSteps: 'Monitorizar la carga en los próximos entrenamientos.',
    followUpDate: '2023-10-22',
    attachments: []
  },
  {
    id: 'meet-2',
    date: '2023-11-02',
    time: '16:30',
    location: 'Sala de Vídeo',
    type: 'Dinámica de grupo',
    playerIds: ['1', '2'],
    coachIds: ['coach-1', 'coach-2'],
    createdBy: 'Pep Guardiola',
    objective: 'Mejorar cohesión grupal',
    development: 'Sesión de vídeo analizando errores de basculación defensiva del último partido.',
    topics: ['Táctica defensiva', 'Basculación'],
    positivePoints: 'Participación activa de los jugadores',
    improvements: 'Comunicación en el campo',
    agreements: 'Avisar siempre al compañero libre',
    nextSteps: 'Aplicar en el entrenamiento de mañana',
    attachments: []
  }
];

export const mockObjectives: PlayerObjective[] = [
  {
    id: 'obj-1',
    playerId: '1',
    title: 'Mejorar resistencia cardiovascular',
    description: 'Aumentar la capacidad de realizar sprints de alta intensidad en los últimos 20 minutos de partido.',
    createdAt: '2023-09-01T00:00:00Z',
    responsible: 'Preparador Físico',
    targetDate: '2023-12-31T00:00:00Z',
    status: 'In Progress',
    progress: 60,
    comments: 'Se ha notado mejora, pero aún hay margen.',
    reviewDate: '2023-11-15T00:00:00Z'
  }
];

export const mockAssessments: PlayerAssessment[] = [
  {
    id: 'ass-1',
    playerId: '1',
    date: '2023-10-01T00:00:00Z',
    type: 'Coach',
    evaluator: 'Staff Técnico',
    scores: {
      technique: 10,
      tactics: 9,
      physical: 7,
      mental: 9,
      social: 8,
      professionalism: 10,
      behavior: 9,
      decisionMaking: 10,
      performance: 9
    },
    comments: 'Rendimiento excepcional como siempre, gestionando los minutos.'
  }
];
