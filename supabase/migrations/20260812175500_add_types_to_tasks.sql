-- Agregar columna 'types' a la tabla 'tasks' para soportar múltiples tipos por tarea
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS types TEXT[] DEFAULT '{}'::text[];
