-- Migración: nuevas tablas para la simplificación de la app a 6 páginas
-- (Entrenamientos, Partidos, Dinámicas, Jugadores: plan individual/objetivos/informes)

-- ===== ENTRENAMIENTOS =====

CREATE TABLE public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration_min INTEGER,
    players_min INTEGER,
    players_max INTEGER,
    material TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.training_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    objective TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.session_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    "order" INTEGER DEFAULT 0,
    duration_min INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== PARTIDOS =====

CREATE TABLE public.matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    competition TEXT,
    date DATE NOT NULL,
    time TEXT,
    opponent TEXT NOT NULL,
    is_home BOOLEAN DEFAULT TRUE,
    stadium TEXT,
    status TEXT NOT NULL DEFAULT 'Scheduled', -- 'Scheduled', 'Live', 'Finished'
    result_home INTEGER,
    result_away INTEGER,
    scouting_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.match_focuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.match_data_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    staff_id UUID,
    minute INTEGER,
    type TEXT NOT NULL,
    outcome TEXT DEFAULT 'Neutral', -- 'Success', 'Failure', 'Neutral'
    coordinates JSONB,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== DINÁMICAS / REUNIONES (individuales y grupales) =====

CREATE TABLE public.meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'individual', -- 'individual', 'grupal'
    date DATE NOT NULL,
    time TEXT,
    location TEXT,
    objective TEXT,
    development TEXT,
    positive_points TEXT,
    improvements TEXT,
    agreements TEXT,
    next_steps TEXT,
    follow_up_date DATE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.meeting_players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE
);

-- ===== JUGADORES: PLAN INDIVIDUAL / OBJETIVOS / INFORMES =====

CREATE TABLE public.player_objectives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'En progreso', -- 'En progreso', 'Cumplido', 'No cumplido'
    target_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.season_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
    summary TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== RLS: acceso público de desarrollo (igual que el resto del proyecto) =====

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_focuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to tasks" ON public.tasks FOR ALL USING (true);
CREATE POLICY "Allow public access to training_sessions" ON public.training_sessions FOR ALL USING (true);
CREATE POLICY "Allow public access to session_tasks" ON public.session_tasks FOR ALL USING (true);
CREATE POLICY "Allow public access to matches" ON public.matches FOR ALL USING (true);
CREATE POLICY "Allow public access to match_focuses" ON public.match_focuses FOR ALL USING (true);
CREATE POLICY "Allow public access to match_data_points" ON public.match_data_points FOR ALL USING (true);
CREATE POLICY "Allow public access to meetings" ON public.meetings FOR ALL USING (true);
CREATE POLICY "Allow public access to meeting_players" ON public.meeting_players FOR ALL USING (true);
CREATE POLICY "Allow public access to player_objectives" ON public.player_objectives FOR ALL USING (true);
CREATE POLICY "Allow public access to season_reports" ON public.season_reports FOR ALL USING (true);
