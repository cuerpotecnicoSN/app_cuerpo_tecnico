-- =====================================================================
-- El jugador puede crear, editar y borrar todo lo de SU plan
-- (objetivos, focos, sesiones de vídeo, clips). Stats, peso, lesiones e
-- informes siguen siendo solo lectura. Idempotente.
-- =====================================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['player_objectives', 'player_focuses', 'video_notes', 'player_clips'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS player_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS player_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS player_delete ON public.%I', t);
    EXECUTE format('CREATE POLICY player_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (player_id = public.my_player_id())', t);
    EXECUTE format('CREATE POLICY player_update ON public.%I FOR UPDATE TO authenticated USING (player_id = public.my_player_id()) WITH CHECK (player_id = public.my_player_id())', t);
    EXECUTE format('CREATE POLICY player_delete ON public.%I FOR DELETE TO authenticated USING (player_id = public.my_player_id())', t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
