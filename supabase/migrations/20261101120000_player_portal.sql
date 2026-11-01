-- =====================================================================
-- PORTAL DEL JUGADOR + PLAN INDIVIDUAL DE DESARROLLO + RLS REAL
-- =====================================================================
-- Ejecutar completo en Supabase > SQL Editor. Es idempotente.
--
-- Qué hace:
--   1. Roles: añade 'Jugador' y 'Pendiente'. Las altas nuevas por registro
--      quedan 'Pendiente' (sin acceso) hasta que un admin les asigne rol.
--   2. Vincula jugadores con su cuenta (players.email / user_id / tutor_id).
--   3. Tablas nuevas de la ficha: focos, notas de vídeo, autoevaluaciones.
--   4. Sustituye TODAS las políticas "USING (true)" por:
--        - staff  -> acceso completo
--        - jugador -> solo lectura de lo suyo + escribir sus autoevaluaciones
--        - anónimo -> nada
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PERFILES Y ROLES
-- ---------------------------------------------------------------------
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

UPDATE public.profiles SET role = 'Entrenador'
WHERE role IS NULL OR role NOT IN ('Admin', 'Administrador', 'Entrenador', 'Preparador Físico', 'Analista', 'Jugador', 'Pendiente');

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN ('Admin', 'Administrador', 'Entrenador', 'Preparador Físico', 'Analista', 'Jugador', 'Pendiente')
);

-- Backfill: toda cuenta que ya existía antes de esta migración es del staff.
-- Así nadie del cuerpo técnico pierde el acceso al activar las políticas.
INSERT INTO public.profiles (id, email, full_name, role)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)), 'Entrenador'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET role = 'Admin' WHERE email = 'cuerpotecnico.sn@gmail.com';

-- Las altas nuevas NUNCA toman el rol de los metadatos (cualquiera puede
-- enviarlos al registrarse). Empiezan en 'Pendiente'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'Pendiente'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. JUGADOR <-> CUENTA
-- ---------------------------------------------------------------------
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS tutor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS players_user_id_key ON public.players(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS players_email_key ON public.players(lower(email)) WHERE email IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3. FUNCIONES DE PERMISO (SECURITY DEFINER para evitar recursión en RLS)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('Admin', 'Administrador', 'Entrenador', 'Preparador Físico', 'Analista')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role IN ('Admin', 'Administrador') OR email = 'cuerpotecnico.sn@gmail.com')
  );
$$;

CREATE OR REPLACE FUNCTION public.my_player_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.players WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Nadie puede cambiarse su propio rol; solo un admin (o el backend con service key).
CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar roles';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_role_guard ON public.profiles;
CREATE TRIGGER profiles_role_guard BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.guard_profile_role();

-- Estado de las cuentas de jugadores (auth.users no es legible desde el cliente)
CREATE OR REPLACE FUNCTION public.player_access_status()
RETURNS TABLE (player_id uuid, email_confirmed_at timestamptz, last_sign_in_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, u.email_confirmed_at, u.last_sign_in_at
  FROM public.players p JOIN auth.users u ON u.id = p.user_id
  WHERE public.is_staff();
$$;

-- ---------------------------------------------------------------------
-- 4. PLAN INDIVIDUAL DE DESARROLLO
-- ---------------------------------------------------------------------
-- Bloque 1 + 2: objetivos multidimensionales con criterios y temporalidad
ALTER TABLE public.player_objectives ADD COLUMN IF NOT EXISTS dimension TEXT NOT NULL DEFAULT 'futbolistico'
  CHECK (dimension IN ('futbolistico', 'fisico', 'personal'));
ALTER TABLE public.player_objectives ADD COLUMN IF NOT EXISTS success_criteria TEXT;
ALTER TABLE public.player_objectives ADD COLUMN IF NOT EXISTS indicators TEXT;
ALTER TABLE public.player_objectives ADD COLUMN IF NOT EXISTS tasks TEXT;
ALTER TABLE public.player_objectives ADD COLUMN IF NOT EXISTS start_date DATE;

-- Bloque 1: focos individuales
CREATE TABLE IF NOT EXISTS public.player_focuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  context TEXT NOT NULL CHECK (context IN ('partido', 'entreno', 'fuera')),
  title TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bloque 3: video-sesiones (nota del staff + respuesta del jugador)
CREATE TABLE IF NOT EXISTS public.video_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  video_url TEXT,
  staff_notes TEXT,
  player_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bloque 3: autoevaluaciones (escritas por el propio jugador, formato libre)
CREATE TABLE IF NOT EXISTS public.player_self_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- El jugador solo puede rellenar player_notes de sus notas de vídeo
CREATE OR REPLACE FUNCTION public.set_video_player_notes(note_id uuid, notes text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.video_notes SET player_notes = notes
  WHERE id = note_id AND player_id = public.my_player_id();
$$;

-- ---------------------------------------------------------------------
-- 5. RLS: borrar todas las políticas abiertas y aplicar staff / jugador
-- ---------------------------------------------------------------------
DO $$
DECLARE t record; p record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t.tablename);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format(
      'CREATE POLICY staff_all ON public.%I FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff())',
      t.tablename
    );
  END LOOP;
END $$;

-- Perfiles: cada uno ve el suyo; los jugadores ven también al staff (nombre del tutor)
CREATE POLICY profiles_self_read ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR role <> 'Jugador');
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Contexto común (club, temporada, calendario/resultados e informes de partido)
CREATE POLICY player_read ON public.clubs   FOR SELECT TO authenticated USING (public.my_player_id() IS NOT NULL);
CREATE POLICY player_read ON public.seasons FOR SELECT TO authenticated USING (public.my_player_id() IS NOT NULL);
CREATE POLICY player_read ON public.matches FOR SELECT TO authenticated USING (public.my_player_id() IS NOT NULL);

-- Datos propios del jugador (solo lectura)
CREATE POLICY player_read ON public.players            FOR SELECT TO authenticated USING (id = public.my_player_id());
CREATE POLICY player_read ON public.player_objectives  FOR SELECT TO authenticated USING (player_id = public.my_player_id());
CREATE POLICY player_read ON public.player_focuses     FOR SELECT TO authenticated USING (player_id = public.my_player_id());
CREATE POLICY player_read ON public.video_notes        FOR SELECT TO authenticated USING (player_id = public.my_player_id());
CREATE POLICY player_read ON public.player_weights     FOR SELECT TO authenticated USING (player_id = public.my_player_id());
CREATE POLICY player_read ON public.player_injuries    FOR SELECT TO authenticated USING (player_id = public.my_player_id());
CREATE POLICY player_read ON public.season_reports     FOR SELECT TO authenticated USING (player_id = public.my_player_id());
CREATE POLICY player_read ON public.match_data_points  FOR SELECT TO authenticated USING (player_id = public.my_player_id());
CREATE POLICY player_read ON public.meeting_players    FOR SELECT TO authenticated USING (player_id = public.my_player_id());
CREATE POLICY player_read ON public.meetings           FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.meeting_players mp WHERE mp.meeting_id = meetings.id AND mp.player_id = public.my_player_id())
);

-- Autoevaluaciones: el jugador lee, crea, edita y borra las suyas
CREATE POLICY player_own ON public.player_self_assessments FOR ALL TO authenticated
  USING (player_id = public.my_player_id())
  WITH CHECK (player_id = public.my_player_id());

-- ---------------------------------------------------------------------
-- 6. STORAGE: PDFs de Panini solo para el staff
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "panini_reports_select" ON storage.objects;
DROP POLICY IF EXISTS "panini_reports_insert" ON storage.objects;
DROP POLICY IF EXISTS "panini_reports_update" ON storage.objects;
DROP POLICY IF EXISTS "panini_reports_delete" ON storage.objects;
CREATE POLICY "panini_reports_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'panini-reports' AND public.is_staff());
CREATE POLICY "panini_reports_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'panini-reports' AND public.is_staff());
CREATE POLICY "panini_reports_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'panini-reports' AND public.is_staff());
CREATE POLICY "panini_reports_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'panini-reports' AND public.is_staff());
