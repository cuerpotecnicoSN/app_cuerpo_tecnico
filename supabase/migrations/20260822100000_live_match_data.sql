-- Añadir campos para cronómetro persistente en partidos
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS timer_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS timer_accumulated_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS timer_is_running BOOLEAN DEFAULT FALSE;

-- Añadir relación con el foco en los puntos de datos
ALTER TABLE public.match_data_points
ADD COLUMN IF NOT EXISTS focus_id UUID REFERENCES public.match_focuses(id) ON DELETE CASCADE;

-- Refrescar el schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
