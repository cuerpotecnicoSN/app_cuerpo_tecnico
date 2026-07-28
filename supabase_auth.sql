-- Script de Autenticación y Perfiles para Supabase (StaffControl)
-- =============================================================

-- 1. Crear la tabla de perfiles (vinculada a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'Entrenador' CHECK (role IN ('Admin', 'Entrenador', 'Preparador Físico', 'Analista')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar Seguridad RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso a perfiles
-- Cualquier usuario autenticado puede ver todos los perfiles
CREATE POLICY "Usuarios autenticados pueden ver perfiles" 
ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

-- Solo los Admins pueden insertar/actualizar perfiles (además del trigger automático)
-- (En un escenario más restrictivo, habría que verificar si el auth.uid() es Admin)
CREATE POLICY "Admins pueden actualizar perfiles" 
ON public.profiles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'
  )
);

-- 4. Trigger Automático
-- Cuando se cree un usuario en auth.users, se creará automáticamente su perfil en public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Usuario'),
    COALESCE(new.raw_user_meta_data->>'role', 'Entrenador')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar el trigger si ya existe para evitar errores y volver a crearlo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- INSTRUCCIONES PARA EL ADMINISTRADOR
-- ==========================================
-- Como acabas de ejecutar este script, ahora el sistema está preparado.
-- PARA CREAR TU CUENTA ADMIN (cuerpotecnico.sn@gmail.com):
-- 1. Ve al panel de Supabase > Authentication > Users
-- 2. Haz clic en "Add User" > "Create new user"
-- 3. Email: cuerpotecnico.sn@gmail.com
-- 4. Password: Sergionavarro79
-- 5. Auto Confirm User? SÍ (marcado).
-- 
-- Una vez lo crees, el Trigger de arriba creará tu fila en public.profiles.
-- Luego, ve a Supabase > Table Editor > profiles, busca tu usuario, 
-- y cámbiate el rol de 'Entrenador' a 'Admin'.
