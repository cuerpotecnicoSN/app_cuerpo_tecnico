// Edge Function: traduce contenido libre (reuniones, feedback, objetivos...) al idioma
// seleccionado en la app, con caché compartida en public.content_translations.
//
// Petición:  POST { lines: string[], targetLang: 'es' | 'en' | 'it' }
// Respuesta: { translations: (string | null)[] }  (mismo orden y longitud que `lines`;
//            null = no se pudo traducir en este momento)
//
// Cada línea se traduce una sola vez por idioma (Gemini) y queda guardada para todos.
// Requiere usuario autenticado. La clave de Gemini vive sólo en el servidor.
//
// Deploy:  npx supabase functions deploy translate-content
// Secrets: npx supabase secrets set GEMINI_API_KEY=...
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const LANGS: Record<string, string> = { es: 'Spanish (Spain)', en: 'English', it: 'Italian' };
const MAX_LINES = 300;
const MAX_LINE_CHARS = 5000;
const CHUNK_MAX_LINES = 60;
const CHUNK_MAX_CHARS = 12000;
const GEMINI_MODEL = 'gemini-2.5-flash';

const sha256 = async (text: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Traduce un bloque de líneas con Gemini. Devuelve el mismo número de líneas. */
const geminiTranslate = async (lines: string[], targetLang: string, apiKey: string): Promise<string[]> => {
  const language = LANGS[targetLang];
  const prompt = `You are a professional translator for a football (soccer) club's coaching staff.
Translate each string of the JSON array below into ${language}.

Rules:
- Return ONLY a JSON array of strings, same order, exactly ${lines.length} elements.
- Keep people's names, nicknames, club names, numbers, dates and abbreviations unchanged.
- Use natural football / sports-psychology terminology.
- If a string is already in ${language}, return it unchanged.
- Do not add explanations, quotes or notes.

${JSON.stringify(lines)}`;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              responseMimeType: 'application/json',
              responseSchema: { type: 'ARRAY', items: { type: 'STRING' } },
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        }
      );
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Gemini HTTP ${res.status}`);
        await sleep(800 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || parsed.length !== lines.length) {
        throw new Error(`Gemini devolvió ${Array.isArray(parsed) ? parsed.length : 'no-array'} de ${lines.length}`);
      }
      return parsed.map((s: unknown, i: number) => (typeof s === 'string' && s.trim() ? s : lines[i]));
    } catch (err) {
      lastError = err;
      await sleep(500 * (attempt + 1));
    }
  }
  throw lastError ?? new Error('Gemini translation failed');
};

/** Agrupa líneas en bloques razonables para una sola llamada al modelo. */
const chunk = (lines: string[]) => {
  const chunks: string[][] = [];
  let current: string[] = [];
  let size = 0;
  for (const line of lines) {
    if (current.length && (current.length >= CHUNK_MAX_LINES || size + line.length > CHUNK_MAX_CHARS)) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(line);
    size += line.length;
  }
  if (current.length) chunks.push(current);
  return chunks;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) return json({ error: 'Falta el secreto GEMINI_API_KEY' }, 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1. Sólo usuarios autenticados
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return json({ error: 'No autenticado' }, 401);
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return json({ error: 'No autenticado' }, 401);

  // 2. Validación
  let body: { lines?: unknown; targetLang?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
  const targetLang = String(body.targetLang ?? '');
  if (!LANGS[targetLang]) return json({ error: 'Idioma no soportado' }, 400);
  if (!Array.isArray(body.lines) || body.lines.length > MAX_LINES) {
    return json({ error: `lines debe ser un array de como mucho ${MAX_LINES} textos` }, 400);
  }
  const lines = body.lines.map((l) => (typeof l === 'string' ? l : '')).map((l) => l.slice(0, MAX_LINE_CHARS));

  // 3. Caché compartida
  const unique = Array.from(new Set(lines.filter((l) => l.trim())));
  const hashes = new Map<string, string>();
  await Promise.all(unique.map(async (l) => hashes.set(l, await sha256(l))));

  const result = new Map<string, string>();
  if (unique.length) {
    const { data: cached, error } = await admin
      .from('content_translations')
      .select('source_hash, translated_text')
      .eq('target_lang', targetLang)
      .in('source_hash', Array.from(hashes.values()));
    if (error) console.error('Cache read error:', error);
    const byHash = new Map((cached ?? []).map((r: any) => [r.source_hash, r.translated_text as string]));
    for (const l of unique) {
      const hit = byHash.get(hashes.get(l)!);
      if (hit !== undefined) result.set(l, hit);
    }
  }

  // 4. Traducir lo que falta y guardarlo
  const missing = unique.filter((l) => !result.has(l));
  const failed: string[] = [];
  for (const group of chunk(missing)) {
    try {
      const translated = await geminiTranslate(group, targetLang, geminiKey);
      const rows = group.map((l, i) => ({
        source_hash: hashes.get(l)!,
        target_lang: targetLang,
        source_text: l,
        translated_text: translated[i],
        provider: 'gemini',
      }));
      group.forEach((l, i) => result.set(l, translated[i]));
      const { error } = await admin.from('content_translations').upsert(rows, { onConflict: 'source_hash,target_lang' });
      if (error) console.error('Cache write error:', error);
    } catch (err) {
      console.error('Translation chunk failed:', err);
      failed.push(...group);
    }
  }

  // null = no se pudo traducir ahora (el cliente muestra el original y reintentará más tarde)
  return json({
    translations: lines.map((l) => (l.trim() ? result.get(l) ?? null : l)),
    failed: failed.length,
  });
});
