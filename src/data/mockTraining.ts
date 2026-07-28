import type { Task, TrainingSession } from '../types/training';

export const mockTasks: Task[] = [
  {
    id: 't-1',
    name: 'Rondo 4v2 con transición',
    category: 'Táctica',
    objective: 'Mejorar la circulación rápida y la presión tras pérdida.',
    description: 'Rondo clásico 4 contra 2. Al recuperar, los 2 defensores buscan pasar a un comodín exterior para invertir los roles.',
    organization: '2 zonas contiguas de 10x10m',
    playersCount: '6 (4v2)',
    space: '10x20m total',
    duration: 15,
    material: 'Balones, petos de 2 colores, setas',
    rules: 'Máximo 2 toques por jugador. 10 pases = punto.',
    instructions: 'Buscar líneas de pase constantemente. Presión intensa al perder.',
    variants: 'Añadir comodín ofensivo interior (5v2). Limitar a 1 toque.',
    load: 'Alta',
    intensity: '8/10',
    reps: 3,
    recoveryTime: '1 min',
    mediaUrl: 'https://images.unsplash.com/photo-1574629810360-1effacdd262c?auto=format&fit=crop&q=80&w=300&h=200',
    isFavorite: true,
    createdAt: '2023-11-01T10:00:00Z',
    updatedAt: '2023-11-01T10:00:00Z'
  },
  {
    id: 't-2',
    name: 'Finalizaciones con centros laterales',
    category: 'Técnica',
    objective: 'Mejorar remate de primeras y desmarques de ruptura.',
    description: 'Pase del mediocentro a banda, centro al área y remate de dos delanteros contra portero.',
    organization: 'Medio campo. 2 postas laterales, 2 rematadores.',
    playersCount: '8+1',
    space: 'Medio campo',
    duration: 20,
    material: 'Balones, maniquíes, picas',
    rules: 'El centro debe ser al primer toque si es posible.',
    instructions: 'Cruzar carreras en el área. Atacar el primer palo.',
    variants: 'Añadir oposición pasiva (defensas).',
    load: 'Media',
    intensity: '7/10',
    reps: 4,
    recoveryTime: '2 min',
    mediaUrl: 'https://images.unsplash.com/photo-1518063319859-994dbdb511fb?auto=format&fit=crop&q=80&w=300&h=200',
    isFavorite: false,
    createdAt: '2023-11-05T10:00:00Z',
    updatedAt: '2023-11-05T10:00:00Z'
  }
];

export const mockSessions: TrainingSession[] = [
  {
    id: 'sess-1',
    date: new Date().toISOString().split('T')[0], // Today
    time: '18:00',
    duration: 90,
    team: 'Primer Equipo',
    location: 'Campo 1',
    coachIds: ['coach-1', 'coach-2'],
    objectives: 'Recuperación activa y preparación partido fin de semana.',
    microcycle: 'Semana 12',
    mesocycle: 'Competitivo III',
    seasonPhase: 'Primera Vuelta',
    observations: 'Controlar cargas de los que jugaron +60 min ayer.',
    isCompleted: false,
    tasks: [
      {
        id: 'st-1',
        taskId: 't-1',
        order: 1,
        status: 'Planned'
      },
      {
        id: 'st-2',
        taskId: 't-2',
        order: 2,
        status: 'Planned'
      }
    ]
  },
  {
    id: 'sess-2',
    date: '2023-11-05',
    time: '10:00',
    duration: 120,
    team: 'Primer Equipo',
    location: 'Campo Principal',
    coachIds: ['coach-1'],
    objectives: 'Resistencia aeróbica y conceptos defensivos.',
    microcycle: 'Semana 11',
    mesocycle: 'Competitivo III',
    seasonPhase: 'Primera Vuelta',
    observations: 'Buen clima, campo mojado.',
    isCompleted: true,
    evaluationScore: 8,
    evaluationFeedback: 'Buena intensidad general. Faltó claridad en las finalizaciones de la tarea 2.',
    tasks: [
      {
        id: 'st-3',
        taskId: 't-1',
        order: 1,
        status: 'Completed',
        executionNotes: 'Se realizó perfectamente.'
      },
      {
        id: 'st-4',
        taskId: 't-2',
        order: 2,
        status: 'Modified',
        modifications: 'Tuvimos que añadir defensas activos antes de lo previsto por aburrimiento.',
        executionNotes: 'Los jugadores pidieron más oposición.'
      }
    ]
  }
];
