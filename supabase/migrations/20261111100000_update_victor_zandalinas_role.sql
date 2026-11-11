-- Actualizar rol de Victor Zandalinas a Analista
UPDATE public.profiles
SET role = 'Analista'
WHERE email = 'victorzanpra@hotmail.com'
   OR full_name ILIKE '%Victor Zandalinas%';

