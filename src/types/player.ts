export interface Player {
  id: string;
  // DATOS PERSONALES
  firstName: string;
  lastName: string;
  photoUrl: string;
  birthDate: string;
  nationality: string;
  birthCountry: string;
  birthCity: string;
  height: number; // cm
  weight: number; // kg
  dominantFoot: 'Right' | 'Left' | 'Both';
  mainPosition: string;
  secondaryPositions: string[];

  // DATOS DEPORTIVOS
  kitNumber: number;
  category: string;
  team: string;
  season: string;
  joinDate: string;
  previousClub: string;
  clubHistory: string[];
  
  // STATS (Summary)
  minutesPlayed: number;
  matches: number;
  goals: number;
  assists: number;
  cards: { yellow: number; red: number };
}

export interface Meeting {
  id: string;
  date: string;
  time: string;
  location: string;
  type: 'Reunión individual' | 'Reunión grupal' | 'Dinámica de grupo' | 'Feedback individual' | 'Feedback colectivo' | 'Evaluación' | 'Autoevaluación' | 'Conversación de seguimiento' | 'Reunión de objetivos' | 'Reunión de revisión';
  playerIds: string[]; // Can be one or multiple
  coachIds: string[]; // Can be one or multiple
  createdBy: string;
  objective: string;
  development: string;
  topics: string[];
  positivePoints: string;
  improvements: string;
  agreements: string;
  nextSteps: string;
  followUpDate?: string;
  attachments: string[]; // URLs
}

export interface PlayerObjective {
  id: string;
  playerId: string;
  title: string;
  description: string;
  createdAt: string;
  responsible: string;
  targetDate: string;
  status: 'Not Started' | 'In Progress' | 'Achieved' | 'Cancelled';
  progress: number; // 0-100
  comments: string;
  reviewDate: string;
}

export interface PlayerAssessment {
  id: string;
  playerId: string;
  date: string;
  type: 'Coach' | 'Self-Assessment';
  evaluator: string;
  // Scores 1-10
  scores: {
    technique: number;
    tactics: number;
    physical: number;
    mental: number;
    social: number;
    professionalism: number;
    behavior: number;
    decisionMaking: number;
    performance: number;
  };
  comments: string;
}
