// Edge Function: sube los adjuntos de las reuniones a Google Drive (carpeta del club)
// con una Service Account. Solo staff.
//
// Secrets (Supabase > Edge Functions > Secrets):
//   GOOGLE_SERVICE_ACCOUNT_JSON  -> contenido completo del .json de la Service Account
//   GOOGLE_DRIVE_FOLDER_ID       -> id de la carpeta destino
// La carpeta debe estar compartida (Editor) con el client_email de la Service Account.
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
    JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/drive', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }),
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // Autenticación de usuario de Supabase
    const auth = req.headers.get('Authorization') ?? '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'No autorizado' }, 401);

    let rawSa = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') || '{}';
    if (rawSa.startsWith('"') && rawSa.endsWith('"')) {
      try { rawSa = JSON.parse(rawSa); } catch (_) { /* ignore */ }
    }
    const sa = typeof rawSa === 'string' ? JSON.parse(rawSa) : rawSa;
    const folderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID');
    if (!sa.client_email || !sa.private_key || !folderId) {
      return json({ error: 'Faltan GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_DRIVE_FOLDER_ID en los secrets' }, 500);
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) return json({ error: 'No se envió ningún archivo' }, 400);
    const name = form.get('name')?.toString() || file.name || 'documento';
    const mimeType = file.type || 'application/octet-stream';

    const token = await googleToken(sa.client_email, sa.private_key);

    // Subida reanudable: sirve para cualquier tamaño
    const init = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mimeType },
        body: JSON.stringify({ name, parents: [folderId] }),
      },
    );
    if (!init.ok) return json({ error: `Drive (inicio) ${init.status}: ${await init.text()}` }, 500);
    const location = init.headers.get('Location')!;

    const put = await fetch(location, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: await file.arrayBuffer() });
    if (!put.ok) return json({ error: `Drive (subida) ${put.status}: ${await put.text()}` }, 500);
    const uploaded = await put.json();

    return json({ success: true, id: uploaded.id, name: uploaded.name, url: uploaded.webViewLink });
  } catch (error) {
    console.error('upload-meeting-doc:', error);
    return json({ error: error instanceof Error ? error.message : 'Error desconocido' }, 500);
  }
});
