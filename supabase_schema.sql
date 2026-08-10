-- Script Inicial de Base de Datos para Supabase (StaffControl Pro Edition)
-- ========================================================
-- Este script creará la arquitectura base para soportar la 
-- multi-tenencia (varios clubes y varias temporadas) y todos los módulos PRO.

-- 1. Tabla de Clubes
CREATE TABLE IF NOT EXISTS public.clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Temporadas
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL, -- ej. "2026/2027"
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Jugadores (Expandida para Módulos PRO)
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    football_name TEXT,
    gender TEXT CHECK (gender IN ('masculino', 'femenino')),
    kit_number INTEGER,
    main_position TEXT,
    category TEXT,
    birth_date DATE,
    nationality TEXT,
    height_cm INTEGER,
    weight_kg NUMERIC,
    body_fat NUMERIC,
    dominant_foot TEXT,
    photo_url TEXT,
    
    -- Campos IA / Pro
    history TEXT,
    strengths TEXT[],
    weaknesses TEXT[],
    goals TEXT[],
    status TEXT DEFAULT 'Apto',
    transfermarkt_url TEXT,
    besoccer_url TEXT,
    current_club TEXT,
    market_value TEXT,
    rating NUMERIC,
    public_injuries TEXT,
    career_clubs JSONB DEFAULT '[]'::jsonb, -- Historial de clubes
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.1 Sincronización de columnas PRO en tablas 'players' ya existentes.
-- CREATE TABLE IF NOT EXISTS no añade columnas a una tabla que ya existía
-- con una estructura antigua, así que forzamos el añadido aquí (seguro de re-ejecutar).
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS transfermarkt_url TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS besoccer_url TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS current_club TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS football_name TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS market_value TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS rating NUMERIC;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS public_injuries TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS career_clubs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS history TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS strengths TEXT[];
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS weaknesses TEXT[];
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS goals TEXT[];
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS medical_status TEXT DEFAULT 'Alta';
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS birth_place TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS birth_place_flag TEXT;

-- 4. Tabla de Evaluaciones de Jugadores (Radar Data y Reportes IA)
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    technique INTEGER CHECK (technique BETWEEN 0 AND 10),
    tactics INTEGER CHECK (tactics BETWEEN 0 AND 10),
    physical INTEGER CHECK (physical BETWEEN 0 AND 10),
    mental INTEGER CHECK (mental BETWEEN 0 AND 10),
    social INTEGER CHECK (social BETWEEN 0 AND 10),
    decision_making INTEGER CHECK (decision_making BETWEEN 0 AND 10),
    report TEXT, -- Reporte generado por IA
    metrics JSONB DEFAULT '[]'::jsonb, -- Métricas dinámicas extraídas por IA
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Planes de Desarrollo Individual (PDI)
CREATE TABLE IF NOT EXISTS public.training_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    objective TEXT,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dev_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pendiente', -- Pendiente, En Progreso, Completada
    progress INTEGER DEFAULT 0,
    category TEXT,
    due_date DATE,
    comments JSONB DEFAULT '[]'::jsonb, -- Comentarios anidados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Historial Clínico y Médico
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    injury TEXT,
    injury_type TEXT, -- Muscular, Articular, Ósea, Sobrecarga, Otra
    date_onset DATE,
    expected_recovery TEXT,
    status TEXT DEFAULT 'Apto', -- Apto, Duda, Baja, Recuperado, Fase de readaptación, Activa
    notes TEXT,
    wellness_logs JSONB DEFAULT '[]'::jsonb,
    injury_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Estadísticas Deportivas Consolidadas
CREATE TABLE IF NOT EXISTS public.sports_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    matches INTEGER DEFAULT 0,
    minutes INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    call_ups INTEGER DEFAULT 0,
    custom_metrics JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Registro de Sesiones y Sensaciones (RPE / Carga)
CREATE TABLE IF NOT EXISTS public.workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    type TEXT DEFAULT 'Individual', -- Individual o Colectivo
    duration INTEGER DEFAULT 0,
    workload TEXT DEFAULT 'Media', -- Alta, Media, Baja
    rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Historial de Métricas Físicas (Pesajes)
CREATE TABLE IF NOT EXISTS public.physical_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    weight_kg NUMERIC NOT NULL,
    body_fat NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Hub de Análisis de Vídeo (Multimedia)
CREATE TABLE IF NOT EXISTS public.multimedia_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    type TEXT CHECK (type IN ('video', 'image')),
    title TEXT NOT NULL,
    description TEXT,
    comments JSONB DEFAULT '[]'::jsonb,
    audio_notes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Vídeos de Competición
CREATE TABLE IF NOT EXISTS public.competition_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Chatbots y Registro IA
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    sender TEXT NOT NULL, -- Ej: 'jugador' o 'asistente'
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ========================================================
-- Insertar Datos por Defecto (AC Milan - 26/27)
-- ========================================================
INSERT INTO public.clubs (name, logo_url) 
VALUES ('AC Milan', '/escudo.png') 
RETURNING id;
-- (Ojo: Tendrás que coger el ID del club que acabas de crear y usarlo para insertar la temporada).

-- ========================================================
-- Políticas de Seguridad RLS Básicas
-- ========================================================
-- ATENCIÓN: Solo para la fase de desarrollo. 
-- En producción, esto debe restringirse a usuarios autenticados.
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multimedia_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Lectura anónima (desarrollo)
DROP POLICY IF EXISTS "Allow anonymous read clubs" ON public.clubs;
CREATE POLICY "Allow anonymous read clubs" ON public.clubs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous read seasons" ON public.seasons;
CREATE POLICY "Allow anonymous read seasons" ON public.seasons FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous read players" ON public.players;
CREATE POLICY "Allow anonymous read players" ON public.players FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous read assessments" ON public.assessments;
CREATE POLICY "Allow anonymous read assessments" ON public.assessments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous read dev_tasks" ON public.dev_tasks;
CREATE POLICY "Allow anonymous read dev_tasks" ON public.dev_tasks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous read medical_records" ON public.medical_records;
CREATE POLICY "Allow anonymous read medical_records" ON public.medical_records FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous read sports_stats" ON public.sports_stats;
CREATE POLICY "Allow anonymous read sports_stats" ON public.sports_stats FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous read workout_logs" ON public.workout_logs;
CREATE POLICY "Allow anonymous read workout_logs" ON public.workout_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous read physical" ON public.physical_metrics_history;
CREATE POLICY "Allow anonymous read physical" ON public.physical_metrics_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous read multimedia" ON public.multimedia_items;
CREATE POLICY "Allow anonymous read multimedia" ON public.multimedia_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous read videos" ON public.competition_videos;
CREATE POLICY "Allow anonymous read videos" ON public.competition_videos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous read chat" ON public.chat_messages;
CREATE POLICY "Allow anonymous read chat" ON public.chat_messages FOR SELECT USING (true);

-- Escritura/Edición anónima (desarrollo)
DROP POLICY IF EXISTS "Allow anonymous insert players" ON public.players;
CREATE POLICY "Allow anonymous insert players" ON public.players FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anonymous update players" ON public.players;
CREATE POLICY "Allow anonymous update players" ON public.players FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow anonymous delete players" ON public.players;
CREATE POLICY "Allow anonymous delete players" ON public.players FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert seasons" ON public.seasons;
CREATE POLICY "Allow anonymous insert seasons" ON public.seasons FOR INSERT WITH CHECK (true);
