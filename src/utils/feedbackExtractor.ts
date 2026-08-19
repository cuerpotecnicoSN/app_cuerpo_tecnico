import DOMPurify from 'dompurify';

const POSITIVE_KEYWORDS = [
  'bien', 'buen', 'excelente', 'destaca', 'gran', 'positivo', 'acierto',
  'compromiso', 'actitud', 'esfuerzo', 'evolución', 'progreso', 'mejorado',
  'predisposición', 'implicación', 'ganas', 'compañerismo', 'liderazgo',
  'inteligente', 'rápido', 'ágil', 'fuerte', 'sólido', 'concentrado', 'genial'
];

const NEGATIVE_KEYWORDS = [
  'mal', 'falta', 'error', 'mejorar', 'negativo', 'cuesta', 'problema',
  'tarde', 'lento', 'despiste', 'flojo', 'débil', 'desconcentrado',
  'pasivo', 'apático', 'desorden', 'retraso', 'equivocación', 'riesgo',
  'inseguro', 'duda', 'precipitado', 'ansiedad', 'queja'
];

export interface ExtractedFeedback {
  positives: string[];
  negatives: string[];
}

export function extractFeedbackFromHtml(objectiveHtml: string, developmentHtml: string): ExtractedFeedback {
  const result: ExtractedFeedback = { positives: [], negatives: [] };
  
  // Combina ambos textos
  const fullHtml = `${objectiveHtml || ''} ${developmentHtml || ''}`;
  
  // Si está vacío, retorna rápido
  if (!fullHtml.trim()) return result;

  // 1. Sanitizar el HTML para evitar problemas de formato, pero preservando las etiquetas importantes
  const cleanHtml = DOMPurify.sanitize(fullHtml, { ALLOWED_TAGS: ['p', 'div', 'br', 'ul', 'ol', 'li', 'span', 'strong', 'em', 'b', 'i'] });

  // 2. Extraer texto plano dividiendo por posibles separadores lógicos (puntos, saltos de línea, etiquetas de bloque)
  // Reemplazamos etiquetas de lista y saltos por separadores especiales para poder hacer split
  const textWithSeparators = cleanHtml
    .replace(/<li[^>]*>/gi, '|||')
    .replace(/<p[^>]*>/gi, '|||')
    .replace(/<br\s*\/?>/gi, '|||')
    .replace(/<div[^>]*>/gi, '|||')
    .replace(/(<([^>]+)>)/gi, ''); // Eliminar el resto de HTML (strong, em, cierres de tags)

  // 3. Dividir por el separador o por puntos finales (.)
  // Además decodificamos entidades HTML básicas como &nbsp;
  const rawSentences = textWithSeparators
    .replace(/&nbsp;/g, ' ')
    .split(/\|\|\||\.\s/);

  // 4. Limpiar sentencias y procesarlas
  const sentences = rawSentences
    .map(s => s.trim())
    .filter(s => s.length > 5); // Ignorar frases muy cortas (ej. "Hola", "ok")

  // 5. Analizar cada sentencia
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    
    let isPositive = false;
    let isNegative = false;

    // Buscar palabras negativas primero (suelen ser más críticas/fáciles de priorizar)
    for (const keyword of NEGATIVE_KEYWORDS) {
      // Usamos regex con límites de palabra para evitar falsos positivos (ej. "faltar" vs "asfalto")
      const regex = new RegExp(`\\b${keyword}[a-záéíóúñ]*\\b`, 'i');
      if (regex.test(lowerSentence)) {
        isNegative = true;
        break; // Basta una palabra negativa fuerte para clasificarla como "a mejorar"
      }
    }

    // Buscar palabras positivas
    if (!isNegative) { // Si ya es negativa, evitamos ponerla en ambas o priorizamos la negativa
      for (const keyword of POSITIVE_KEYWORDS) {
        const regex = new RegExp(`\\b${keyword}[a-záéíóúñ]*\\b`, 'i');
        if (regex.test(lowerSentence)) {
          isPositive = true;
          break;
        }
      }
    }

    // Clasificar y capitalizar la primera letra
    const formattedSentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);

    if (isNegative) {
      // Evitamos duplicados
      if (!result.negatives.includes(formattedSentence)) {
        result.negatives.push(formattedSentence);
      }
    } else if (isPositive) {
      if (!result.positives.includes(formattedSentence)) {
        result.positives.push(formattedSentence);
      }
    }
  }

  return result;
}
