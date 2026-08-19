export type UserRole = 'Míster' | 'Jugador' | 'Administrador' | 'Entrenador' | 'Preparador físico';

export interface Player {
  id: string;
  name: string;
  footballName?: string;
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

export interface PlayerWeight {
  id: string;
  player_id: string;
  date: string;
  weight: number;
  created_at?: string;
}

export interface PlayerInjury {
  id: string;
  player_id: string;
  body_zone: string;
  body_side: 'frontal' | 'posterior';
  severity: 'Leve' | 'Moderada' | 'Grave';
  status: 'Activa' | 'En tratamiento' | 'Recuperado' | 'Baja';
  diagnosis: string;
  treatment?: string;
  injury_date: string;
  baja_date?: string;
  estimated_return?: string;
  actual_return?: string;
  origin?: string;
  follow_up_notes?: string;
  competitive_leave?: boolean;
  created_at?: string;
}

export const TASK_TYPES = ['Rondo', 'Posesión', 'Partido reducido', 'Circuito', 'Finalización', 'Partido', 'Secuencia'];

export interface TaskLibraryItem {
  id: string;
  category: string;
  title: string;
  description?: string;
  duration_min?: number;
  players_min?: number;
  players_max?: number;
  material?: string;
  image_url?: string;
  board_data?: string;
  types?: string[];
  created_at?: string;
}

export interface TrainingSessionDB {
  id: string;
  season_id: string;
  date: string;
  time?: string;
  title: string;
  objective?: string;
  location?: string;
  notes?: string;
  created_at?: string;
}

export interface SessionTask {
  id: string;
  session_id: string;
  task_id: string | null;
  order: number;
  duration_min?: number;
  notes?: string;
  created_at?: string;
}

// ===== Partidos =====

export interface MatchDB {
  id: string;
  season_id: string;
  competition?: string;
  date: string;
  time?: string;
  opponent: string;
  is_home: boolean;
  home_logo?: string;
  away_logo?: string;
  stadium?: string;
  status: 'Scheduled' | 'Live' | 'Finished';
  result_home?: number | null;
  result_away?: number | null;
  scouting_notes?: string;
  created_at?: string;
}

export interface FocusDetails {
  text: string;
  focusType: 'Colectivo' | 'Grupal' | 'Individual' | 'Rival';
  phase?: 'Ofensivo' | 'Defensivo' | 'ABP'; // Legacy
  phases?: ('Ofensivo' | 'Defensivo' | 'ABP')[];
  assignedTo: string;
  playerId?: string;
  playerIds?: string[];
}

export interface MatchFocus {
  id: string;
  match_id: string;
  title: string;
  description?: string; // Puede ser un string JSON que cumple FocusDetails
  order: number;
  created_at?: string;
}

export interface MatchDataPoint {
  id: string;
  match_id: string;
  player_id?: string | null;
  staff_id?: string | null;
  minute?: number;
  type: string;
  outcome: 'Success' | 'Failure' | 'Neutral';
  coordinates?: { x: number; y: number } | null;
  comments?: string;
  created_at?: string;
}

// ===== Dinámicas / Reuniones =====

export interface MeetingDB {
  id: string;
  season_id: string;
  type: 'individual' | 'grupal';
  date: string;
  time?: string;
  location?: string;
  objective?: string;
  development?: string;
  feedback?: {
    positives: string[];
    negatives: string[];
  };
  positive_points?: string;
  improvements?: string;
  agreements?: string;
  next_steps?: string;
  follow_up_date?: string;
  created_by?: string;
  created_at?: string;
}

export interface MeetingPlayer {
  id: string;
  meeting_id: string;
  player_id: string;
}

// ===== Jugadores: Plan individual / Objetivos / Informes =====

export interface PlayerObjective {
  id: string;
  player_id: string;
  season_id: string;
  title: string;
  description?: string;
  status: 'En progreso' | 'Cumplido' | 'No cumplido';
  target_date?: string;
  created_at?: string;
}

export interface SeasonReport {
  id: string;
  player_id: string;
  season_id: string;
  summary?: string;
  file_url?: string;
  created_at?: string;
}
