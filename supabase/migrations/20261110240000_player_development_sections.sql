-- =====================================================================
-- PLAN INDIVIDUAL DE DESARROLLO: SECCIONES INTERACTIVAS CON COMENTARIOS
-- =====================================================================
-- Secciones:
--   1. 'objectives' (Definir Objetivos: Futbol, Fisico, Personal)
--   2. 'personal_traits' (Características Personales: En el juego, A nivel personal)
--   3. 'focuses' (Focos: Entrenamiento, Partido, Fuera del campo)
--   4. 'competition_analysis' (Análisis Competición: Partido, Jugadas, etc.)
--   5. 'action_plan' (Plan de Acción: Tareas a realizar)
--
-- Tanto jugador como staff pueden crear filas y comentar sobre cada una.
-- Los comentarios guardan autor, rol, fecha e historial con colores diferenciados.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.player_development_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('objectives', 'personal_traits', 'focuses', 'competition_analysis', 'action_plan')),
  category TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT,
  match_name TEXT,
  match_date DATE,
  deadline DATE,
  status TEXT DEFAULT 'pending',
  links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_by_player BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_items_player_sec ON public.player_development_items (player_id, section, created_at DESC);

-- Comentarios / Incisos de cada fila
CREATE TABLE IF NOT EXISTS public.player_development_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.player_development_items(id) ON DELETE CASCADE,
  author_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_comments_item ON public.player_development_comments (item_id, created_at ASC);

-- RLS
ALTER TABLE public.player_development_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_development_comments ENABLE ROW LEVEL SECURITY;

-- Politicas para items
DROP POLICY IF EXISTS staff_all_items ON public.player_development_items;
CREATE POLICY staff_all_items ON public.player_development_items FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS player_select_items ON public.player_development_items;
CREATE POLICY player_select_items ON public.player_development_items FOR SELECT TO authenticated
  USING (player_id = public.my_player_id());

DROP POLICY IF EXISTS player_insert_items ON public.player_development_items;
CREATE POLICY player_insert_items ON public.player_development_items FOR INSERT TO authenticated
  WITH CHECK (player_id = public.my_player_id());

DROP POLICY IF EXISTS player_update_items ON public.player_development_items;
CREATE POLICY player_update_items ON public.player_development_items FOR UPDATE TO authenticated
  USING (player_id = public.my_player_id()) WITH CHECK (player_id = public.my_player_id());

DROP POLICY IF EXISTS player_delete_items ON public.player_development_items;
CREATE POLICY player_delete_items ON public.player_development_items FOR DELETE TO authenticated
  USING (player_id = public.my_player_id());

-- Politicas para comentarios
DROP POLICY IF EXISTS staff_all_comments ON public.player_development_comments;
CREATE POLICY staff_all_comments ON public.player_development_comments FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS player_select_comments ON public.player_development_comments;
CREATE POLICY player_select_comments ON public.player_development_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.player_development_items i
    WHERE i.id = player_development_comments.item_id AND i.player_id = public.my_player_id()
  ));

DROP POLICY IF EXISTS player_insert_comments ON public.player_development_comments;
CREATE POLICY player_insert_comments ON public.player_development_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.player_development_items i
      WHERE i.id = player_development_comments.item_id AND i.player_id = public.my_player_id()
    )
  );

DROP POLICY IF EXISTS player_update_comments ON public.player_development_comments;
CREATE POLICY player_update_comments ON public.player_development_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS player_delete_comments ON public.player_development_comments;
CREATE POLICY player_delete_comments ON public.player_development_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid());

NOTIFY pgrst, 'reload schema';

