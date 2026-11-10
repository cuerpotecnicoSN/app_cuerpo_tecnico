import { supabase } from '../lib/supabase';

export interface UploadMeetingDocResult {
  success: boolean;
  name: string;
  url: string;
}

/**
 * Sube un documento (PDF, Word, imagen, etc.) desde local al almacenamiento en la nube de reuniones.
 * No consume espacio en el servidor de la app ni en el hosting.
 */
export async function uploadMeetingDocument(file: File, playerId?: string): Promise<UploadMeetingDocResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name);
  if (playerId) formData.append('player_id', playerId);

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/functions/v1/upload-meeting-doc`, {
    method: 'POST',
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Error subiendo documento (${res.status})`);
  }

  const result = await res.json();
  return {
    success: true,
    name: result.name || file.name,
    url: result.url,
  };
}

export interface MeetingDocumentAttachment {
  name: string;
  url: string;
}

/** Extrae el documento adjunto guardado en el registro de la reunión */
export function getMeetingAttachment(nextStepsField?: string | null): MeetingDocumentAttachment | null {
  if (!nextStepsField) return null;
  try {
    const parsed = JSON.parse(nextStepsField);
    if (parsed && typeof parsed === 'object' && parsed.url) {
      return {
        name: parsed.name || 'Documento adjunto',
        url: parsed.url,
      };
    }
  } catch (_) {
    // Si era texto plano antiguo de próximos pasos
    if (nextStepsField.startsWith('http://') || nextStepsField.startsWith('https://')) {
      return {
        name: 'Documento adjunto',
        url: nextStepsField,
      };
    }
  }
  return null;
}

