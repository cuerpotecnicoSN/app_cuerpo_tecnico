-- =====================================================================
-- ESTADÍSTICAS DEL JUGADOR: SOLO LAS SUYAS
-- =====================================================================
-- Ejecutar completo en Supabase > SQL Editor. Es idempotente.
--
-- matches.scouting_notes guarda el informe Panini completo (toda la plantilla
-- y el rival). La política player_read permitía descargarlo a cualquier
-- jugador, aunque la pantalla solo mostrase lo suyo.
--
--   1. Los jugadores dejan de leer public.matches directamente.
--   2. my_panini_reports() les devuelve una copia recortada de cada informe:
--      solo su fila, sus pases y los datos públicos del partido.
--
-- Aplicar ANTES de desplegar el frontend que llama a my_panini_reports().
-- =====================================================================

CREATE OR REPLACE FUNCTION public.panini_normalize(value text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(regexp_replace(
    translate(lower(coalesce(value, '')), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'),
    '[^a-z0-9 ]+', ' ', 'g'
  ));
$$;

-- Dorsal del jugador en un equipo del informe: por player_id o, si ninguna fila
-- está vinculada a él, por nombre entre las filas sin vincular.
CREATE OR REPLACE FUNCTION public.panini_find_dorsal(team jsonb, target_player uuid, target_name text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  rows_ jsonb := coalesce(team->'alineacion', '[]'::jsonb) || coalesce(team->'jugadores_stats', '[]'::jsonb);
  tokens text[];
  found text;
BEGIN
  SELECT r->>'dorsal' INTO found
  FROM jsonb_array_elements(rows_) r
  WHERE r->>'player_id' = target_player::text
  LIMIT 1;
  IF found IS NOT NULL THEN RETURN found; END IF;

  SELECT array_agg(t) INTO tokens
  FROM unnest(string_to_array(public.panini_normalize(target_name), ' ')) t
  WHERE length(t) > 2;
  IF tokens IS NULL THEN RETURN NULL; END IF;

  SELECT r->>'dorsal' INTO found
  FROM jsonb_array_elements(rows_) r
  WHERE coalesce(r->>'player_id', '') = ''
    AND NOT EXISTS (
      SELECT 1 FROM unnest(tokens) t
      WHERE position(t IN public.panini_normalize(r->>'nombre')) = 0
    )
  LIMIT 1;
  RETURN found;
END;
$$;

-- Copia del equipo con los datos individuales de un solo dorsal. Del resto de
-- la alineación solo quedan dorsal y nombre, para rotular a quién dio sus pases.
CREATE OR REPLACE FUNCTION public.panini_team_for_player(team jsonb, dorsal text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  mp jsonb := team->'matriz_pases';
  matrix jsonb := '{}'::jsonb;
BEGIN
  IF dorsal IS NULL THEN
    RETURN jsonb_build_object('nombre', team->'nombre', 'goles', team->'goles', 'alineacion', '[]'::jsonb, 'jugadores_stats', '[]'::jsonb);
  END IF;

  IF jsonb_typeof(mp->'matriz') = 'object' THEN
    -- Fila propia (pases dados) y columna propia (pases recibidos)
    SELECT coalesce(jsonb_object_agg(origin, CASE WHEN origin = dorsal THEN targets ELSE jsonb_build_object(dorsal, targets->dorsal) END), '{}'::jsonb)
    INTO matrix
    FROM jsonb_each(mp->'matriz') AS m(origin, targets)
    WHERE origin = dorsal OR (jsonb_typeof(targets) = 'object' AND targets ? dorsal);
  END IF;

  RETURN jsonb_build_object(
    'nombre', team->'nombre',
    'goles', team->'goles',
    'alineacion', (
      SELECT coalesce(jsonb_agg(
        CASE WHEN p->>'dorsal' = dorsal THEN p
             ELSE jsonb_build_object('dorsal', p->'dorsal', 'nombre', p->'nombre') END
      ), '[]'::jsonb)
      FROM jsonb_array_elements(coalesce(team->'alineacion', '[]'::jsonb)) p
    ),
    'jugadores_stats', (
      SELECT coalesce(jsonb_agg(s), '[]'::jsonb)
      FROM jsonb_array_elements(coalesce(team->'jugadores_stats', '[]'::jsonb)) s
      WHERE s->>'dorsal' = dorsal
    ),
    'matriz_pases', jsonb_build_object(
      'jugadores', (
        SELECT coalesce(jsonb_agg(j), '[]'::jsonb)
        FROM jsonb_array_elements(coalesce(mp->'jugadores', '[]'::jsonb)) j
        WHERE j->>'dorsal' = dorsal
      ),
      'matriz', matrix,
      'totales_dados', jsonb_strip_nulls(jsonb_build_object(dorsal, mp->'totales_dados'->dorsal)),
      'totales_recibidos', jsonb_strip_nulls(jsonb_build_object(dorsal, mp->'totales_recibidos'->dorsal)),
      'precision_individual_pct', jsonb_strip_nulls(jsonb_build_object(dorsal, mp->'precision_individual_pct'->dorsal))
    )
  );
END;
$$;

-- Informes de la temporada recortados para el jugador autenticado. El partido se
-- devuelve aunque no jugase, sin datos suyos, para que J1, J2… coincidan con el staff.
CREATE OR REPLACE FUNCTION public.my_panini_reports(p_season_id uuid)
RETURNS TABLE (match jsonb, report jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me_id uuid := public.my_player_id();
  me_name text;
  prefix constant text := '__PANINI_REPORT_JSON__';
  m record;
  m_json jsonb;
  doc jsonb;
  home_is_ours boolean;
  ours jsonb;
  rival jsonb;
  my_dorsal text;
  our_slim jsonb;
  rival_slim jsonb;
BEGIN
  IF me_id IS NULL THEN RETURN; END IF;

  SELECT concat_ws(' ', first_name, last_name) INTO me_name FROM public.players WHERE id = me_id;

  FOR m IN
    SELECT * FROM public.matches
    WHERE season_id = p_season_id AND left(scouting_notes, length(prefix)) = prefix
    ORDER BY date
  LOOP
    BEGIN
      doc := substr(m.scouting_notes, length(prefix) + 1)::jsonb;
    EXCEPTION WHEN others THEN
      CONTINUE; -- informe corrupto: se ignora, igual que en el cliente
    END;
    IF doc->'equipo_local' IS NULL OR doc->'equipo_visitante' IS NULL THEN CONTINUE; END IF;

    home_is_ours := CASE
      WHEN lower(coalesce(doc->'equipo_local'->>'nombre', '')) LIKE '%milan%' THEN true
      WHEN lower(coalesce(doc->'equipo_visitante'->>'nombre', '')) LIKE '%milan%' THEN false
      ELSE coalesce(m.is_home, true)
    END;
    ours  := CASE WHEN home_is_ours THEN doc->'equipo_local' ELSE doc->'equipo_visitante' END;
    rival := CASE WHEN home_is_ours THEN doc->'equipo_visitante' ELSE doc->'equipo_local' END;

    my_dorsal := public.panini_find_dorsal(ours, me_id, me_name);
    our_slim := public.panini_team_for_player(ours, my_dorsal);
    rival_slim := public.panini_team_for_player(rival, NULL);

    m_json := to_jsonb(m);
    match := jsonb_build_object(
      'id', m.id, 'season_id', m.season_id, 'date', m.date, 'opponent', m.opponent,
      'competition', m.competition, 'is_home', m.is_home, 'status', m.status,
      'result_home', m.result_home, 'result_away', m.result_away,
      'home_logo', m_json->'home_logo', 'away_logo', m_json->'away_logo'
    );
    report := jsonb_build_object(
      'fecha', doc->'fecha', 'competicion', doc->'competicion', 'jornada', doc->'jornada', 'estadio', doc->'estadio',
      'goleadores', coalesce(doc->'goleadores', '[]'::jsonb),
      'equipo_local', CASE WHEN home_is_ours THEN our_slim ELSE rival_slim END,
      'equipo_visitante', CASE WHEN home_is_ours THEN rival_slim ELSE our_slim END
    );
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.my_panini_reports(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_panini_reports(uuid) TO authenticated;

DROP POLICY IF EXISTS player_read ON public.matches;

NOTIFY pgrst, 'reload schema';
