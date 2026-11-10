-- =====================================================================
-- CHAT entrenadores <-> jugador (en "La voz del jugador"). Idempotente.
-- Requiere 20261110190000_notifications.sql (función notify_activity).
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.player_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  author_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS player_messages_player_idx ON public.player_messages (player_id, created_at);

ALTER TABLE public.player_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_all ON public.player_messages;
DROP POLICY IF EXISTS player_read ON public.player_messages;
DROP POLICY IF EXISTS player_insert ON public.player_messages;
DROP POLICY IF EXISTS player_delete ON public.player_messages;
CREATE POLICY staff_all ON public.player_messages FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY player_read ON public.player_messages FOR SELECT TO authenticated
  USING (player_id = public.my_player_id());
CREATE POLICY player_insert ON public.player_messages FOR INSERT TO authenticated
  WITH CHECK (player_id = public.my_player_id() AND author_id = auth.uid());
CREATE POLICY player_delete ON public.player_messages FOR DELETE TO authenticated
  USING (author_id = auth.uid());

DROP TRIGGER IF EXISTS notify_activity ON public.player_messages;
CREATE TRIGGER notify_activity AFTER INSERT ON public.player_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_activity('message');

NOTIFY pgrst, 'reload schema';
