-- =====================================================================
-- "Mis vídeos": cortes de partidos / entrenamientos que sube el jugador
-- (o el staff para él), con conversación por vídeo.
-- Aplicar a mano en el SQL Editor de Supabase.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.player_clips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  author_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  context TEXT NOT NULL DEFAULT 'partido' CHECK (context IN ('partido', 'entreno', 'otro')),
  title TEXT NOT NULL,
  url TEXT NOT NULL CHECK (url ~* '^https?://'),
  clip_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS player_clips_player_idx ON public.player_clips (player_id, clip_date DESC);

ALTER TABLE public.player_clips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all ON public.player_clips;
CREATE POLICY staff_all ON public.player_clips FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS player_read ON public.player_clips;
CREATE POLICY player_read ON public.player_clips FOR SELECT TO authenticated
  USING (player_id = public.my_player_id());

DROP POLICY IF EXISTS player_insert ON public.player_clips;
CREATE POLICY player_insert ON public.player_clips FOR INSERT TO authenticated
  WITH CHECK (player_id = public.my_player_id() AND author_id = auth.uid());

-- El jugador edita/borra solo los vídeos que subió él
DROP POLICY IF EXISTS player_update ON public.player_clips;
CREATE POLICY player_update ON public.player_clips FOR UPDATE TO authenticated
  USING (player_id = public.my_player_id() AND author_id = auth.uid())
  WITH CHECK (player_id = public.my_player_id() AND author_id = auth.uid());

DROP POLICY IF EXISTS player_delete ON public.player_clips;
CREATE POLICY player_delete ON public.player_clips FOR DELETE TO authenticated
  USING (player_id = public.my_player_id() AND author_id = auth.uid());

-- Conversación por vídeo
CREATE TABLE IF NOT EXISTS public.clip_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clip_id UUID NOT NULL REFERENCES public.player_clips(id) ON DELETE CASCADE,
  author_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (length(trim(content)) > 0 OR jsonb_array_length(links) > 0)
);
CREATE INDEX IF NOT EXISTS clip_comments_clip_idx ON public.clip_comments (clip_id, created_at);

ALTER TABLE public.clip_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all ON public.clip_comments;
CREATE POLICY staff_all ON public.clip_comments FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff() AND author_id = auth.uid());

DROP POLICY IF EXISTS player_read ON public.clip_comments;
CREATE POLICY player_read ON public.clip_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.player_clips c
    WHERE c.id = clip_comments.clip_id AND c.player_id = public.my_player_id()
  ));

DROP POLICY IF EXISTS player_insert ON public.clip_comments;
CREATE POLICY player_insert ON public.clip_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.player_clips c
      WHERE c.id = clip_comments.clip_id AND c.player_id = public.my_player_id()
    )
  );

DROP POLICY IF EXISTS player_delete ON public.clip_comments;
CREATE POLICY player_delete ON public.clip_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid());

NOTIFY pgrst, 'reload schema';
