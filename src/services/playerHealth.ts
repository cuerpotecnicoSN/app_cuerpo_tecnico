import { supabase } from '../lib/supabase';
import type { PlayerWeight, PlayerInjury } from '../components/types';

export const getPlayerWeights = async (playerId: string): Promise<PlayerWeight[]> => {
  const { data, error } = await supabase
    .from('player_weights')
    .select('*')
    .eq('player_id', playerId)
    .order('date', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const createPlayerWeight = async (weight: Omit<PlayerWeight, 'id' | 'created_at'>): Promise<void> => {
  const { error } = await supabase.from('player_weights').insert([weight]);
  if (error) throw error;
};

export const getPlayerInjuries = async (playerId: string): Promise<PlayerInjury[]> => {
  const { data, error } = await supabase
    .from('player_injuries')
    .select('*')
    .eq('player_id', playerId)
    .order('injury_date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createPlayerInjury = async (injury: Omit<PlayerInjury, 'id' | 'created_at'>): Promise<void> => {
  const { error } = await supabase.from('player_injuries').insert([injury]);
  if (error) throw error;
};

export const updatePlayerInjury = async (id: string, updates: Partial<PlayerInjury>): Promise<void> => {
  const { error } = await supabase.from('player_injuries').update(updates).eq('id', id);
  if (error) throw error;
};

export const deletePlayerInjury = async (id: string): Promise<void> => {
  const { error } = await supabase.from('player_injuries').delete().eq('id', id);
  if (error) throw error;
};

export const deletePlayerWeight = async (id: string): Promise<void> => {
  const { error } = await supabase.from('player_weights').delete().eq('id', id);
  if (error) throw error;
};
