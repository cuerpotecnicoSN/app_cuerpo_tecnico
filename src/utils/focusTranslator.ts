/**
 * Tactical Football Translator (Italian -> Spanish / English)
 * Combines a specialized football dictionary, phrase pattern matching, and online fallback.
 */

// Specialized tactical football lexicon & pattern mappings
const IT_TO_ES_PHRASES: [RegExp, string][] = [
  [/la posizione di/gi, 'La posición de'],
  [/con i (\d+) difensori centrali/gi, 'con los $1 defensas centrales'],
  [/difensori centrali/gi, 'defensas centrales'],
  [/difensore centrale/gi, 'defensa central'],
  [/con e senza palla/gi, 'con y sin balón'],
  [/senza palla/gi, 'sin balón'],
  [/con palla/gi, 'con balón'],
  [/come difendiamo in area di rigore/gi, 'Cómo defendemos en el área de penalti'],
  [/come difendiamo sul loro gioco diretto/gi, 'Cómo defendemos ante su juego directo'],
  [/come difendiamo/gi, 'Cómo defendemos'],
  [/in area di rigore/gi, 'en el área de penalti'],
  [/in area/gi, 'en el área'],
  [/quante volte vanno in profondit[àa]/gi, 'cuántas veces van en profundidad'],
  [/quante volte corrono in profondit[àa]/gi, 'cuántas veces corren en profundidad / al espacio'],
  [/corrono in profondit[àa]/gi, 'corren en profundidad'],
  [/vanno in profondit[àa]/gi, 'van en profundidad'],
  [/quante volte ricevono/gi, 'cuántas veces reciben'],
  [/quanti giocatori arrivano/gi, 'cuántos jugadores llegan'],
  [/quante volte siamo capaci di/gi, 'cuántas veces somos capaces de'],
  [/quante volte vinciamo/gi, 'cuántas veces ganamos'],
  [/quante volte/gi, 'cuántas veces'],
  [/nella met[àa] campo offensiva/gi, 'en campo ofensivo / rival'],
  [/nella met[àa] campo difensiva/gi, 'en campo propio'],
  [/met[àa] campo/gi, 'medio campo'],
  [/giocare dentro\/fuori e poi avanti/gi, 'jugar dentro/fuera y luego hacia adelante'],
  [/dentro\/fuori/gi, 'dentro/fuera'],
  [/e poi avanti/gi, 'y luego hacia adelante'],
  [/giochiamo in avanti/gi, 'jugamos hacia adelante'],
  [/in avanti/gi, 'hacia adelante'],
  [/come siamo ubicati dentro/gi, 'cómo estamos posicionados por dentro'],
  [/ubicati dentro/gi, 'posicionados por dentro'],
  [/seconda palla/gi, 'segundo balón'],
  [/nelle palle inattive/gi, 'a balón parado (ABP)'],
  [/palle inattive a favore e contro/gi, 'Balón parado (ABP) a favor y en contra'],
  [/palle inattive a favore/gi, 'Balón parado a favor'],
  [/palle inattive contro/gi, 'Balón parado en contra'],
  [/palle inattive/gi, 'balón parado (ABP)'],
  [/la comunicazione di (\w+) con i/gi, 'La comunicación de $1 con los'],
  [/comunicazione con/gi, 'comunicación con'],
  [/marcature, riferimenti/gi, 'marcajes y referencias'],
  [/marcature/gi, 'marcajes'],
  [/riferimenti/gi, 'referencias'],
  [/arrivano in area/gi, 'llegan al área'],
  [/comprese le rimesse laterali contro/gi, 'incluidos saques de banda en contra'],
  [/rimesse laterali contro/gi, 'saques de banda en contra'],
  [/rimesse laterali a favore/gi, 'saques de banda a favor'],
  [/rimesse laterali/gi, 'saques de banda'],
  [/iniziativa nel difendere/gi, 'iniciativa al defender'],
  [/iniziativa senza palla/gi, 'Iniciativa sin balón'],
  [/iniziativa/gi, 'iniciativa'],
  [/nel difendere/gi, 'al defender'],
  [/sul loro gioco diretto/gi, 'ante su juego directo'],
  [/gioco diretto/gi, 'juego directo'],
  [/superiorit[àa] dentro/gi, 'Superioridad por dentro'],
  [/superiorit[àa] numerica/gi, 'superioridad numérica'],
  [/preventive/gi, 'Vigilancias defensivas / Preventivas'],
  [/pressione dopo la perdita/gi, 'Presión tras pérdida'],
  [/dopo la perdita/gi, 'tras pérdida'],
  [/recupero palla/gi, 'recuperación de balón'],
  [/linea difensiva/gi, 'línea defensiva'],
  [/primo tempo/gi, 'primer tiempo'],
  [/secondo tempo/gi, 'segundo tiempo'],
  [/calcio d'angolo/gi, 'saque de esquina / córner'],
  [/calci piazzati/gi, 'balón parado'],
  [/transizione offensiva/gi, 'transición ofensiva'],
  [/transizione difensiva/gi, 'transición defensiva'],
  [/conteggio e conclusioni/gi, 'Conteo y finalizaciones'],
  [/finalizzazione/gi, 'Finalización'],
  [/chi e quante volte/gi, 'Quién y cuántas veces'],
  [/in che zona di campo/gi, 'en qué zona del campo'],
  [/\b e \b/g, ' y '],
];

const IT_TO_EN_PHRASES: [RegExp, string][] = [
  [/la posizione di/gi, 'Position of'],
  [/con i (\d+) difensori centrali/gi, 'with the $1 center backs'],
  [/difensori centrali/gi, 'center backs'],
  [/con e senza palla/gi, 'with and without the ball'],
  [/senza palla/gi, 'without the ball'],
  [/con palla/gi, 'with the ball'],
  [/come difendiamo in area di rigore/gi, 'How we defend in the penalty box'],
  [/quante volte vanno in profondit[àa]/gi, 'how many times they attack the space'],
  [/nella met[àa] campo offensiva/gi, 'in the attacking half'],
  [/seconda palla/gi, 'second ball'],
  [/palle inattive/gi, 'set pieces (ABP)'],
  [/rimesse laterali/gi, 'throw-ins'],
  [/iniziativa senza palla/gi, 'Initiative without the ball'],
  [/superiorit[àa] dentro/gi, 'Overload inside / Central superiority'],
  [/preventive/gi, 'Rest defense / Defensive preventatives'],
  [/pressione dopo la perdita/gi, 'Counter-pressing after loss'],
];

/**
 * Translates tactical text offline using specialized football heuristics
 */
export function translateTacticalTextOffline(text: string, targetLang: 'es' | 'en' | 'it' = 'es'): string {
  if (!text || targetLang === 'it') return text;

  let result = text.trim();

  if (targetLang === 'es') {
    for (const [pattern, replacement] of IT_TO_ES_PHRASES) {
      result = result.replace(pattern, replacement);
    }
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  if (targetLang === 'en') {
    for (const [pattern, replacement] of IT_TO_EN_PHRASES) {
      result = result.replace(pattern, replacement);
    }
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result;
}

const translationCache = new Map<string, string>();

export async function translateTacticalText(text: string, targetLang: 'es' | 'en' | 'it' = 'es'): Promise<string> {
  const clean = text.trim();
  if (!clean || targetLang === 'it') return clean;

  const cacheKey = `${targetLang}:${clean}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  const offlineTranslation = translateTacticalTextOffline(clean, targetLang);
  if (offlineTranslation !== clean) {
    translationCache.set(cacheKey, offlineTranslation);
    return offlineTranslation;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=it|${targetLang}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data?.responseData?.translatedText) {
        const translated = data.responseData.translatedText;
        translationCache.set(cacheKey, translated);
        return translated;
      }
    }
  } catch {
    // ignore
  }

  translationCache.set(cacheKey, offlineTranslation);
  return offlineTranslation;
}
