-- =====================================================================
-- Caché compartida de traducciones automáticas del contenido libre
-- (reuniones, observaciones, feedback, objetivos...).
-- Cada línea se traduce UNA sola vez por idioma y se reutiliza para todos.
-- Solo la escribe/lee la Edge Function `translate-content` (service role):
-- RLS activado y sin políticas para clientes.
-- Aplicar a mano en el SQL Editor de Supabase.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.content_translations (
  source_hash TEXT NOT NULL,                 -- sha256 hex del texto original
  target_lang TEXT NOT NULL CHECK (target_lang IN ('es', 'en', 'it')),
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gemini',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source_hash, target_lang)
);

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;
