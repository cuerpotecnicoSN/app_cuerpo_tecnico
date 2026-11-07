// Edge Function: invita o re-invita a un jugador o miembro del staff al portal por email.
// Solo la puede llamar un administrador. Usa la service key.
//
// Deploy:  npx supabase functions deploy invite-player
// Secrets: npx supabase secrets set SITE_URL=https://app-cuerpo-tecnico.vercel.app CLUB_NAME="StaffControl"
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://app-cuerpo-tecnico.vercel.app').replace(/\/$/, '');
  const clubName = Deno.env.get('CLUB_NAME') ?? 'StaffControl';
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1. ¿Quién llama? Debe ser admin.
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return json({ error: 'No autenticado' }, 401);
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return json({ error: 'No autenticado' }, 401);
  const { data: callerProfile } = await admin.from('profiles').select('role, email').eq('id', caller.user.id).single();
  const isAdmin = callerProfile && (['Admin', 'Administrador'].includes(callerProfile.role) || callerProfile.email === 'cuerpotecnico.sn@gmail.com');
  if (!isAdmin) return json({ error: 'Solo un administrador puede invitar usuarios' }, 403);

  // 2. Datos
  let body: { player_id?: string; email?: string; full_name?: string; role?: string; is_staff?: boolean };
  try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }

  const playerId = body.player_id;
  const email = body.email?.trim().toLowerCase();
  const isStaff = body.is_staff || !playerId;
  const requestedRole = body.role || (isStaff ? 'Entrenador' : 'Jugador');

  if (!email || !EMAIL_RE.test(email)) return json({ error: 'Debes proporcionar un email válido' }, 400);

  let player: any = null;
  if (playerId) {
    const { data: pData, error: pErr } = await admin
      .from('players').select('id, first_name, last_name, football_name, user_id, email').eq('id', playerId).single();
    if (pErr || !pData) return json({ error: 'Jugador no encontrado' }, 404);
    player = pData;
  }

  // 3. Limpieza de cuentas previas del mismo jugador o del mismo email si no estaban activas
  if (player?.user_id) {
    try {
      await admin.auth.admin.deleteUser(player.user_id);
    } catch (e) {
      console.warn('No se pudo borrar el usuario previo:', e);
    }
    await admin.from('profiles').delete().eq('id', player.user_id);
    await admin.from('players').update({ user_id: null }).eq('id', playerId);
  }

  try {
    const { data: userList } = await admin.auth.admin.listUsers();
    const existingWithSameEmail = userList?.users?.find((u: any) => u.email?.toLowerCase() === email);
    if (existingWithSameEmail) {
      if (existingWithSameEmail.last_sign_in_at && isStaff) {
        await admin.from('profiles').update({ role: requestedRole, full_name: body.full_name || undefined }).eq('id', existingWithSameEmail.id);
        return json({ ok: true, user_id: existingWithSameEmail.id });
      }
      await admin.auth.admin.deleteUser(existingWithSameEmail.id);
      await admin.from('profiles').delete().eq('id', existingWithSameEmail.id);
    }
  } catch (e) {
    console.warn('Error al verificar email existente:', e);
  }

  // 4. Preparar nombre y metadatos
  const fullName = player 
    ? `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim()
    : body.full_name?.trim() || 'Entrenador';

  const firstName = player
    ? (player.football_name || player.first_name || fullName)
    : (body.full_name?.trim()?.split(' ')[0] || fullName);

  // 5. Enviar invitación oficial
  const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/set-password`,
    data: {
      full_name: fullName,
      first_name: firstName,
      club_name: clubName,
      logo_url: `${siteUrl}/escudo.png`,
    },
  });

  if (invErr || !invited?.user) {
    const msg = invErr?.message?.includes('already been registered')
      ? 'Ese email ya pertenece a una cuenta activa'
      : invErr?.message ?? 'No se pudo enviar la invitación';
    return json({ error: msg }, 400);
  }

  // 6. Asignar perfil y rol
  await admin.from('profiles').upsert({ id: invited.user.id, email, full_name: fullName, role: requestedRole });

  // 7. Si es jugador, vincular su id en players
  if (playerId) {
    const { error: linkErr } = await admin
      .from('players')
      .update({ email, user_id: invited.user.id, invited_at: new Date().toISOString() })
      .eq('id', playerId);
    if (linkErr) return json({ error: `Invitación enviada pero no se pudo vincular: ${linkErr.message}` }, 500);
  }

  return json({ ok: true, user_id: invited.user.id });
});
