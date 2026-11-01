// Edge Function: invita a un jugador al portal por email.
// Solo la puede llamar un administrador. Usa la service key (nunca expuesta al cliente).
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
  if (!isAdmin) return json({ error: 'Solo un administrador puede invitar jugadores' }, 403);

  // 2. Datos
  let body: { player_id?: string; email?: string };
  try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
  const playerId = body.player_id;
  const email = body.email?.trim().toLowerCase();
  if (!playerId || !email || !EMAIL_RE.test(email)) return json({ error: 'Faltan player_id o un email válido' }, 400);

  const { data: player, error: pErr } = await admin
    .from('players').select('id, first_name, last_name, football_name, user_id').eq('id', playerId).single();
  if (pErr || !player) return json({ error: 'Jugador no encontrado' }, 404);

  // 3. Si ya tenía cuenta: activa -> error; pendiente -> se borra para reenviar invitación limpia
  if (player.user_id) {
    const { data: existing } = await admin.auth.admin.getUserById(player.user_id);
    if (existing?.user?.last_sign_in_at) {
      return json({ error: 'Este jugador ya ha activado su cuenta' }, 409);
    }
    if (existing?.user) await admin.auth.admin.deleteUser(player.user_id);
    await admin.from('players').update({ user_id: null }).eq('id', playerId);
  }

  // 4. Invitación (Supabase envía el email con la plantilla "Invite user")
  const fullName = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim();
  const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/set-password`,
    data: {
      full_name: fullName,
      first_name: player.football_name || player.first_name || fullName,
      club_name: clubName,
      logo_url: `${siteUrl}/escudo.png`,
    },
  });
  if (invErr || !invited?.user) {
    const msg = invErr?.message?.includes('already been registered')
      ? 'Ese email ya pertenece a otra cuenta'
      : invErr?.message ?? 'No se pudo enviar la invitación';
    return json({ error: msg }, 400);
  }

  // 5. Vincular cuenta <-> jugador y fijar rol (el trigger lo crea como 'Pendiente')
  await admin.from('profiles').upsert({ id: invited.user.id, email, full_name: fullName, role: 'Jugador' });
  const { error: linkErr } = await admin
    .from('players')
    .update({ email, user_id: invited.user.id, invited_at: new Date().toISOString() })
    .eq('id', playerId);
  if (linkErr) return json({ error: `Invitación enviada pero no se pudo vincular: ${linkErr.message}` }, 500);

  return json({ ok: true, user_id: invited.user.id });
});
