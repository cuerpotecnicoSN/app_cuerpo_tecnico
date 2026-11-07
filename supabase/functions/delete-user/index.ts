// Edge Function: elimina un usuario de Auth y su perfil/vinculaciones.
// Solo la puede llamar un administrador. Usa la service key.
//
// Deploy: npx supabase functions deploy delete-user
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1. Verificar llamador (debe ser admin)
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return json({ error: 'No autenticado' }, 401);
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return json({ error: 'No autenticado' }, 401);
  const { data: callerProfile } = await admin.from('profiles').select('role, email').eq('id', caller.user.id).single();
  const isAdmin = callerProfile && (['Admin', 'Administrador'].includes(callerProfile.role) || callerProfile.email === 'cuerpotecnico.sn@gmail.com');
  if (!isAdmin) return json({ error: 'Solo un administrador puede eliminar usuarios' }, 403);

  // 2. Parámetros: user_id y/o player_id
  let body: { user_id?: string; player_id?: string };
  try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }

  let targetUserId = body.user_id;

  if (!targetUserId && body.player_id) {
    const { data: player } = await admin.from('players').select('user_id').eq('id', body.player_id).single();
    targetUserId = player?.user_id;
  }

  // 3. Si hay usuario de Auth asociado
  if (targetUserId) {
    // Si intenta borrarse a sí mismo, bloquearlo
    if (targetUserId === caller.user.id) {
      return json({ error: 'No puedes borrar tu propia cuenta de administrador' }, 400);
    }

    // Desvincular de players si procede
    await admin.from('players').update({ user_id: null, email: null, invited_at: null }).eq('user_id', targetUserId);

    // Borrar de auth.users (borrará en cascada o podemos borrar su profile)
    const { error: delAuthErr } = await admin.auth.admin.deleteUser(targetUserId);
    if (delAuthErr) {
      console.warn('Error al borrar auth.user:', delAuthErr);
    }

    // Asegurar borrado de profile
    await admin.from('profiles').delete().eq('id', targetUserId);
  }

  // Si también se pasó player_id, limpiar sus campos de acceso
  if (body.player_id) {
    await admin.from('players').update({ user_id: null, email: null, invited_at: null }).eq('id', body.player_id);
  }

  return json({ ok: true, deleted_user_id: targetUserId ?? null });
});

