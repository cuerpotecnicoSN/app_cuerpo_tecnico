-- =====================================================================
-- Objetivos propuestos por el jugador + conversación con el staff + enlaces
-- (aplicar a mano en el SQL Editor de Supabase, después de player_portal)
-- =====================================================================

-- 1. Objetivos: quién lo creó y enlaces (vídeos, documentos)
ALTER TABLE public.player_objectives ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid();
ALTER TABLE public.player_objectives ADD COLUMN IF NOT EXISTS created_by_player BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.player_objectives ADD COLUMN IF NOT EXISTS links JSONB NOT NULL DEFAULT '[]'::jsonb;

-- El jugador crea objetivos suyos (siempre marcados como suyos)
DROP POLICY IF EXISTS player_insert ON public.player_objectives;
CREATE POLICY player_insert ON public.player_objectives FOR INSERT TO authenticated
  WITH CHECK (player_id = public.my_player_id() AND created_by_player);

-- ...y solo edita/borra los que creó él; los del staff siguen siendo de solo lectura
DROP POLICY IF EXISTS player_update ON public.player_objectives;
CREATE POLICY player_update ON public.player_objectives FOR UPDATE TO authenticated
  USING (player_id = public.my_player_id() AND created_by_player)
  WITH CHECK (player_id = public.my_player_id() AND created_by_player);

DROP POLICY IF EXISTS player_delete ON public.player_objectives;
CREATE POLICY player_delete ON public.player_objectives FOR DELETE TO authenticated
  USING (player_id = public.my_player_id() AND created_by_player);

-- 2. Conversación por objetivo (jugador <-> staff)
CREATE TABLE IF NOT EXISTS public.objective_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES public.player_objectives(id) ON DELETE CASCADE,
  author_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (length(trim(content)) > 0 OR jsonb_array_length(links) > 0)
);
CREATE INDEX IF NOT EXISTS objective_comments_objective_idx ON public.objective_comments (objective_id, created_at);

ALTER TABLE public.objective_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all ON public.objective_comments;
CREATE POLICY staff_all ON public.objective_comments FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff() AND author_id = auth.uid());

-- El jugador lee los mensajes de sus objetivos
DROP POLICY IF EXISTS player_read ON public.objective_comments;
CREATE POLICY player_read ON public.objective_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.player_objectives o
    WHERE o.id = objective_comments.objective_id AND o.player_id = public.my_player_id()
  ));

-- ...escribe en ellos como él mismo
DROP POLICY IF EXISTS player_insert ON public.objective_comments;
CREATE POLICY player_insert ON public.objective_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.player_objectives o
      WHERE o.id = objective_comments.objective_id AND o.player_id = public.my_player_id()
    )
  );

-- ...y borra solo sus propios mensajes
DROP POLICY IF EXISTS player_delete ON public.objective_comments;
CREATE POLICY player_delete ON public.objective_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- Para que PostgREST vea la nueva relación (author -> profiles) sin esperar
NOTIFY pgrst, 'reload schema';
