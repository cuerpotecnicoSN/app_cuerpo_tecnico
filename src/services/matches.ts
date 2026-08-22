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

// Las columnas del cronómetro y focus_id llegan con la migración 20260822100000_live_match_data.
// Si aún no está aplicada, la app sigue funcionando sin persistirlas.
const TIMER_COLUMNS = ['timer_start_time', 'timer_accumulated_seconds', 'timer_is_running'] as const;

let timerColumnsSupported = true;
let focusIdSupported = true;

export const isTimerPersistenceAvailable = () => timerColumnsSupported;
export const isFocusIdAvailable = () => focusIdSupported;

// PostgREST devuelve 42703 (columna inexistente en SQL) o PGRST204 (no está en el schema cache)
const isMissingColumn = (error: any, column: string) => {
  const code = error?.code;
  const message = String(error?.message || '');
  if (message.includes(column)) return true;
  return code === '42703' || code === 'PGRST204';
};

export const updateMatch = async (id: string, updates: Partial<MatchDB>): Promise<void> => {
  const payload: Record<string, any> = { ...updates };
  if (!timerColumnsSupported) TIMER_COLUMNS.forEach(c => delete payload[c]);
  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase.from('matches').update(payload).eq('id', id);
  if (!error) return;

  const touchesTimer = TIMER_COLUMNS.some(c => c in payload);
  if (touchesTimer && TIMER_COLUMNS.some(c => isMissingColumn(error, c))) {
    timerColumnsSupported = false;
    const rest = { ...payload };
    TIMER_COLUMNS.forEach(c => delete rest[c]);
    if (Object.keys(rest).length === 0) return;
    const retry = await supabase.from('matches').update(rest).eq('id', id);
    if (retry.error) throw retry.error;
    return;
  }
  throw error;
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

export const createMatchDataPoint = async (point: Omit<MatchDataPoint, 'id' | 'created_at'>): Promise<MatchDataPoint> => {
  if (focusIdSupported) {
    const { data, error } = await supabase.from('match_data_points').insert([point]).select().single();
    if (!error) return data;
    if (!isMissingColumn(error, 'focus_id')) throw error;
    focusIdSupported = false;
  }
  // Sin la columna focus_id el evento se vincula al foco por su título (campo type)
  const { focus_id: _ignored, ...rest } = point;
  const { data, error } = await supabase.from('match_data_points').insert([rest]).select().single();
  if (error) throw error;
  return data;
};

export const deleteMatchDataPoint = async (id: string): Promise<void> => {
  const { error } = await supabase.from('match_data_points').delete().eq('id', id);
  if (error) throw error;
};

export const deleteAllMatchDataPoints = async (matchId: string): Promise<void> => {
  const { error } = await supabase.from('match_data_points').delete().eq('match_id', matchId);
  if (error) throw error;
};

export const updateMatchDataPoint = async (id: string, updates: Partial<MatchDataPoint>): Promise<void> => {
  const { error } = await supabase.from('match_data_points').update(updates).eq('id', id);
  if (error) throw error;
};

export const getAllMatchDataPoints = async (): Promise<MatchDataPoint[]> => {
  const { data, error } = await supabase.from('match_data_points').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};
