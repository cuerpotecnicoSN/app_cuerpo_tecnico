// Edge Function: invita a miembros del cuerpo técnico (staff/entrenadores) por email.
// Solo la puede llamar un administrador. Usa la service key.
//
// Deploy:  npx supabase functions deploy invite-staff
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

  // 1. Verificar llamador (debe ser admin)
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return json({ error: 'No autenticado' }, 401);
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return json({ error: 'No autenticado' }, 401);
  const { data: callerProfile } = await admin.from('profiles').select('role, email').eq('id', caller.user.id).single();
  const isAdmin = callerProfile && (['Admin', 'Administrador'].includes(callerProfile.role) || callerProfile.email === 'cuerpotecnico.sn@gmail.com');
  if (!isAdmin) return json({ error: 'Solo un administrador puede invitar miembros del staff' }, 403);

  // 2. Parámetros
  let body: { email?: string; full_name?: string; role?: string };
  try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }

  const email = body.email?.trim().toLowerCase();
  const fullName = body.full_name?.trim() || '';
  const role = body.role?.trim() || 'Entrenador';

  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: 'Debes proporcionar un email válido' }, 400);
  }

  // 3. Si ya existía en auth como usuario huerfano o no confirmado, limpiarlo para reenviar
  try {
    const { data: userList } = await admin.auth.admin.listUsers();
    const existing = userList?.users?.find(u => u.email?.toLowerCase() === email);
    if (existing) {
      if (existing.last_sign_in_at) {
        // Si ya está activo, sólo actualizamos su rol en profile si difiere
        await admin.from('profiles').update({ role, full_name: fullName || undefined }).eq('id', existing.id);
        return json({ ok: true, user_id: existing.id, message: 'El usuario ya estaba activo; se ha actualizado su perfil.' });
      }
      // Si no ha iniciado sesión, eliminamos para que reciba la invitación limpia
      await admin.auth.admin.deleteUser(existing.id);
      await admin.from('profiles').delete().eq('id', existing.id);
    }
  } catch (e) {
    console.warn('Error comprobando usuario existente:', e);
  }

  // 4. Enviar invitación por email
  const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/set-password`,
    data: {
      full_name: fullName || 'Entrenador',
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

  // 5. Crear o actualizar su perfil con el rol correspondiente (Entrenador, Preparador Físico, etc.)
  await admin.from('profiles').upsert({
    id: invited.user.id,
    email,
    full_name: fullName || null,
    role: role || 'Entrenador',
  });

  return json({ ok: true, user_id: invited.user.id });
});

