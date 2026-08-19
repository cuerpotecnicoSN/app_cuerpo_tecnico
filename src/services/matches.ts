import { supabase } from '../lib/supabase';
import { ensureContext } from '../lib/dataService';
import type { MatchDB, MatchFocus, MatchDataPoint } from '../components/types';

export const getMatches = async (): Promise<MatchDB[]> => {
  const seasonId = await ensureContext();
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('season_id', seasonId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getMatch = async (id: string): Promise<MatchDB | null> => {
  const { data, error } = await supabase.from('matches').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const createMatch = async (match: Omit<MatchDB, 'id' | 'created_at' | 'season_id'>): Promise<MatchDB> => {
  const seasonId = await ensureContext();
  const { data, error } = await supabase.from('matches').insert([{ ...match, season_id: seasonId }]).select().single();
  if (error) throw error;
  return data;
};

export const updateMatch = async (id: string, updates: Partial<MatchDB>): Promise<void> => {
  const { error } = await supabase.from('matches').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteMatch = async (id: string): Promise<void> => {
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) throw error;
};

export const getMatchFocuses = async (matchId: string): Promise<MatchFocus[]> => {
  const { data, error } = await supabase.from('match_focuses').select('*').eq('match_id', matchId).order('order', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const getAllMatchFocuses = async (): Promise<MatchFocus[]> => {
  const { data, error } = await supabase.from('match_focuses').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createMatchFocus = async (focus: Omit<MatchFocus, 'id' | 'created_at'>): Promise<void> => {
  const { error } = await supabase.from('match_focuses').insert([focus]);
  if (error) throw error;
};

export const updateMatchFocus = async (id: string, updates: Partial<MatchFocus>): Promise<void> => {
  const { error } = await supabase.from('match_focuses').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteMatchFocus = async (id: string): Promise<void> => {
  const { error } = await supabase.from('match_focuses').delete().eq('id', id);
  if (error) throw error;
};

export const getMatchDataPoints = async (matchId: string): Promise<MatchDataPoint[]> => {
  const { data, error } = await supabase.from('match_data_points').select('*').eq('match_id', matchId).order('minute', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const createMatchDataPoint = async (point: Omit<MatchDataPoint, 'id' | 'created_at'>): Promise<void> => {
  const { error } = await supabase.from('match_data_points').insert([point]);
  if (error) throw error;
};

export const deleteMatchDataPoint = async (id: string): Promise<void> => {
  const { error } = await supabase.from('match_data_points').delete().eq('id', id);
  if (error) throw error;
};
