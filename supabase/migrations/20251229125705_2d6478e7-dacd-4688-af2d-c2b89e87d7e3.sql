-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners as well
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;