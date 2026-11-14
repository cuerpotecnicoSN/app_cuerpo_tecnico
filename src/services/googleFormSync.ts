import { supabase } from '../lib/supabase';
import { ensureContext } from '../lib/dataService';

export interface GoogleFormSyncResult {
  rows: number;
  imported: number;
  skipped: number;
  /** Filas no asignadas (nombre poco parecido o ambiguo) */
  unmatched: { name: string; email: string; suggestion: string | null; responses: number }[];
  /** Asignadas por parecido (no idénticas): para revisar */
  fuzzy: { written: string; player: string; score: number }[];
}

/** Importa las respuestas del Google Form (Sheet vinculado) a los planes individuales. Solo staff. */
export async function syncGoogleForm(): Promise<GoogleFormSyncResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('No autorizado');
  const seasonId = await ensureContext();

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-google-sheet`, {
    method: 'POST',
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ seasonId }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
  return body as GoogleFormSyncResult;
}
