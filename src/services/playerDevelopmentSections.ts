import { supabase } from '../lib/supabase';
import type { PlanLink } from '../components/types';

export type DevSectionType = 'objectives' | 'personal_traits' | 'focuses' | 'competition_analysis' | 'action_plan';

export interface DevItemComment {
  id: string;
  item_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: {
    full_name: string | null;
    role: string | null;
  };
}

export interface DevItem {
  id: string;
  player_id: string;
  section: DevSectionType;
  category: string;
  title: string;
  description?: string | null;
  match_name?: string | null;
  match_date?: string | null;
  deadline?: string | null;
  status?: string | null;
  links?: PlanLink[];
  created_by?: string | null;
  created_by_player: boolean;
  created_at: string;
  updated_at?: string;
  author?: {
    full_name: string | null;
    role: string | null;
  };
  comments?: DevItemComment[];
}

export const getDevItems = async (playerId: string): Promise<DevItem[]> => {
  const { data, error } = await supabase
    .from('player_development_items')
    .select('*, author:profiles!created_by(full_name, role)')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as DevItem[];
};

export const getDevItemComments = async (itemIds: string[]): Promise<DevItemComment[]> => {
  if (!itemIds.length) return [];
  const { data, error } = await supabase
    .from('player_development_comments')
    .select('*, author:profiles!author_id(full_name, role)')
    .in('item_id', itemIds)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as DevItemComment[];
};

export const createDevItem = async (
  item: Omit<DevItem, 'id' | 'created_at' | 'updated_at' | 'author' | 'comments'>
): Promise<DevItem> => {
  const { data, error } = await supabase
    .from('player_development_items')
    .insert([item])
    .select('*, author:profiles!created_by(full_name, role)')
    .single();

  if (error) throw error;
  return data as DevItem;
};

export const updateDevItem = async (id: string, updates: Partial<DevItem>): Promise<void> => {
  const { error } = await supabase
    .from('player_development_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

export const deleteDevItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('player_development_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const createDevItemComment = async (
  itemId: string,
  content: string
): Promise<DevItemComment> => {
  const { data, error } = await supabase
    .from('player_development_comments')
    .insert([{ item_id: itemId, content }])
    .select('*, author:profiles!author_id(full_name, role)')
    .single();

  if (error) throw error;
  return data as DevItemComment;
};

export const updateDevItemComment = async (commentId: string, content: string): Promise<void> => {
  const { error } = await supabase
    .from('player_development_comments')
    .update({ content })
    .eq('id', commentId);

  if (error) throw error;
};

export const deleteDevItemComment = async (commentId: string): Promise<void> => {
  const { error } = await supabase
    .from('player_development_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
};

