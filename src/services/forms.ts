import { supabase } from '../lib/supabase';

export type Lang = 'es' | 'en' | 'it';
/** Texto en varios idiomas. Lo que falte se traduce automáticamente al mostrarlo. */
export type LText = Partial<Record<Lang, string>>;

export type QuestionType =
  | 'section'
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'scale'
  | 'number'
  | 'date';

export interface FormOption {
  id: string;
  label: LText;
  description?: LText;
  /** Puntuación numérica opcional, para medias en las estadísticas */
  score?: number;
}

export interface FormQuestion {
  id: string;
  type: QuestionType;
  title: LText;
  description?: LText;
  required?: boolean;
  options?: FormOption[];
  scale?: { min: number; max: number; minLabel?: LText; maxLabel?: LText };
}

export type FormStatus = 'draft' | 'published' | 'closed';

export interface FormDB {
  id: string;
  title: LText;
  description: LText;
  questions: FormQuestion[];
  status: FormStatus;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type AnswerValue = string | string[] | number | null;
export type Answers = Record<string, AnswerValue>;

export interface FormAssignment {
  id: string;
  form_id: string;
  player_id: string;
  assigned_at: string;
}

export interface FormResponse {
  id: string;
  form_id: string;
  player_id: string;
  answers: Answers;
  submitted_at: string;
  updated_at: string;
}

export const CHOICE_TYPES: QuestionType[] = ['single_choice', 'multiple_choice', 'dropdown'];
export const QUESTION_TYPES: QuestionType[] = [
  'short_text', 'long_text', 'single_choice', 'multiple_choice', 'dropdown', 'scale', 'number', 'date', 'section',
];

export const newId = () => crypto.randomUUID().slice(0, 8);

export const isAnswered = (v: AnswerValue | undefined) =>
  v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);

// ---------------------------------------------------------------- staff
export const getForms = async (): Promise<FormDB[]> => {
  const { data, error } = await supabase.from('forms').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getForm = async (id: string): Promise<FormDB> => {
  const { data, error } = await supabase.from('forms').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const saveForm = async (form: Partial<FormDB>): Promise<FormDB> => {
  const payload = { ...form, updated_at: new Date().toISOString() };
  const query = form.id
    ? supabase.from('forms').update(payload).eq('id', form.id)
    : supabase.from('forms').insert([payload]);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
};

export const deleteForm = async (id: string) => {
  const { error } = await supabase.from('forms').delete().eq('id', id);
  if (error) throw error;
};

export const getAllAssignments = async (): Promise<FormAssignment[]> => {
  const { data, error } = await supabase.from('form_assignments').select('*');
  if (error) throw error;
  return data || [];
};

export const getAllResponses = async (formId?: string): Promise<FormResponse[]> => {
  let q = supabase.from('form_responses').select('*');
  if (formId) q = q.eq('form_id', formId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
};

/** Deja asignados exactamente estos jugadores (añade y quita lo necesario). */
export const setAssignments = async (formId: string, playerIds: string[]) => {
  const { data: current, error } = await supabase.from('form_assignments').select('player_id').eq('form_id', formId);
  if (error) throw error;
  const have = new Set((current || []).map((r) => r.player_id as string));
  const want = new Set(playerIds);
  const toAdd = playerIds.filter((id) => !have.has(id)).map((player_id) => ({ form_id: formId, player_id }));
  const toRemove = [...have].filter((id) => !want.has(id));
  if (toAdd.length) {
    const { error: e } = await supabase.from('form_assignments').insert(toAdd);
    if (e) throw e;
  }
  if (toRemove.length) {
    const { error: e } = await supabase.from('form_assignments').delete().eq('form_id', formId).in('player_id', toRemove);
    if (e) throw e;
  }
};

// ---------------------------------------------------------------- jugador
export const getPlayerForms = async (playerId: string) => {
  const { data: assignments, error } = await supabase.from('form_assignments').select('*').eq('player_id', playerId);
  if (error) throw error;
  const ids = (assignments || []).map((a) => a.form_id);
  if (!ids.length) return { forms: [] as FormDB[], responses: [] as FormResponse[], assignments: [] as FormAssignment[] };
  const [{ data: forms, error: e1 }, { data: responses, error: e2 }] = await Promise.all([
    supabase.from('forms').select('*').in('id', ids).neq('status', 'draft'),
    supabase.from('form_responses').select('*').eq('player_id', playerId).in('form_id', ids),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { forms: (forms || []) as FormDB[], responses: (responses || []) as FormResponse[], assignments: assignments as FormAssignment[] };
};

export const deleteResponse = async (formId: string, playerId: string) => {
  const { error } = await supabase.from('form_responses').delete().eq('form_id', formId).eq('player_id', playerId);
  if (error) throw error;
};

export const submitResponse = async (formId: string, playerId: string, answers: Answers) => {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('form_responses')
    .upsert({ form_id: formId, player_id: playerId, answers, updated_at: now }, { onConflict: 'form_id,player_id' });
  if (error) throw error;
};
