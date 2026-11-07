import i18n from '../i18n';

/**
 * Normaliza y traduce cualquier demarcación / posición futbolística
 * al idioma actual activo de la aplicación (o el especificado).
 */
const POSITION_MAP: Record<string, { es: string; it: string; en: string }> = {
  // Portero / Goalkeeper / Portiere
  portero: { es: 'Portero', it: 'Portiere', en: 'Goalkeeper' },
  portiere: { es: 'Portero', it: 'Portiere', en: 'Goalkeeper' },
  goalkeeper: { es: 'Portero', it: 'Portiere', en: 'Goalkeeper' },
  arquero: { es: 'Portero', it: 'Portiere', en: 'Goalkeeper' },
  guardameta: { es: 'Portero', it: 'Portiere', en: 'Goalkeeper' },
  p: { es: 'Portero', it: 'Portiere', en: 'Goalkeeper' },
  por: { es: 'Portero', it: 'Portiere', en: 'Goalkeeper' },
  gk: { es: 'Portero', it: 'Portiere', en: 'Goalkeeper' },

  // Defensa / Defender / Difensore
  defensa: { es: 'Defensa', it: 'Difensore', en: 'Defender' },
  difensore: { es: 'Defensa', it: 'Difensore', en: 'Defender' },
  defender: { es: 'Defensa', it: 'Difensore', en: 'Defender' },
  def: { es: 'Defensa', it: 'Difensore', en: 'Defender' },
  dif: { es: 'Defensa', it: 'Difensore', en: 'Defender' },
  d: { es: 'Defensa', it: 'Difensore', en: 'Defender' },

  'defensa central': { es: 'Defensa central', it: 'Difensore centrale', en: 'Centre-back' },
  'difensore centrale': { es: 'Defensa central', it: 'Difensore centrale', en: 'Centre-back' },
  'centre-back': { es: 'Defensa central', it: 'Difensore centrale', en: 'Centre-back' },
  central: { es: 'Defensa central', it: 'Difensore centrale', en: 'Centre-back' },

  'lateral derecho': { es: 'Lateral derecho', it: 'Terzino destro', en: 'Right-back' },
  'terzino destro': { es: 'Lateral derecho', it: 'Terzino destro', en: 'Right-back' },
  'right-back': { es: 'Lateral derecho', it: 'Terzino destro', en: 'Right-back' },

  'lateral izquierdo': { es: 'Lateral izquierdo', it: 'Terzino sinistro', en: 'Left-back' },
  'terzino sinistro': { es: 'Lateral izquierdo', it: 'Terzino sinistro', en: 'Left-back' },
  'left-back': { es: 'Lateral izquierdo', it: 'Terzino sinistro', en: 'Left-back' },

  carrilero: { es: 'Carrilero', it: 'Esterno a tutta fascia', en: 'Wing-back' },
  'carrilero derecho': { es: 'Carrilero derecho', it: 'Esterno destro a tutta fascia', en: 'Right wing-back' },
  'carrilero izquierdo': { es: 'Carrilero izquierdo', it: 'Esterno sinistro a tutta fascia', en: 'Left wing-back' },
  'wing-back': { es: 'Carrilero', it: 'Esterno a tutta fascia', en: 'Wing-back' },

  // Centrocampista / Midfielder / Centrocampista
  centrocampista: { es: 'Centrocampista', it: 'Centrocampista', en: 'Midfielder' },
  midfielder: { es: 'Centrocampista', it: 'Centrocampista', en: 'Midfielder' },
  medio: { es: 'Centrocampista', it: 'Centrocampista', en: 'Midfielder' },
  med: { es: 'Centrocampista', it: 'Centrocampista', en: 'Midfielder' },
  cen: { es: 'Centrocampista', it: 'Centrocampista', en: 'Midfielder' },
  mid: { es: 'Centrocampista', it: 'Centrocampista', en: 'Midfielder' },
  c: { es: 'Centrocampista', it: 'Centrocampista', en: 'Midfielder' },

  pivote: { es: 'Pivote defensivo', it: 'Mediano', en: 'Defensive midfielder' },
  mediano: { es: 'Pivote defensivo', it: 'Mediano', en: 'Defensive midfielder' },
  'defensive midfielder': { es: 'Pivote defensivo', it: 'Mediano', en: 'Defensive midfielder' },
  'centrocampista defensivo': { es: 'Pivote defensivo', it: 'Mediano', en: 'Defensive midfielder' },

  mediapunta: { es: 'Mediapunta', it: 'Trequartista', en: 'Attacking midfielder' },
  trequartista: { es: 'Mediapunta', it: 'Trequartista', en: 'Attacking midfielder' },
  'attacking midfielder': { es: 'Mediapunta', it: 'Trequartista', en: 'Attacking midfielder' },
  'centrocampista ofensivo': { es: 'Mediapunta', it: 'Trequartista', en: 'Attacking midfielder' },

  interior: { es: 'Interior', it: 'Mezzala', en: 'Central midfielder' },
  mezzala: { es: 'Interior', it: 'Mezzala', en: 'Central midfielder' },
  'interior derecho': { es: 'Interior derecho', it: 'Mezzala destra', en: 'Right central midfielder' },
  'interior izquierdo': { es: 'Interior izquierdo', it: 'Mezzala sinistra', en: 'Left central midfielder' },

  'medio centro': { es: 'Mediocentro', it: 'Centrocampista centrale', en: 'Central midfielder' },
  mediocentro: { es: 'Mediocentro', it: 'Centrocampista centrale', en: 'Central midfielder' },
  'centrocampista centrale': { es: 'Mediocentro', it: 'Centrocampista centrale', en: 'Central midfielder' },
  'central midfielder': { es: 'Mediocentro', it: 'Centrocampista centrale', en: 'Central midfielder' },

  // Delantero / Forward / Attaccante
  delantero: { es: 'Delantero', it: 'Attaccante', en: 'Forward' },
  attaccante: { es: 'Delantero', it: 'Attaccante', en: 'Forward' },
  forward: { es: 'Delantero', it: 'Attaccante', en: 'Forward' },
  striker: { es: 'Delantero centro', it: 'Punta centrale', en: 'Striker' },
  del: { es: 'Delantero', it: 'Attaccante', en: 'Forward' },
  att: { es: 'Delantero', it: 'Attaccante', en: 'Forward' },
  fwd: { es: 'Delantero', it: 'Attaccante', en: 'Forward' },
  a: { es: 'Delantero', it: 'Attaccante', en: 'Forward' },

  'delantero centro': { es: 'Delantero centro', it: 'Punta centrale', en: 'Centre-forward' },
  'centre-forward': { es: 'Delantero centro', it: 'Punta centrale', en: 'Centre-forward' },
  'punta centrale': { es: 'Delantero centro', it: 'Punta centrale', en: 'Centre-forward' },
  punta: { es: 'Delantero centro', it: 'Punta centrale', en: 'Centre-forward' },

  'segundo delantero': { es: 'Segundo delantero', it: 'Seconda punta', en: 'Second striker' },
  'segunda punta': { es: 'Segundo delantero', it: 'Seconda punta', en: 'Second striker' },
  'seconda punta': { es: 'Segundo delantero', it: 'Seconda punta', en: 'Second striker' },
  'second striker': { es: 'Segundo delantero', it: 'Seconda punta', en: 'Second striker' },

  extremo: { es: 'Extremo', it: 'Ala', en: 'Winger' },
  ala: { es: 'Extremo', it: 'Ala', en: 'Winger' },
  winger: { es: 'Extremo', it: 'Ala', en: 'Winger' },
  'extremo derecho': { es: 'Extremo derecho', it: 'Ala destra', en: 'Right winger' },
  'ala destra': { es: 'Extremo derecho', it: 'Ala destra', en: 'Right winger' },
  'right winger': { es: 'Extremo derecho', it: 'Ala destra', en: 'Right winger' },
  'extremo izquierdo': { es: 'Extremo izquierdo', it: 'Ala sinistra', en: 'Left winger' },
  'ala sinistra': { es: 'Extremo izquierdo', it: 'Ala sinistra', en: 'Left winger' },
  'left winger': { es: 'Extremo izquierdo', it: 'Ala sinistra', en: 'Left winger' },
};

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Traduce una posición según el idioma actual (o el idioma pasado).
 */
export function translatePosition(position?: string | null, targetLang?: string): string {
  if (!position || !position.trim()) return '';

  const clean = position.trim();
  const norm = normalizeKey(clean);

  const lang = (targetLang || i18n.language || 'es').slice(0, 2) as 'es' | 'it' | 'en';
  const effectiveLang: 'es' | 'it' | 'en' = ['es', 'it', 'en'].includes(lang) ? lang : 'es';

  // 1. Coincidencia exacta directa
  if (POSITION_MAP[norm]) {
    return POSITION_MAP[norm][effectiveLang];
  }

  // 2. Coincidencia si contiene guiones o barras ej: "Delantero - Delantero centro"
  if (clean.includes('-')) {
    const parts = clean.split('-').map((p) => p.trim());
    const lastPart = parts[parts.length - 1];
    const normLast = normalizeKey(lastPart);
    if (POSITION_MAP[normLast]) {
      return POSITION_MAP[normLast][effectiveLang];
    }
  }

  // 3. Coincidencia por subcadenas habituales
  if (norm.includes('delantero centro') || norm.includes('punta centrale') || norm.includes('centre-forward') || norm.includes('centre forward')) {
    return POSITION_MAP['delantero centro'][effectiveLang];
  }
  if (norm.includes('segundo delantero') || norm.includes('seconda punta') || norm.includes('second striker')) {
    return POSITION_MAP['segundo delantero'][effectiveLang];
  }
  if (norm.includes('extremo derech') || norm.includes('ala destr') || norm.includes('right wing')) {
    return POSITION_MAP['extremo derecho'][effectiveLang];
  }
  if (norm.includes('extremo izquierd') || norm.includes('ala sinistr') || norm.includes('left wing')) {
    return POSITION_MAP['extremo izquierdo'][effectiveLang];
  }
  if (norm.includes('lateral derech') || norm.includes('terzino destr') || norm.includes('right-back') || norm.includes('right back')) {
    return POSITION_MAP['lateral derecho'][effectiveLang];
  }
  if (norm.includes('lateral izquierd') || norm.includes('terzino sinistr') || norm.includes('left-back') || norm.includes('left back')) {
    return POSITION_MAP['lateral izquierdo'][effectiveLang];
  }
  if (norm.includes('defensa central') || norm.includes('difensore centrale') || norm.includes('centre-back') || norm.includes('centre back') || norm === 'central') {
    return POSITION_MAP['defensa central'][effectiveLang];
  }
  if (norm.includes('mediapunta') || norm.includes('trequartista') || norm.includes('attacking midfielder')) {
    return POSITION_MAP['mediapunta'][effectiveLang];
  }
  if (norm.includes('pivote') || norm.includes('mediano') || norm.includes('defensive midfielder')) {
    return POSITION_MAP['pivote'][effectiveLang];
  }
  if (norm.includes('mediocentro') || norm.includes('medio centro') || norm.includes('centrocampista centrale') || norm.includes('central midfielder')) {
    return POSITION_MAP['mediocentro'][effectiveLang];
  }
  if (norm.includes('portero') || norm.includes('portiere') || norm.includes('goalkeeper') || norm.includes('arquero')) {
    return POSITION_MAP['portero'][effectiveLang];
  }
  if (norm.includes('defensa') || norm.includes('difensore') || norm.includes('defender')) {
    return POSITION_MAP['defensa'][effectiveLang];
  }
  if (norm.includes('centrocampista') || norm.includes('midfielder') || norm.includes('medio')) {
    return POSITION_MAP['centrocampista'][effectiveLang];
  }
  if (norm.includes('delantero') || norm.includes('attaccante') || norm.includes('forward') || norm.includes('punta')) {
    return POSITION_MAP['delantero'][effectiveLang];
  }

  return clean;
}

