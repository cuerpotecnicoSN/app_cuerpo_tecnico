-- Create the profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'Entrenador',
    avatar_url TEXT,
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow reading for everyone
DROP POLICY IF EXISTS "Allow anonymous read profiles" ON public.profiles;
CREATE POLICY "Allow anonymous read profiles" ON public.profiles FOR SELECT USING (true);

-- Allow updates/inserts
DROP POLICY IF EXISTS "Allow anonymous update profiles" ON public.profiles;
CREATE POLICY "Allow anonymous update profiles" ON public.profiles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert profiles" ON public.profiles;
CREATE POLICY "Allow anonymous insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
