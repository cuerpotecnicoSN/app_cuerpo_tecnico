-- Migración para añadir tablas de pesos y lesiones a app_cuerpo_tecnico

CREATE TABLE public.player_weights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.player_injuries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    body_zone TEXT NOT NULL,
    body_side TEXT NOT NULL DEFAULT 'frontal', -- 'frontal' o 'posterior'
    severity TEXT NOT NULL DEFAULT 'Moderada', -- 'Leve', 'Moderada', 'Grave'
    status TEXT NOT NULL DEFAULT 'Activa', -- 'Activa', 'En tratamiento', 'Recuperado', 'Baja'
    diagnosis TEXT NOT NULL,
    treatment TEXT,
    injury_date DATE NOT NULL,
    baja_date DATE,
    estimated_return DATE,
    actual_return DATE,
    origin TEXT,
    follow_up_notes TEXT,
    competitive_leave BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Si tienes RLS habilitado en estas tablas:
ALTER TABLE public.player_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_injuries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to weights" ON public.player_weights FOR ALL USING (true);
CREATE POLICY "Allow public access to injuries" ON public.player_injuries FOR ALL USING (true);
