-- =====================================================================
-- SINCRONIZACIÓN GOOGLE FORMS -> player_development_items
-- =====================================================================
-- Las respuestas del Google Form (vinculado a un Google Sheet) se importan
-- con la edge function `sync-google-sheet`. El jugador se identifica por el
-- email VERIFICADO que recoge el Form, cruzado con players.email.
--
--   source     : 'app' (creado en la app) | 'google_form' (importado)
--   source_key : id estable de la respuesta+pregunta (evita duplicados al
--                sincronizar varias veces)
-- =====================================================================

ALTER TABLE public.player_development_items
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS source_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS player_dev_items_source_key_key
  ON public.player_development_items (source_key);
