-- El jugador puede editar y borrar sus respuestas en cualquier momento
-- (aunque el formulario esté cerrado), siempre que se lo hayan enviado.
-- Ejecutar en Supabase > SQL Editor. Es idempotente.
CREATE OR REPLACE FUNCTION public.form_sent_to_me(fid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.form_assignments a ON a.form_id = f.id
    WHERE f.id = fid AND f.status <> 'draft' AND a.player_id = public.my_player_id()
  );
$$;

DROP POLICY IF EXISTS player_insert ON public.form_responses;
DROP POLICY IF EXISTS player_update ON public.form_responses;
DROP POLICY IF EXISTS player_delete ON public.form_responses;
CREATE POLICY player_insert ON public.form_responses FOR INSERT TO authenticated
  WITH CHECK (player_id = public.my_player_id() AND public.form_sent_to_me(form_id));
CREATE POLICY player_update ON public.form_responses FOR UPDATE TO authenticated
  USING (player_id = public.my_player_id() AND public.form_sent_to_me(form_id))
  WITH CHECK (player_id = public.my_player_id() AND public.form_sent_to_me(form_id));
CREATE POLICY player_delete ON public.form_responses FOR DELETE TO authenticated
  USING (player_id = public.my_player_id());
