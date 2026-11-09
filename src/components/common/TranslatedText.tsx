import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { supabase } from '../../lib/supabase';

/**
 * Traducción automática de contenido libre (texto escrito por el staff, guardado en BD)
 * al idioma seleccionado en la app.
 *
 * - Traduce la Edge Function `translate-content` (Gemini en servidor) y guarda cada
 *   traducción en `content_translations`: cada línea se traduce una sola vez por idioma
 *   y se reutiliza para todos los usuarios.
 * - Todo se traduce por LÍNEAS y las líneas de todos los componentes en pantalla se
 *   agrupan en lotes: una pantalla con 100 textos hace 1-2 peticiones.
 * - En HTML se traducen sólo los nodos de texto, así no se rompen las etiquetas.
 * - Caché local (memoria + localStorage) para no pedir de nuevo lo ya traducido.
 */

const STORAGE_KEY = 'translatedTextCache:v3';
const MAX_STORED_ENTRIES = 3000;
const BATCH_DELAY_MS = 40;
const MAX_BATCH_CHARS = 20000;
const MAX_BATCH_LINES = 150;
const MAX_CONCURRENT = 2;

// Caché por línea: `${lang}:${línea}` -> traducción
const lineCache = new Map<string, string>();

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) (JSON.parse(raw) as [string, string][]).forEach(([k, v]) => lineCache.set(k, v));
} catch {
  /* almacenamiento no disponible: seguimos sólo con memoria */
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
const persistCache = () => {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const entries = Array.from(lineCache.entries()).slice(-MAX_STORED_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      /* cuota llena o bloqueado: ignorar */
    }
  }, 1000);
};

// --- Concurrencia limitada para las peticiones de red ---
let active = 0;
const waiting: (() => void)[] = [];
const runLimited = <T,>(task: () => Promise<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const run = () => {
      active++;
      task().then(resolve, reject).finally(() => {
        active--;
        waiting.shift()?.();
      });
    };
    if (active < MAX_CONCURRENT) run();
    else waiting.push(run);
  });

/**
 * Traduce un grupo de líneas con la Edge Function `translate-content`
 * (Gemini en servidor + caché compartida en BD). null = no traducida ahora.
 */
const translateLineGroup = async (lines: string[], targetLang: string): Promise<(string | null)[]> => {
  const { data, error } = await supabase.functions.invoke('translate-content', {
    body: { lines, targetLang },
  });
  if (error) throw error;
  const translations = (data as { translations?: (string | null)[] } | null)?.translations;
  if (!Array.isArray(translations) || translations.length !== lines.length) {
    throw new Error('translate-content: respuesta inesperada');
  }
  return translations;
};

// --- Agrupador de líneas: junta las peticiones de todos los componentes ---
type Pending = { resolve: (v: string) => void; reject: (e: unknown) => void }[];
const pendingByLang = new Map<string, Map<string, Pending>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const flush = () => {
  flushTimer = null;
  const all = Array.from(pendingByLang.entries());
  pendingByLang.clear();

  for (const [lang, linesMap] of all) {
    const lines = Array.from(linesMap.keys());
    // Empaquetar en lotes que no superen MAX_BATCH_CHARS
    const batches: string[][] = [];
    let current: string[] = [];
    let size = 0;
    for (const line of lines) {
      if (current.length && (current.length >= MAX_BATCH_LINES || size + line.length + 1 > MAX_BATCH_CHARS)) {
        batches.push(current);
        current = [];
        size = 0;
      }
      current.push(line);
      size += line.length + 1;
    }
    if (current.length) batches.push(current);

    for (const batch of batches) {
      runLimited(() => translateLineGroup(batch, lang))
        .then((translated) => {
          batch.forEach((line, i) => {
            const value = translated[i];
            // Sólo se cachea lo que realmente se tradujo; lo fallido se reintenta otra vez
            if (typeof value === 'string') lineCache.set(`${lang}:${line}`, value);
            linesMap.get(line)!.forEach((p) => p.resolve(value ?? line));
          });
          persistCache();
        })
        .catch((err) => batch.forEach((line) => linesMap.get(line)!.forEach((p) => p.reject(err))));
    }
  }
};

const translateLine = (line: string, targetLang: string): Promise<string> => {
  const cached = lineCache.get(`${targetLang}:${line}`);
  if (cached !== undefined) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    let linesMap = pendingByLang.get(targetLang);
    if (!linesMap) pendingByLang.set(targetLang, (linesMap = new Map()));
    const list = linesMap.get(line);
    if (list) list.push({ resolve, reject });
    else linesMap.set(line, [{ resolve, reject }]);
    if (!flushTimer) flushTimer = setTimeout(flush, BATCH_DELAY_MS);
  });
};

/** Traduce texto plano (puede tener varias líneas) conservando los saltos de línea. */
const translatePlain = async (text: string, targetLang: string): Promise<string> => {
  const parts = text.split('\n');
  const translated = await Promise.all(
    parts.map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return Promise.resolve(part);
      const lead = part.match(/^\s*/)?.[0] ?? '';
      const trail = part.match(/\s*$/)?.[0] ?? '';
      return translateLine(trimmed, targetLang).then((t) => `${lead}${t}${trail}`);
    })
  );
  return translated.join('\n');
};

/** Traduce sólo los nodos de texto del HTML, conservando la estructura (listas, negritas...). */
const translateHtml = async (html: string, targetLang: string): Promise<string> => {
  const doc = new DOMParser().parseFromString(DOMPurify.sanitize(html), 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.textContent && node.textContent.trim()) nodes.push(node);
  }
  if (nodes.length === 0) return html;

  await Promise.all(
    nodes.map(async (n) => {
      const original = n.textContent!;
      const lead = original.match(/^\s*/)?.[0] ?? '';
      const trail = original.match(/\s*$/)?.[0] ?? '';
      const line = original.replace(/\s*\n\s*/g, ' ').trim();
      n.textContent = `${lead}${await translateLine(line, targetLang)}${trail}`;
    })
  );
  return doc.body.innerHTML;
};

interface TranslatedTextProps {
  html?: string;
  text?: string;
  className?: string;
  as?: 'div' | 'span' | 'p';
}

export default function TranslatedText({ html, text, className, as = 'div' }: TranslatedTextProps) {
  const { i18n } = useTranslation();
  const targetLang = (i18n.language || 'es').split('-')[0];
  const originalContent = html || text || '';
  const isHtml = !!html;

  const [displayContent, setDisplayContent] = useState(originalContent);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!originalContent.trim()) {
      setDisplayContent('');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setDisplayContent(originalContent);
    setLoading(true);

    const job = isHtml ? translateHtml(originalContent, targetLang) : translatePlain(originalContent, targetLang);
    job
      .then((translated) => {
        if (isMounted) setDisplayContent(translated);
      })
      .catch((err) => {
        console.error('Translation Error:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [originalContent, targetLang, isHtml]);

  const Component = as;
  const cls = [className, loading ? 'animate-pulse opacity-70' : ''].filter(Boolean).join(' ');

  return (
    <Component className={cls || undefined}>
      {isHtml ? (
        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayContent) }} />
      ) : (
        displayContent
      )}
    </Component>
  );
}
