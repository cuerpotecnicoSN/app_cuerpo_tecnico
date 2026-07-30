import { supabase } from '../lib/supabase';
import { ensureContext } from '../lib/dataService';
import type { PlayerObjective, SeasonReport } from '../components/types';

export const getPlayerObjectives = async (playerId: string): Promise<PlayerObjective[]> => {
  const { data, error } = await supabase
    .from('player_objectives')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createPlayerObjective = async (objective: Omit<PlayerObjective, 'id' | 'created_at' | 'season_id'>): Promise<void> => {
  const seasonId = await ensureContext();
  const { error } = await supabase.from('player_objectives').insert([{ ...objective, season_id: seasonId }]);
  if (error) throw error;
};

export const updatePlayerObjective = async (id: string, updates: Partial<PlayerObjective>): Promise<void> => {
  const { error } = await supabase.from('player_objectives').update(updates).eq('id', id);
  if (error) throw error;
};

export const deletePlayerObjective = async (id: string): Promise<void> => {
  const { error } = await supabase.from('player_objectives').delete().eq('id', id);
  if (error) throw error;
};

export const getSeasonReports = async (playerId: string): Promise<SeasonReport[]> => {
  const { data, error } = await supabase
    .from('season_reports')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createSeasonReport = async (report: Omit<SeasonReport, 'id' | 'created_at' | 'season_id'>): Promise<void> => {
  const seasonId = await ensureContext();
  const { error } = await supabase.from('season_reports').insert([{ ...report, season_id: seasonId }]);
  if (error) throw error;
};

export const deleteSeasonReport = async (id: string): Promise<void> => {
  const { error } = await supabase.from('season_reports').delete().eq('id', id);
  if (error) throw error;
};
