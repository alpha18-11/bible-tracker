-- Enable RLS on profiles table (this is the critical fix)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners as well
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;