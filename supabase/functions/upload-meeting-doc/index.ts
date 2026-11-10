// Edge Function: Subir documentos adjuntos de reuniones a Supabase Storage Cloud
// Almacenamiento cloud directo, seguro y sin límite de quota de Google.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const BUCKET_NAME = 'meeting-documents';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Asegurar que el bucket exista y sea público
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = (buckets || []).some((b) => b.name === BUCKET_NAME);
    if (!exists) {
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const customName = formData.get('name')?.toString();
    const playerId = formData.get('player_id')?.toString() || 'general';

    if (!file || !(file instanceof File)) {
      return json({ error: 'No se envió ningún archivo' }, 400);
    }

    const originalName = customName || file.name || 'documento';
    const ext = originalName.includes('.') ? originalName.split('.').pop() : 'pdf';
    const cleanBaseName = originalName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const storagePath = `${playerId}/${Date.now()}_${cleanBaseName}`;

    const fileBytes = new Uint8Array(await file.arrayBuffer());

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBytes, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      return json({ error: `Error subiendo archivo: ${uploadError.message}` }, 500);
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path);

    return json({
      success: true,
      name: originalName,
      path: uploadData.path,
      url: publicUrl,
    });
  } catch (error) {
    console.error('Error en upload-meeting-doc:', error);
    return json({ error: error instanceof Error ? error.message : 'Error desconocido' }, 500);
  }
});
