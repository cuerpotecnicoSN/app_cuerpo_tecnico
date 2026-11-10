-- =====================================================================
-- AVISOS (campana)
-- =====================================================================
-- Ejecutar completo en Supabase > SQL Editor. Es idempotente.
--
--   jugador hace algo  -> aviso para el staff  (audience = 'staff')
--   staff envía algo   -> aviso para ESE jugador (audience = 'player')
--
-- Los avisos los crean triggers (SECURITY DEFINER): nadie puede insertarlos
-- a mano desde el cliente. Cada usuario marca los suyos como leídos.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audience TEXT NOT NULL CHECK (audience IN ('staff', 'player')),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  player_name TEXT,
  kind TEXT NOT NULL,
  op TEXT NOT NULL DEFAULT 'INSERT',
  title TEXT,
  title_i18n JSONB,
  ref_id UUID,
  actor_id UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_audience_idx ON public.notifications (audience, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_player_idx ON public.notifications (player_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_reads (
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (notification_id, user_id)
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all ON public.notifications;
DROP POLICY IF EXISTS staff_read ON public.notifications;
DROP POLICY IF EXISTS player_read ON public.notifications;
CREATE POLICY staff_read ON public.notifications FOR SELECT TO authenticated
  USING (audience = 'staff' AND public.is_staff());
CREATE POLICY player_read ON public.notifications FOR SELECT TO authenticated
  USING (audience = 'player' AND player_id = public.my_player_id());

DROP POLICY IF EXISTS staff_all ON public.notification_reads;
DROP POLICY IF EXISTS own_reads ON public.notification_reads;
CREATE POLICY own_reads ON public.notification_reads FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Trigger genérico. TG_ARGV[0] = tipo de aviso.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row_j    jsonb := to_jsonb(NEW);
  kind     text  := TG_ARGV[0];
  me_player uuid := public.my_player_id();
  me_staff  boolean := public.is_staff();
  pid      uuid;
  ttl      text;
  ttl_i18n jsonb;
  pname    text;
  f_status text;
BEGIN
  -- Jugador al que se refiere la fila
  IF TG_TABLE_NAME = 'objective_comments' THEN
    SELECT o.player_id, to_jsonb(o)->>'title' INTO pid, ttl FROM public.player_objectives o WHERE o.id = NEW.objective_id;
  ELSIF TG_TABLE_NAME = 'clip_comments' THEN
    SELECT c.player_id, to_jsonb(c)->>'title' INTO pid, ttl FROM public.player_clips c WHERE c.id = NEW.clip_id;
  ELSE
    pid := (row_j->>'player_id')::uuid;
    ttl := COALESCE(row_j->>'title', row_j->>'objective', row_j->>'content', row_j->>'description');
  END IF;
  IF pid IS NULL THEN RETURN NEW; END IF;

  -- Formularios: título multilenguaje y nada de borradores
  IF TG_TABLE_NAME IN ('form_responses', 'form_assignments') THEN
    SELECT f.title, f.status INTO ttl_i18n, f_status FROM public.forms f WHERE f.id = (row_j->>'form_id')::uuid;
    IF f_status = 'draft' THEN RETURN NEW; END IF;
    ttl := NULL;
  END IF;

  IF TG_TABLE_NAME = 'meeting_players' THEN
    SELECT COALESCE(m.objective, m.location), m.type INTO ttl, f_status FROM public.meetings m WHERE m.id = NEW.meeting_id;
  END IF;

  -- Comentarios de texto: vista previa del comentario
  IF TG_TABLE_NAME IN ('objective_comments', 'clip_comments') AND COALESCE(NEW.content, '') <> '' THEN
    ttl := NEW.content;
  END IF;

  -- Notas del jugador en un vídeo: solo cuando cambia su respuesta
  IF TG_TABLE_NAME = 'video_notes' AND TG_OP = 'UPDATE' THEN
    IF (row_j->>'player_notes') IS NOT DISTINCT FROM (to_jsonb(OLD)->>'player_notes') THEN RETURN NEW; END IF;
    ttl := COALESCE(row_j->>'player_notes', ttl);
  END IF;

  ttl := left(regexp_replace(COALESCE(ttl, ''), '<[^>]*>', '', 'g'), 160);

  IF me_player IS NOT NULL AND me_player = pid THEN
    -- El jugador ha hecho algo -> avisar al staff
    SELECT COALESCE(NULLIF(p.football_name, ''), trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')))
      INTO pname FROM public.players p WHERE p.id = pid;
    INSERT INTO public.notifications (audience, player_id, player_name, kind, op, title, title_i18n, ref_id)
    VALUES ('staff', pid, pname, kind, TG_OP, NULLIF(ttl, ''), ttl_i18n, (row_j->>'id')::uuid);
  ELSIF me_staff AND TG_OP = 'INSERT' THEN
    -- El staff ha enviado algo a un jugador -> avisar solo a ese jugador
    INSERT INTO public.notifications (audience, player_id, kind, op, title, title_i18n, ref_id)
    VALUES ('player', pid, kind, TG_OP, NULLIF(ttl, ''), ttl_i18n, (row_j->>'id')::uuid);
  END IF;
  RETURN NEW;
END;
$$;

-- Al publicar un formulario que ya tenía jugadores asignados, avisarles
CREATE OR REPLACE FUNCTION public.notify_form_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status = 'draft' THEN
    INSERT INTO public.notifications (audience, player_id, kind, op, title_i18n, ref_id)
    SELECT 'player', a.player_id, 'form_assigned', 'INSERT', NEW.title, a.id
    FROM public.form_assignments a WHERE a.form_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('player_self_assessments', 'self_assessment',   'INSERT OR UPDATE'),
      ('form_responses',          'form_response',     'INSERT OR UPDATE'),
      ('form_assignments',        'form_assigned',     'INSERT'),
      ('player_objectives',       'objective',         'INSERT OR UPDATE'),
      ('objective_comments',      'objective_comment', 'INSERT'),
      ('player_clips',            'clip',              'INSERT'),
      ('clip_comments',           'clip_comment',      'INSERT'),
      ('video_notes',             'video_note',        'INSERT OR UPDATE'),
      ('player_focuses',          'focus',             'INSERT'),
      ('season_reports',          'report',            'INSERT'),
      ('meeting_players',         'meeting',           'INSERT')
    ) AS v(tbl, kind, ev)
  LOOP
    IF to_regclass('public.' || t.tbl) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS notify_activity ON public.%I', t.tbl);
      EXECUTE format(
        'CREATE TRIGGER notify_activity AFTER %s ON public.%I FOR EACH ROW EXECUTE FUNCTION public.notify_activity(%L)',
        t.ev, t.tbl, t.kind
      );
    END IF;
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS notify_form_published ON public.forms;
CREATE TRIGGER notify_form_published AFTER UPDATE OF status ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.notify_form_published();
