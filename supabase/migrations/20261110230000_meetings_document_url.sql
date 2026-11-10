-- Añadir columnas para documentos adjuntos (Google Drive) en reuniones
ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS document_url TEXT,
ADD COLUMN IF NOT EXISTS document_name TEXT;

