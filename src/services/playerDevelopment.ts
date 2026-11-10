import { supabase } from '../lib/supabase';
import type { ClipComment, PlanLink, PlayerClip } from '../components/types';

export type FocusContext = 'partido' | 'entreno' | 'fuera';
export type ObjectiveDimension = 'futbolistico' | 'fisico' | 'personal';

export interface PlayerFocus {
  id: string;
  player_id: string;
  context: FocusContext;
  title: string;
  description?: string | null;
  active: boolean;
  created_at?: string;
}

export interface VideoNote {
  id: string;
  player_id: string;
  session_date: string;
  title: string;
  video_url?: string | null;
  staff_notes?: string | null;
  player_notes?: string | null;
  created_at?: string;
}

export interface SelfAssessment {
  id: string;
  player_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

export interface PlayerAccessRow {
  player_id: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

const unwrap = <T,>({ data, error }: { data: T | null; error: unknown }): T => {
  if (error) throw error;
  return data as T;
};

// ---- Focos ----
export const getFocuses = async (playerId: string) =>
  unwrap<PlayerFocus[]>(await supabase.from('player_focuses').select('*').eq('player_id', playerId).order('created_at'));
export const createFocus = async (f: Omit<PlayerFocus, 'id' | 'created_at' | 'active'>) =>
  unwrap(await supabase.from('player_focuses').insert([f]));
export const updateFocus = async (id: string, u: Partial<PlayerFocus>) =>
  unwrap(await supabase.from('player_focuses').update(u).eq('id', id));
export const deleteFocus = async (id: string) =>
  unwrap(await supabase.from('player_focuses').delete().eq('id', id));

// ---- Video-sesiones ----
export const getVideoNotes = async (playerId: string) =>
  unwrap<VideoNote[]>(await supabase.from('video_notes').select('*').eq('player_id', playerId).order('session_date', { ascending: false }));
export const createVideoNote = async (n: Omit<VideoNote, 'id' | 'created_at' | 'player_notes'>) =>
  unwrap(await supabase.from('video_notes').insert([n]));
export const deleteVideoNote = async (id: string) =>
  unwrap(await supabase.from('video_notes').delete().eq('id', id));
/** El jugador solo puede escribir su respuesta (RPC que valida que la nota es suya) */
export const setVideoPlayerNotes = async (noteId: string, notes: string) =>
  unwrap(await supabase.rpc('set_video_player_notes', { note_id: noteId, notes }));

// ---- Autoevaluaciones ----
export const getSelfAssessments = async (playerId: string) =>
  unwrap<SelfAssessment[]>(await supabase.from('player_self_assessments').select('*').eq('player_id', playerId).order('created_at', { ascending: false }));
export const createSelfAssessment = async (playerId: string, content: string) =>
  unwrap(await supabase.from('player_self_assessments').insert([{ player_id: playerId, content }]));
export const updateSelfAssessment = async (id: string, content: string) =>
  unwrap(await supabase.from('player_self_assessments').update({ content, updated_at: new Date().toISOString() }).eq('id', id));
export const deleteSelfAssessment = async (id: string) =>
  unwrap(await supabase.from('player_self_assessments').delete().eq('id', id));

// ---- Mis vídeos (cortes de partidos / entrenos) ----
export const getClips = async (playerId: string) =>
  unwrap<PlayerClip[]>(await supabase.from('player_clips').select('*, author:profiles(full_name, role)').eq('player_id', playerId)
    .order('clip_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }));
export const createClip = async (c: Pick<PlayerClip, 'player_id' | 'context' | 'title' | 'url' | 'clip_date' | 'notes'>) =>
  unwrap(await supabase.from('player_clips').insert([c]));
export const updateClip = async (id: string, u: Partial<Pick<PlayerClip, 'context' | 'title' | 'url' | 'clip_date' | 'notes'>>) =>
  unwrap(await supabase.from('player_clips').update(u).eq('id', id));
export const deleteClip = async (id: string) =>
  unwrap(await supabase.from('player_clips').delete().eq('id', id));

export const getClipComments = async (clipIds: string[]) =>
  clipIds.length
    ? unwrap<ClipComment[]>(await supabase.from('clip_comments').select('*, author:profiles(full_name, role)').in('clip_id', clipIds).order('created_at'))
    : [];
export const createClipComment = async (clipId: string, content: string, links: PlanLink[]) =>
  unwrap(await supabase.from('clip_comments').insert([{ clip_id: clipId, content, links }]));
export const deleteClipComment = async (id: string) =>
  unwrap(await supabase.from('clip_comments').delete().eq('id', id));

// ---- Accesos de jugadores (admin) ----
export const getPlayerAccessStatus = async () =>
  unwrap<PlayerAccessRow[]>(await supabase.rpc('player_access_status'));

export const savePlayerEmail = async (playerId: string, email: string | null) =>
  unwrap(await supabase.from('players').update({ email: email?.trim().toLowerCase() || null }).eq('id', playerId));

async function extractErrorMessage(error: any): Promise<string> {
  try {
    if (error?.context && typeof error.context.json === 'function') {
      const detail = await error.context.json().catch(() => null);
      if (detail?.error) return detail.error;
    }
    if (error?.message) return error.message;
  } catch {
    // fallback
  }
  return error?.message ?? 'Error inesperado';
}

export async function invitePlayer(playerId: string, email: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('invite-player', {
    body: { player_id: playerId, email },
  });
  if (error) {
    throw new Error(await extractErrorMessage(error));
  }
  if (data?.error) throw new Error(data.error);
}

export async function deleteUserAccount(params: { userId?: string; playerId?: string; email?: string }): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: { user_id: params.userId, player_id: params.playerId, email: params.email },
  });
  if (error) {
    throw new Error(await extractErrorMessage(error));
  }
  if (data?.error) throw new Error(data.error);
}

export interface StaffAccessRow {
  user_id: string;
  email: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

export const getStaffAccessStatus = async () =>
  unwrap<StaffAccessRow[]>(await supabase.rpc('staff_access_status'));

export const saveStaffEmail = async (userId: string, email: string | null) => {
  const cleanEmail = email?.trim().toLowerCase() || null;
  const { error } = await supabase.from('profiles').update({ email: cleanEmail }).eq('id', userId);
  if (error) throw error;
};

export async function inviteStaffMember(params: { userId?: string; email: string; full_name?: string; role?: string }): Promise<void> {
  const email = params.email.trim().toLowerCase();
  const role = params.role || 'Entrenador';
  const fullName = params.full_name?.trim() || 'Entrenador';

  // 1. Intentar llamar a invite-staff
  let res = await supabase.functions.invoke('invite-staff', {
    body: { user_id: params.userId, email, full_name: fullName, role },
  });

  // 2. Si invite-staff devuelve error o 404, probar con invite-player
  if (res.error) {
    res = await supabase.functions.invoke('invite-player', {
      body: { email, full_name: fullName, role, is_staff: true },
    });
  }

  // 3. Si la versión de invite-player en la nube es la original y requiere player_id:
  if (res.error || res.data?.error) {
    const errText = res.data?.error || (await extractErrorMessage(res.error));
    if (errText.includes('player_id')) {
      // Usar un registro de vínculo en players con categoría cuerpo técnico para invitar
      let coachPlayerId: string | null = null;
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .or(`email.eq.${email},user_id.eq.${params.userId || '00000000-0000-0000-0000-000000000000'}`)
        .limit(1)
        .maybeSingle();

      if (existingPlayer?.id) {
        coachPlayerId = existingPlayer.id;
      } else {
        // Crear jugador de vínculo para el staff
        const { ensureContext } = await import('../lib/dataService');
        const seasonId = await ensureContext();
        const parts = fullName.split(' ');
        const firstName = parts[0] || 'Entrenador';
        const lastName = parts.slice(1).join(' ') || '';

        const { data: created, error: crErr } = await supabase
          .from('players')
          .insert({
            season_id: seasonId,
            first_name: firstName,
            last_name: lastName,
            email: email,
            main_position: role,
            category: 'Cuerpo Técnico',
          })
          .select('id')
          .single();

        if (!crErr && created?.id) {
          coachPlayerId = created.id;
        }
      }

      if (coachPlayerId) {
        // Reintentar con el player_id vinculado
        const retryRes = await supabase.functions.invoke('invite-player', {
          body: { player_id: coachPlayerId, email },
        });
        if (retryRes.error) {
          throw new Error(await extractErrorMessage(retryRes.error));
        }
        if (retryRes.data?.error) {
          throw new Error(retryRes.data.error);
        }
        res = retryRes;
      } else {
        throw new Error(errText);
      }
    } else {
      throw new Error(errText);
    }
  }

  // Asegurar que el perfil de usuario quede con el rol y email de Entrenador / Staff elegido
  const uid = res.data?.user_id || params.userId;
  if (uid) {
    await supabase.from('profiles').upsert({
      id: uid,
      email: email,
      full_name: fullName,
      role: role,
    });
  }
}
