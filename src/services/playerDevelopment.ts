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

export async function deleteUserAccount(params: { userId?: string; playerId?: string }): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: { user_id: params.userId, player_id: params.playerId },
  });
  if (error) {
    throw new Error(await extractErrorMessage(error));
  }
  if (data?.error) throw new Error(data.error);
}

export async function inviteStaffMember(params: { email: string; full_name?: string; role?: string }): Promise<void> {
  const email = params.email.trim().toLowerCase();
  const role = params.role || 'Entrenador';
  const fullName = params.full_name?.trim() || 'Entrenador';

  // Llamar a la Edge Function invite-player directamente como staff, sin crear fila en la tabla de jugadores
  const res = await supabase.functions.invoke('invite-player', {
    body: { email, full_name: fullName, role, is_staff: true },
  });

  if (res.error) {
    throw new Error(await extractErrorMessage(res.error));
  }
  if (res.data?.error) {
    throw new Error(res.data.error);
  }

  // Asegurar que el perfil de usuario quede con el rol de Entrenador / Staff elegido
  if (res.data?.user_id) {
    await supabase.from('profiles').upsert({
      id: res.data.user_id,
      email: email,
      full_name: fullName,
      role: role,
    });
  }
}
