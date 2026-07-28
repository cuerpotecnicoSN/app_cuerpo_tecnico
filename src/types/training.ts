export type TaskCategory = 'Calentamiento' | 'Técnica' | 'Táctica' | 'Física' | 'Partido' | 'Estrategia (ABP)' | 'Recuperación';

export interface Task {
  id: string;
  name: string;
  category: TaskCategory;
  objective: string;
  description: string;
  organization: string;
  playersCount: string; // e.g., "4v4+2", "11v11", "Todos"
  space: string; // e.g., "40x30m", "Medio campo"
  duration: number; // minutes
  material: string;
  rules: string;
  instructions: string; // consignas
  variants: string;
  load: string; // e.g., "Alta", "Baja", or RPE 1-10
  intensity: string; 
  reps: number;
  recoveryTime: string; // e.g., "2 min"
  mediaUrl?: string; // Image/Video URL
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'Planned' | 'Completed' | 'Modified' | 'Skipped';

export interface SessionTask {
  id: string;
  taskId: string;
  order: number;
  // Execution status
  status: TaskStatus;
  modifications?: string; // If modified, explain what changed
  executionNotes?: string;
}

export interface TrainingSession {
  id: string;
  date: string;
  time: string;
  duration: number; // in minutes
  team: string;
  location: string;
  coachIds: string[];
  objectives: string;
  microcycle: string;
  mesocycle: string;
  seasonPhase: string;
  observations: string;
  tasks: SessionTask[]; // The planned and executed drills
  
  // Post-session Evaluation
  isCompleted: boolean;
  evaluationScore?: number; // 1-10
  evaluationFeedback?: string;
}
