// Edge Function: importa las respuestas del Google Form (Google Sheet vinculado)
// a player_development_items. Solo staff.
//
// Secrets (Supabase > Edge Functions > Secrets):
//   GOOGLE_SERVICE_ACCOUNT_JSON  -> el mismo que usa upload-meeting-doc
//   GOOGLE_SHEET_ID              -> id del Sheet (lo que va entre /d/ y /edit en la URL)
// El Sheet debe estar compartido (Lector) con el client_email de la Service Account.
//
// Identificación del jugador (por fila):
//   1. Si hay columna de email y coincide con players.email -> ese jugador.
//   2. Si no, por PARECIDO de nombre ("Nome e cognome") contra nombre+apellidos
//      y football_name de los jugadores de la temporada. Tolera tildes, mayúsculas,
//      orden, diminutivos ("Dani" ~ "Daniel"), iniciales ("G." ~ "García") y erratas.
//   Si el parecido es bajo o hay dos jugadores casi igual de parecidos, la fila NO
//   se importa y se devuelve en `unmatched` con la mejor sugerencia.
// Cada fila del Sheet es una respuesta nueva que SE SUMA al jugador (historial).
// Cada respuesta+pregunta tiene un source_key estable: re-sincronizar no duplica
// y no pisa lo que el staff haya editado después.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { KJUR } from 'npm:jsrsasign@11.1.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function googleToken(email: string, key: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = KJUR.jws.JWS.sign(
    null,
    JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
    JSON.stringify({
      iss: email,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
    key,
  );
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!res.ok) throw new Error(`Google auth ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

// ---------- Mapeo pregunta del Form -> sección/categoría de la app ----------
// Se busca por fragmento del encabezado (sin tildes ni mayúsculas), así no
// depende de puntuación exacta ni del orden de las columnas.
type Field =
  | 'name' | 'email' | 'timestamp'
  | 'obj_futbol' | 'obj_fisico' | 'obj_personal'
  | 'trait_strengths' | 'trait_improve' | 'trait_person'
  | 'focus_training' | 'focus_match' | 'focus_off'
  | 'match_name' | 'match_date' | 'match_good' | 'match_better' | 'match_plays'
  | 'tasks' | 'tasks_deadline';

const HEADER_MATCHERS: [Field, string[]][] = [
  ['timestamp', ['informazioni cronologiche', 'timestamp', 'marca temporal']],
  ['email', ['indirizzo email', 'email address', 'correo electronico', 'e-mail', 'email']],
  ['name', ['nome e cognome', 'full name']],
  ['obj_futbol', ['obiettivo calcistico', 'football goal']],
  ['obj_fisico', ['obiettivo fisico', 'physical goal']],
  ['obj_personal', ['obiettivo personale', 'personal goal']],
  ['trait_strengths', ['punti di forza', 'your strengths']],
  ['trait_improve', ['cosa devi migliorare', 'what you need to improve']],
  ['trait_person', ['come ti descriveresti', 'how would you describe']],
  ['focus_training', ['focus in allenamento', 'training focus']],
  ['focus_match', ['focus in partita', 'match focus']],
  ['focus_off', ['focus fuori dal campo', 'off-the-pitch focus']],
  ['match_date', ['data della partita', 'match date']],
  ['match_good', ['cosa hai fatto bene', 'what you did well']],
  ['match_better', ['cosa potevi fare meglio', 'could have done better']],
  ['match_plays', ['azioni chiave', 'key plays']],
  ['tasks_deadline', ['entro quando', 'by when']],
  ['tasks', ['attivita da svolgere', 'tasks to do']],
  // "Partita / Match" va al final: es el fragmento más genérico
  ['match_name', ['partita / match', 'partita/match']],
];

// Preguntas de texto que generan un item cada una
const SIMPLE_ITEMS: { field: Field; section: string; category: string; label: string }[] = [
  { field: 'obj_futbol', section: 'objectives', category: 'futbol', label: '' },
  { field: 'obj_fisico', section: 'objectives', category: 'fisico', label: '' },
  { field: 'obj_personal', section: 'objectives', category: 'personal', label: '' },
  { field: 'trait_strengths', section: 'personal_traits', category: 'en_el_juego', label: 'Punti di forza / Strengths' },
  { field: 'trait_improve', section: 'personal_traits', category: 'en_el_juego', label: 'Da migliorare / To improve' },
  { field: 'trait_person', section: 'personal_traits', category: 'a_nivel_personal', label: '' },
  { field: 'focus_training', section: 'focuses', category: 'entrenamiento', label: '' },
  { field: 'focus_match', section: 'focuses', category: 'partido', label: '' },
  { field: 'focus_off', section: 'focuses', category: 'fuera_del_campo', label: '' },
];

const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function mapHeaders(headers: unknown[]): Partial<Record<Field, number>> {
  const out: Partial<Record<Field, number>> = {};
  headers.forEach((h, idx) => {
    const n = norm(h);
    for (const [field, needles] of HEADER_MATCHERS) {
      if (out[field] !== undefined) continue;
      if (needles.some((needle) => n.includes(needle))) {
        out[field] = idx;
        break;
      }
    }
  });
  return out;
}

// Con UNFORMATTED_VALUE + SERIAL_NUMBER las fechas llegan como nº de días desde 1899-12-30
function serialToDate(v: unknown): string | null {
  if (typeof v === 'number' && v > 0) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v * 86400000));
    return d.toISOString().slice(0, 10);
  }
  if (typeof v === 'string' && v.trim()) {
    const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/); // dd/mm/yyyy
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const iso = v.trim().match(/^\d{4}-\d{2}-\d{2}/);
    if (iso) return iso[0];
  }
  return null;
}

// ---------- Parecido de nombres ----------
const MATCH_THRESHOLD = 0.8; // parecido mínimo para asignar
const MATCH_MARGIN = 0.08;   // ventaja mínima sobre el 2º candidato (evita ambigüedad)

const nameTokens = (s: unknown) =>
  norm(s).replace(/[^a-z0-9\s]/g, ' ').split(' ').filter(Boolean);

function levRatio(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}

function tokenSim(t: string, c: string): number {
  if (t === c) return 1;
  if (t.length === 1 || c.length === 1) return t[0] === c[0] ? 0.75 : 0; // inicial
  if (Math.min(t.length, c.length) >= 3 && (c.startsWith(t) || t.startsWith(c))) return 0.9; // Dani ~ Daniel
  return levRatio(t, c);
}

// Parecido 0..1 entre lo que escribió el jugador y un nombre de la app
function nameSimilarity(input: string[], candidate: string[]): number {
  if (!input.length || !candidate.length) return 0;
  // cada palabra escrita debe parecerse a alguna del jugador...
  const covered = input.reduce((s, t) => s + Math.max(...candidate.map((c) => tokenSim(t, c))), 0) / input.length;
  // ...y penaliza un poco si sobran muchas palabras del jugador sin cubrir
  const used = candidate.filter((c) => input.some((t) => tokenSim(t, c) >= 0.75)).length / candidate.length;
  const whole = levRatio(input.join(' '), candidate.join(' '));
  return Math.max(whole, covered * (0.85 + 0.15 * used));
}

interface PlayerRow { id: string; first_name: string | null; last_name: string | null; football_name: string | null; email: string | null }
const displayName = (p: PlayerRow) =>
  p.football_name?.trim() || [p.first_name, p.last_name].filter(Boolean).join(' ');

function bestPlayer(name: string, players: PlayerRow[]) {
  const input = nameTokens(name);
  const scored = players
    .map((p) => {
      const variants = [
        nameTokens(`${p.first_name ?? ''} ${p.last_name ?? ''}`),
        nameTokens(p.football_name),
      ].filter((v) => v.length);
      return { p, score: Math.max(0, ...variants.map((v) => nameSimilarity(input, v))) };
    })
    .sort((a, b) => b.score - a.score);
  const [first, second] = scored;
  if (!first) return { player: null, score: 0, suggestion: null };
  const ok = first.score >= MATCH_THRESHOLD && first.score - (second?.score ?? 0) >= MATCH_MARGIN;
  return { player: ok ? first.p : null, score: first.score, suggestion: first.score >= 0.5 ? first.p : null };
}

const text = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

// title corto para la tarjeta; el texto completo va en description si no cabe
function titleAndDescription(answer: string, label: string) {
  const firstLine = answer.split('\n')[0].trim();
  const max = 120;
  const short = firstLine.length > max ? firstLine.slice(0, max - 1).trimEnd() + '…' : firstLine;
  const title = label ? `${label}: ${short}` : short;
  const description = answer !== firstLine || firstLine.length > max ? answer : null;
  return { title, description };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'No autorizado' }, 401);
    const { data: isStaff } = await userClient.rpc('is_staff');
    if (!isStaff) return json({ error: 'Solo el staff puede sincronizar' }, 403);

    let rawSa = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') || '{}';
    if (rawSa.startsWith('"') && rawSa.endsWith('"')) {
      try { rawSa = JSON.parse(rawSa); } catch (_) { /* ignore */ }
    }
    const sa = typeof rawSa === 'string' ? JSON.parse(rawSa) : rawSa;
    const sheetId = Deno.env.get('GOOGLE_SHEET_ID');
    if (!sa.client_email || !sa.private_key || !sheetId) {
      return json({ error: 'Faltan GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_SHEET_ID en los secrets' }, 500);
    }

    // 1. Elegir la pestaña de respuestas del Form:
    //    GOOGLE_SHEET_GID (el gid= de la URL) si está, si no la que se llame
    //    "Respuestas de formulario…/Risposte del modulo…/Form Responses…", si no la primera.
    const token = await googleToken(sa.client_email, sa.private_key);
    const gauth = { headers: { Authorization: `Bearer ${token}` } };
    const sharedHint = ` (¿Has compartido el Sheet con ${sa.client_email} y activado la Google Sheets API?)`;
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties(sheetId,title,index)`,
      gauth,
    );
    if (!metaRes.ok) return json({ error: `Google Sheets ${metaRes.status}${sharedHint}: ${await metaRes.text()}` }, 500);
    const tabs: { sheetId: number; title: string; index: number }[] =
      ((await metaRes.json()).sheets ?? []).map((s: { properties: unknown }) => s.properties);
    const gid = Deno.env.get('GOOGLE_SHEET_GID');
    const tab =
      (gid ? tabs.find((t) => String(t.sheetId) === gid.trim()) : undefined) ??
      tabs.find((t) => /^(respuestas|risposte|form responses)/i.test(t.title)) ??
      [...tabs].sort((a, b) => a.index - b.index)[0];
    if (!tab) return json({ error: 'El Sheet no tiene pestañas' }, 400);

    const range = encodeURIComponent(`'${tab.title.replace(/'/g, "''")}'!A1:ZZ`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}` +
      '?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER';
    const sheetRes = await fetch(url, gauth);
    if (!sheetRes.ok) {
      return json({ error: `Google Sheets ${sheetRes.status}${sharedHint}: ${await sheetRes.text()}` }, 500);
    }
    const rows: unknown[][] = (await sheetRes.json()).values ?? [];
    if (rows.length < 2) return json({ success: true, imported: 0, skipped: 0, unmatched: [], fuzzy: [], rows: 0 });

    const cols = mapHeaders(rows[0]);
    if (cols.name === undefined && cols.email === undefined) {
      return json({ error: 'No encuentro la columna "Nome e cognome / Full name" en el Sheet.' }, 400);
    }

    // 2. Jugadores de la temporada (con service role: ignora RLS)
    const { seasonId } = await req.json().catch(() => ({}));
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let q = admin.from('players').select('id, first_name, last_name, football_name, email');
    if (seasonId) q = q.eq('season_id', seasonId);
    const { data: players, error: pErr } = await q;
    if (pErr) throw pErr;
    const roster = (players ?? []) as PlayerRow[];
    const byEmail = new Map<string, PlayerRow>();
    for (const p of roster) if (p.email) byEmail.set(norm(p.email), p);

    // 3. Construir items
    const items: Record<string, unknown>[] = [];
    const unmatched = new Map<string, { name: string; email: string; suggestion: string | null; responses: number }>();
    const fuzzy = new Map<string, { written: string; player: string; score: number }>();
    const get = (row: unknown[], f: Field) => (cols[f] === undefined ? undefined : row[cols[f]!]);

    rows.slice(1).forEach((row, i) => {
      const email = norm(get(row, 'email'));
      const writtenName = text(get(row, 'name'));
      if (!email && !writtenName) return;

      let player = email ? byEmail.get(email) ?? null : null;
      if (!player && writtenName) {
        const m = bestPlayer(writtenName, roster);
        player = m.player;
        if (player && m.score < 1) {
          fuzzy.set(norm(writtenName), { written: writtenName, player: displayName(player), score: Math.round(m.score * 100) });
        }
        if (!player) {
          const k = norm(writtenName) || email;
          const prev = unmatched.get(k);
          unmatched.set(k, {
            name: writtenName,
            email,
            suggestion: m.suggestion ? displayName(m.suggestion) : null,
            responses: (prev?.responses ?? 0) + 1,
          });
          return;
        }
      }
      if (!player) return;
      const playerId = player.id;

      // Clave estable de la respuesta: marca temporal del Form (o nº de fila si no hay)
      const ts = text(get(row, 'timestamp')) || `row${i + 2}`;
      const base = `gf:${playerId}:${ts}`;
      const common = { player_id: playerId, created_by: null, created_by_player: true, source: 'google_form' };

      for (const s of SIMPLE_ITEMS) {
        const answer = text(get(row, s.field));
        if (!answer) continue;
        items.push({
          ...common,
          section: s.section,
          category: s.category,
          ...titleAndDescription(answer, s.label),
          source_key: `${base}:${s.field}`,
        });
      }

      // Análisis de partido: un único item con todo
      const matchName = text(get(row, 'match_name'));
      const good = text(get(row, 'match_good'));
      const better = text(get(row, 'match_better'));
      const plays = text(get(row, 'match_plays'));
      if (matchName || good || better || plays) {
        const parts = [
          good && `✅ Fatto bene / Did well:\n${good}`,
          better && `🔁 Da migliorare / Do better:\n${better}`,
          plays && `🎬 Azioni chiave / Key plays:\n${plays}`,
        ].filter(Boolean);
        items.push({
          ...common,
          section: 'competition_analysis',
          category: 'partido_jugadas',
          title: matchName || 'Analisi partita / Match analysis',
          description: parts.join('\n\n') || null,
          match_name: matchName || null,
          match_date: serialToDate(get(row, 'match_date')),
          source_key: `${base}:match`,
        });
      }

      // Plan de acción: una tarea por línea
      const tasks = text(get(row, 'tasks'));
      if (tasks) {
        const deadline = serialToDate(get(row, 'tasks_deadline'));
        tasks.split('\n')
          .map((l) => l.replace(/^\s*([-•*·]|\d+[.)])\s*/, '').trim())
          .filter(Boolean)
          .forEach((task, n) => {
            items.push({
              ...common,
              section: 'action_plan',
              category: 'tareas',
              title: task.length > 200 ? task.slice(0, 199) + '…' : task,
              description: task.length > 200 ? task : null,
              deadline,
              status: 'pending',
              source_key: `${base}:task:${n}`,
            });
          });
      }
    });

    // 4. Insertar solo lo nuevo (ignoreDuplicates: no pisa ediciones del staff)
    let imported = 0;
    for (let i = 0; i < items.length; i += 500) {
      const chunk = items.slice(i, i + 500);
      const { data, error } = await admin
        .from('player_development_items')
        .upsert(chunk, { onConflict: 'source_key', ignoreDuplicates: true })
        .select('id');
      if (error) throw error;
      imported += data?.length ?? 0;
    }

    return json({
      success: true,
      rows: rows.length - 1,
      imported,
      skipped: items.length - imported,
      unmatched: [...unmatched.values()],
      fuzzy: [...fuzzy.values()],
    });
  } catch (error) {
    console.error('sync-google-sheet:', error);
    return json({ error: error instanceof Error ? error.message : 'Error desconocido' }, 500);
  }
});
