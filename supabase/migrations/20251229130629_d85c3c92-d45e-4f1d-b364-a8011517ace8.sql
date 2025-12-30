-- Force RLS on user_roles table (defense in depth)
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- Revoke all privileges from anonymous and public roles
REVOKE ALL ON TABLE public.user_roles FROM anon;
REVOKE ALL ON TABLE public.user_roles FROM PUBLIC;

-- Grant explicit privileges only to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_roles TO authenticated;