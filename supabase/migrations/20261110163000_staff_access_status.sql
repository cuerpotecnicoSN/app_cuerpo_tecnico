-- Estado de acceso de los miembros del cuerpo técnico (staff/entrenadores)
-- Similar a player_access_status(), devuelve información de inicio de sesión de auth.users
CREATE OR REPLACE FUNCTION public.staff_access_status()
RETURNS TABLE (user_id uuid, email text, email_confirmed_at timestamptz, last_sign_in_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email, u.email_confirmed_at, u.last_sign_in_at
  FROM auth.users u
  JOIN public.profiles pr ON pr.id = u.id
  WHERE pr.role <> 'Jugador' AND public.is_staff();
$$;

GRANT EXECUTE ON FUNCTION public.staff_access_status() TO authenticated;

