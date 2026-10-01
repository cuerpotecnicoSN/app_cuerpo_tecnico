/**
 * Focus Learning Service
 * Stores and learns associations between tactical phrases/keywords and their Phase and Type.
 * Updates weights when the user edits or confirms classifications.
 */

export interface LearnedFocusRule {
  pattern: string;
  keywords: string[];
  coach?: string;
  phase: 'Ofensivo' | 'Defensivo' | 'ABP';
  focusType: 'Colectivo' | 'Grupal' | 'Individual' | 'Rival';
  count: number;
  lastUpdated: string;
}

const STORAGE_KEY = 'staffcontrol_focus_learning_rules';

// Pre-seeded tactical learning rules
const INITIAL_LEARNED_RULES: LearnedFocusRule[] = [
  {
    pattern: 'profondità',
    keywords: ['profondità', 'metà campo ofensiva', 'corrono'],
    phase: 'Ofensivo',
    focusType: 'Grupal',
    count: 5,
    lastUpdated: new Date().toISOString(),
  },
  {
    pattern: 'difensori centrali',
    keywords: ['difensori', 'area di rigore', 'con e senza palla'],
    phase: 'Defensivo',
    focusType: 'Grupal',
    count: 5,
    lastUpdated: new Date().toISOString(),
  },
  {
    pattern: 'palle inattive',
    keywords: ['palle inattive', 'rimesse laterali', 'marcatura'],
    phase: 'ABP',
    focusType: 'Colectivo',
    count: 5,
    lastUpdated: new Date().toISOString(),
  },
  {
    pattern: 'iniziativa senza palla',
    keywords: ['iniziativa', 'senza palla'],
    phase: 'Defensivo',
    focusType: 'Colectivo',
    count: 4,
    lastUpdated: new Date().toISOString(),
  },
  {
    pattern: 'superiorità dentro',
    keywords: ['superiorità', 'dentro'],
    phase: 'Ofensivo',
    focusType: 'Colectivo',
    count: 4,
    lastUpdated: new Date().toISOString(),
  },
  {
    pattern: 'preventive',
    keywords: ['preventive', 'vigilancias'],
    phase: 'Defensivo',
    focusType: 'Colectivo',
    count: 4,
    lastUpdated: new Date().toISOString(),
  },
];

class FocusLearningService {
  private rules: LearnedFocusRule[] = [];
  private initialized = false;

  constructor() {
    this.loadRules();
  }

  private loadRules() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.rules = parsed;
          this.initialized = true;
          return;
        }
      }
    } catch {
      // fallback
    }
    this.rules = [...INITIAL_LEARNED_RULES];
    this.initialized = true;
    this.saveRules();
  }

  private saveRules() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.rules));
    } catch {
      // ignore
    }
  }

  public getRules(): LearnedFocusRule[] {
    if (!this.initialized) this.loadRules();
    return this.rules;
  }

  /**
   * Matches text against learned patterns and returns highest weighted classification
   */
  public getLearnedClassification(
    text: string,
    coach = ''
  ): { phase: string; focusType: string; confidence: number; matchedKeywords: string[] } | null {
    if (!this.initialized) this.loadRules();

    const normalized = text.toLowerCase().trim();
    const coachUpper = coach.toUpperCase().trim();

    let bestRule: LearnedFocusRule | null = null;
    let maxScore = 0;
    let matchedKeywords: string[] = [];

    for (const rule of this.rules) {
      let score = 0;
      const matched: string[] = [];

      // Pattern match
      if (rule.pattern && normalized.includes(rule.pattern.toLowerCase())) {
        score += 3.0 * (1 + Math.min(rule.count, 10) * 0.1);
        matched.push(rule.pattern);
      }

      // Keyword matches
      for (const kw of rule.keywords) {
        if (normalized.includes(kw.toLowerCase())) {
          score += 1.5 * (1 + Math.min(rule.count, 10) * 0.05);
          matched.push(kw);
        }
      }

      // Coach match bonus
      if (coachUpper && rule.coach && rule.coach.toUpperCase() === coachUpper) {
        score *= 1.25;
      }

      if (score > maxScore && score >= 2.0) {
        maxScore = score;
        bestRule = rule;
        matchedKeywords = Array.from(new Set(matched));
      }
    }

    if (bestRule) {
      return {
        phase: bestRule.phase,
        focusType: bestRule.focusType,
        confidence: Math.min(0.98, 0.7 + maxScore * 0.05),
        matchedKeywords,
      };
    }

    return null;
  }

  /**
   * Records and learns when a user confirms or changes a classification
   */
  public recordLearning(params: {
    rawText: string;
    coach?: string;
    phase: 'Ofensivo' | 'Defensivo' | 'ABP';
    focusType: 'Colectivo' | 'Grupal' | 'Individual' | 'Rival';
  }) {
    if (!this.initialized) this.loadRules();

    const normalized = params.rawText.toLowerCase().trim();
    // Extract key tokens (words > 4 chars)
    const tokens = normalized
      .replace(/[^\w\sàèéìòùáéíóú]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !['delle', 'della', 'dello', 'degli', 'nella', 'nello', 'quante', 'volte', 'siamo', 'anche'].includes(w));

    const existingIndex = this.rules.findIndex(
      (r) => r.pattern.toLowerCase() === normalized || (r.coach === params.coach && r.keywords.some((k) => normalized.includes(k)))
    );

    if (existingIndex >= 0) {
      const existing = this.rules[existingIndex];
      existing.phase = params.phase;
      existing.focusType = params.focusType;
      existing.count += 1;
      existing.lastUpdated = new Date().toISOString();
      if (params.coach) existing.coach = params.coach;
      // add new tokens
      tokens.slice(0, 5).forEach((t) => {
        if (!existing.keywords.includes(t)) existing.keywords.push(t);
      });
    } else {
      // Create new rule
      const newRule: LearnedFocusRule = {
        pattern: tokens.slice(0, 2).join(' ') || normalized.slice(0, 30),
        keywords: tokens.slice(0, 5),
        coach: params.coach,
        phase: params.phase,
        focusType: params.focusType,
        count: 1,
        lastUpdated: new Date().toISOString(),
      };
      this.rules.unshift(newRule);
    }

    // Keep top 100 rules
    if (this.rules.length > 100) {
      this.rules = this.rules.slice(0, 100);
    }

    this.saveRules();
  }
}

export const focusLearningService = new FocusLearningService();
