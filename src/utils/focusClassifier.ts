/**
 * Intelligent Focus Classifier & Tactical Rule Engine
 * Classifies focuses into Phase (Ofensivo, Defensivo, ABP) and Type (Colectivo, Grupal, Individual, Rival).
 */
import { focusLearningService } from '../services/focusLearningService';

export type FocusPhase = 'Ofensivo' | 'Defensivo' | 'ABP';
export type FocusType = 'Colectivo' | 'Grupal' | 'Individual' | 'Rival';

interface ClassificationResult {
  phase: FocusPhase;
  focusType: FocusType;
  confidence: number;
  matchedKeywords: string[];
  reason: string;
}

// Tactical keywords for Phases
const PHASE_RULES: { phase: FocusPhase; keywords: string[]; weight: number }[] = [
  {
    phase: 'ABP',
    keywords: [
      'palle inattive',
      'palla inattiva',
      'calcio piazzato',
      'calci piazzati',
      'rimessa laterale',
      'rimesse laterali',
      'calcio d\'angolo',
      'corner',
      'punizione',
      'rigore',
      'balón parado',
      'saque de esquina',
      'saque de banda',
      'abp',
      'inattive',
    ],
    weight: 3.0,
  },
  {
    phase: 'Defensivo',
    keywords: [
      'difendiamo',
      'difendere',
      'difensori',
      'difensore',
      'difensiva',
      'difesa',
      'area di rigore',
      'marcature',
      'marcatura',
      'riferimenti',
      'seconda palla',
      'senza palla',
      'preventive',
      'preventiva',
      'pressione dopo la perdita',
      'perdita',
      'gioco diretto',
      'recupero',
      'duello aereo',
      'chiusure',
      'copertura',
      'riaggressione',
      'fuorigioco',
    ],
    weight: 2.0,
  },
  {
    phase: 'Ofensivo',
    keywords: [
      'profondità',
      'profondita',
      'offensiva',
      'offensivo',
      'attacco',
      'metà campo offensiva',
      'dentro/fuori',
      'in avanti',
      'giocare dentro',
      'superiorità dentro',
      'superiorità numerica',
      'superiorita',
      'arrivano in area',
      'corrono in profondità',
      'vanno in profondità',
      'finalizzazione',
      'conteggio',
      'conclusioni',
      'tiro',
      'gol',
      'possesso',
      'costruzione',
      'catena laterale',
      'ampiezza',
      'rifinitura',
      'inserimento',
    ],
    weight: 2.0,
  },
];

// Tactical keywords for Focus Types
const TYPE_RULES: { type: FocusType; keywords: string[]; weight: number }[] = [
  {
    type: 'Rival',
    keywords: ['loro', 'sul loro', 'avversario', 'avversari', 'rivale', 'rival', 'loro gioco'],
    weight: 2.5,
  },
  {
    type: 'Colectivo',
    keywords: [
      'siamo',
      'difendiamo',
      'siamo ubicati',
      'siamo capaci',
      'squadra',
      'collettivo',
      'struttura',
      'palle inattive a favore e contro',
      'iniziativa senza palla',
      'iniziativa nel difendere',
      'superiorità dentro',
      'preventive',
    ],
    weight: 2.0,
  },
];

/**
 * Classifies a tactical focus using learned history + rule-based scoring
 */
export function classifyFocus(text: string, coach = ''): ClassificationResult {
  const normalized = text.toLowerCase().trim();

  // 1. Check self-learning memory first!
  const learned = focusLearningService.getLearnedClassification(normalized, coach);
  if (learned && learned.confidence >= 0.75) {
    return {
      phase: learned.phase as FocusPhase,
      focusType: learned.focusType as FocusType,
      confidence: learned.confidence,
      matchedKeywords: learned.matchedKeywords || [],
      reason: `Aprendido de clasificaciones anteriores (${coach || 'General'})`,
    };
  }

  // 2. Calculate Phase scores
  const phaseScores: Record<FocusPhase, number> = { Ofensivo: 0, Defensivo: 0, ABP: 0 };
  const matchedKeywords: string[] = [];

  for (const rule of PHASE_RULES) {
    for (const kw of rule.keywords) {
      if (normalized.includes(kw)) {
        phaseScores[rule.phase] += rule.weight;
        matchedKeywords.push(kw);
      }
    }
  }

  // Determine best phase
  let bestPhase: FocusPhase = 'Ofensivo';
  let maxPhaseScore = -1;
  (Object.keys(phaseScores) as FocusPhase[]).forEach((p) => {
    if (phaseScores[p] > maxPhaseScore) {
      maxPhaseScore = phaseScores[p];
      bestPhase = p;
    }
  });

  // 3. Determine Focus Type (Colectivo, Grupal, Individual, Rival)
  const typeScores: Record<FocusType, number> = { Colectivo: 0, Grupal: 0, Individual: 0, Rival: 0 };

  for (const rule of TYPE_RULES) {
    for (const kw of rule.keywords) {
      if (normalized.includes(kw)) {
        typeScores[rule.type] += rule.weight;
      }
    }
  }

  // Check if text mentions multiple names / commas / "e" / "con i 2"
  const commaCount = (normalized.match(/,/g) || []).length;
  const hasMultipleNames = /\b[A-Z][a-z]+(\s+e\s+|\s*,\s*)[A-Z][a-z]+/g.test(text) || /\b(sala|ossola|vos|cappelletti|borsani|ciss[eè]|pagliei|zukic|vladi)\b/i.test(normalized);
  const hasAnd = normalized.includes(' e ') || normalized.includes(' y ');

  if (hasMultipleNames && (commaCount >= 1 || hasAnd)) {
    typeScores.Grupal += 3.0;
  } else if (/\bcon i \d+ difensori\b/i.test(normalized)) {
    typeScores.Grupal += 2.5;
  } else if (hasMultipleNames || /\b(pittarella|ciss[eè]|vos|sala)\b/i.test(normalized)) {
    // Single player reference
    typeScores.Individual += 2.0;
  } else {
    // General whole-team behavior
    typeScores.Colectivo += 1.5;
  }

  let bestType: FocusType = 'Colectivo';
  let maxTypeScore = -1;
  (Object.keys(typeScores) as FocusType[]).forEach((t) => {
    if (typeScores[t] > maxTypeScore) {
      maxTypeScore = typeScores[t];
      bestType = t;
    }
  });

  const confidence = Math.min(0.95, Math.max(0.6, (maxPhaseScore > 0 ? 0.75 : 0.6) + (matchedKeywords.length > 1 ? 0.15 : 0.05)));

  return {
    phase: bestPhase,
    focusType: bestType,
    confidence,
    matchedKeywords,
    reason: matchedKeywords.length > 0 ? `Palabras clave: ${matchedKeywords.join(', ')}` : 'Reglas tácticas estándar',
  };
}
