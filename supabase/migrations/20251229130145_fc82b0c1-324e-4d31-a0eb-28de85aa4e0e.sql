-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Recreate policies as PERMISSIVE and scoped to authenticated only
DO $$
BEGIN
  -- Drop existing policies (names contain spaces)
  EXECUTE 'DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles';
END $$;

-- Admin policies
CREATE POLICY "Admins can view all profiles"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update any profile"
ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete profiles"
ON public.profiles
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- User self-service policies
CREATE POLICY "Users can view own profile"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure no public/anon access at the privilege layer
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.profiles FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;