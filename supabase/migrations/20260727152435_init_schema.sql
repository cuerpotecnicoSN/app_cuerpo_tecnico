-- 1. Create Enums if needed
-- (Not strictly necessary if we use JSONB or standard tables, but good for specific states)

-- 2. Extended Users Profile
CREATE TABLE public.users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    photo_url TEXT,
    birth_date DATE,
    nationality TEXT,
    languages JSONB DEFAULT '[]'::jsonb,
    phone TEXT,
    email TEXT UNIQUE NOT NULL,
    licenses JSONB DEFAULT '[]'::jsonb,
    professional_experience JSONB DEFAULT '[]'::jsonb,
    biography TEXT,
    additional_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 3. Organization Structure
CREATE TABLE public.clubs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT, -- e.g., Senior, U19, Women
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.seasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- e.g., 2024/2025
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.team_seasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(team_id, season_id)
);

-- 4. Roles and Permissions
CREATE TABLE public.permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL, -- e.g., manage_players, create_trainings
    description TEXT
);

CREATE TABLE public.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE, -- If NULL, it's a global role (e.g. Admin, Head Coach template)
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE public.staff_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    team_season_id UUID REFERENCES public.team_seasons(id) ON DELETE CASCADE NOT NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE RESTRICT,
    custom_title TEXT, -- e.g. "Entrenador de Porteros del Filial"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, team_season_id)
);

CREATE TABLE public.staff_custom_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE CASCADE NOT NULL,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
    is_granted BOOLEAN NOT NULL, -- True to grant, False to revoke
    UNIQUE(staff_member_id, permission_id)
);

-- 5. Audit System
CREATE TABLE public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Who did it
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Trigger Function
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Intentamos obtener el ID del usuario actual de JWT de Supabase
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, user_id)
        VALUES (TG_TABLE_NAME, (OLD.id)::uuid, TG_OP, row_to_json(OLD)::jsonb, current_user_id);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, (NEW.id)::uuid, TG_OP, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, current_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, user_id)
        VALUES (TG_TABLE_NAME, (NEW.id)::uuid, TG_OP, NULL, row_to_json(NEW)::jsonb, current_user_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Audit Triggers to important tables
CREATE TRIGGER audit_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE TRIGGER audit_staff_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.staff_members
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Seed Basic Permissions
INSERT INTO public.permissions (key, description) VALUES
('manage_club', 'Administrar el club (crear equipos, roles)'),
('manage_players', 'Crear, editar y eliminar jugadores'),
('manage_staff', 'Añadir o eliminar miembros del cuerpo técnico'),
('manage_trainings', 'Crear y editar entrenamientos y tareas'),
('manage_matches', 'Crear partidos y registrar eventos/campograma'),
('manage_evaluations', 'Crear y editar evaluaciones físicas/tácticas'),
('view_analytics', 'Acceso al dashboard y estadísticas avanzadas');

-- Seed Global Roles
INSERT INTO public.roles (name, description) VALUES
('Administrador', 'Acceso total al club'),
('Primer Entrenador', 'Acceso total al equipo y planificación'),
('Segundo Entrenador', 'Gestión de entrenamientos y jugadores'),
('Analista', 'Gestión de partidos y estadísticas'),
('Preparador Físico', 'Gestión de cargas y físico'),
('Médico/Fisio', 'Gestión de lesiones e informes médicos');
