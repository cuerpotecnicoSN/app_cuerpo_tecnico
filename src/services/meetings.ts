import { supabase } from '../lib/supabase';
import { ensureContext } from '../lib/dataService';
import type { MeetingDB, MeetingPlayer } from '../components/types';

export const getMeetings = async (type?: 'individual' | 'grupal'): Promise<MeetingDB[]> => {
  const seasonId = await ensureContext();
  let query = supabase.from('meetings').select('*').eq('season_id', seasonId);
  if (type) query = query.eq('type', type);
  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createMeeting = async (meeting: Omit<MeetingDB, 'id' | 'created_at' | 'season_id'>): Promise<MeetingDB> => {
  const seasonId = await ensureContext();
  const { data, error } = await supabase.from('meetings').insert([{ ...meeting, season_id: seasonId }]).select().single();
  if (error) throw error;
  return data;
};

export const updateMeeting = async (id: string, updates: Partial<MeetingDB>): Promise<void> => {
  const { error } = await supabase.from('meetings').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteMeeting = async (id: string): Promise<void> => {
  const { error } = await supabase.from('meetings').delete().eq('id', id);
  if (error) throw error;
};

export const getMeetingPlayers = async (meetingId: string): Promise<MeetingPlayer[]> => {
  const { data, error } = await supabase.from('meeting_players').select('*').eq('meeting_id', meetingId);
  if (error) throw error;
  return data || [];
};

export const getMeetingsForPlayer = async (playerId: string, type?: 'individual' | 'grupal'): Promise<MeetingDB[]> => {
  const { data: links, error: linkError } = await supabase.from('meeting_players').select('meeting_id').eq('player_id', playerId);
  if (linkError) throw linkError;
  const meetingIds = (links || []).map((l) => l.meeting_id);
  if (meetingIds.length === 0) return [];
  let query = supabase.from('meetings').select('*').in('id', meetingIds);
  if (type) query = query.eq('type', type);
  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addMeetingPlayer = async (meetingId: string, playerId: string): Promise<void> => {
  const { error } = await supabase.from('meeting_players').insert([{ meeting_id: meetingId, player_id: playerId }]);
  if (error) throw error;
};

export const removeMeetingPlayer = async (id: string): Promise<void> => {
  const { error } = await supabase.from('meeting_players').delete().eq('id', id);
  if (error) throw error;
};
