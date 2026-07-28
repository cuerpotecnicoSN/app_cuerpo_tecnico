export type UserRole = 'Míster' | 'Jugador' | 'Administrador' | 'Entrenador' | 'Preparador físico';

export interface Player {
  id: string;
  name: string;
  gender?: 'masculino' | 'femenino';
  avatar: string;
  position: string;
  age: number;
  weight: number;
  height: number;
  bodyFat: number;
  history: string;
  strengths: string[];
  weaknesses: string[];
  goals: string[];
  status: 'Apto' | 'Duda' | 'Baja';
  birthDate?: string;
  birthPlace?: string;
  birthPlaceFlag?: string;
  dominantFoot?: string;
  transfermarktUrl?: string;
  besoccerUrl?: string;
  currentClub?: string;
  nationality?: string;
  marketValue?: string;
  rating?: number;
  publicInjuries?: string;
  careerClubs?: {
    club: string;
    seasons: string;
    matches: number;
    goals: number;
    assists: number;
    logo?: string;
  }[];
}

export interface DevTask {
  id: string;
  playerId: string;
  title: string;
  description: string;
  status: 'Pendiente' | 'En Progreso' | 'Completada';
  progress: number;
  category: string; // 'Técnico', 'Táctico', 'Físico', etc
  comments: {
    author: string;
    text: string;
    date: string;
  }[];
  dueDate?: string;
}

export interface MedicalRecord {
  id: string;
  playerId: string;
  injury: string;
  injuryType: 'Muscular' | 'Articular' | 'Ósea' | 'Sobrecarga' | 'Otra';
  dateOnset: string;
  expectedRecovery: string;
  status: 'Apto' | 'Duda' | 'Baja' | 'Recuperado' | 'Fase de readaptación' | 'Activa';
  notes: string;
  wellnessLogs: any[];
  injuryHistory?: {
    date: string;
    status: string;
    injury: string;
    type: string;
    duration: string;
    rehabWork: string;
  }[];
}

export interface SportsStats {
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  callUps: number;
  customMetrics: { name: string; value: number; max: number }[];
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface WorkoutLog {
  id: string;
  playerId: string;
  date: string;
  type: 'Individual' | 'Colectivo';
  duration: number;
  workload: 'Alta' | 'Media' | 'Baja';
  rpe: number;
  description: string;
}

export interface Evaluation {
  id: string;
  playerId: string;
  date: string;
  report: string;
  metrics: { name: string; score: number }[];
}

export interface PhysicalMetricsHistory {
  id: string;
  playerId: string;
  date: string;
  weight: number;
  bodyFat: number;
}

export interface MultimediaItem {
  id: string;
  playerId: string;
  url: string;
  type: 'video' | 'image';
  title: string;
  description: string;
  uploadDate: string;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface AudioNote {
  id: string;
  author: string;
  audioUrl: string;
  timestamp: string;
}

export interface CompetitionVideo {
  id: string;
  playerId: string;
  title: string;
  url: string;
  date: string;
  description: string;
}
