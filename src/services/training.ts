import { supabase } from '../lib/supabase';
import { ensureContext } from '../lib/dataService';
import type { TrainingSessionDB, TaskLibraryItem, SessionTask } from '../components/types';

export const getTrainingSessions = async (): Promise<TrainingSessionDB[]> => {
  const seasonId = await ensureContext();
  const { data, error } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('season_id', seasonId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getTrainingSession = async (id: string): Promise<TrainingSessionDB | null> => {
  const { data, error } = await supabase.from('training_sessions').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const createTrainingSession = async (session: Omit<TrainingSessionDB, 'id' | 'created_at' | 'season_id'>): Promise<TrainingSessionDB> => {
  const seasonId = await ensureContext();
  const { data, error } = await supabase.from('training_sessions').insert([{ ...session, season_id: seasonId }]).select().single();
  if (error) throw error;
  return data;
};

export const updateTrainingSession = async (id: string, updates: Partial<TrainingSessionDB>): Promise<void> => {
  const { error } = await supabase.from('training_sessions').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteTrainingSession = async (id: string): Promise<void> => {
  const { error } = await supabase.from('training_sessions').delete().eq('id', id);
  if (error) throw error;
};

export const getTasks = async (): Promise<TaskLibraryItem[]> => {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createTask = async (task: Omit<TaskLibraryItem, 'id' | 'created_at'>): Promise<TaskLibraryItem> => {
  const { data, error } = await supabase.from('tasks').insert([task]).select().single();
  if (error) throw error;
  return data;
};

export const updateTask = async (id: string, updates: Partial<TaskLibraryItem>): Promise<void> => {
  const { error } = await supabase.from('tasks').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteTask = async (id: string): Promise<void> => {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
};

export const getSessionTasks = async (sessionId: string): Promise<SessionTask[]> => {
  const { data, error } = await supabase.from('session_tasks').select('*').eq('session_id', sessionId).order('order', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const addSessionTask = async (sessionTask: Omit<SessionTask, 'id' | 'created_at'>): Promise<void> => {
  const { error } = await supabase.from('session_tasks').insert([sessionTask]);
  if (error) throw error;
};

export const removeSessionTask = async (id: string): Promise<void> => {
  const { error } = await supabase.from('session_tasks').delete().eq('id', id);
  if (error) throw error;
};
