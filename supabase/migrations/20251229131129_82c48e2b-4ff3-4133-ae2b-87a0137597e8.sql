-- Drop the vulnerable policy that allows users to update all columns
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create secure policy that prevents users from modifying approval_status
-- Uses subquery to ensure approval_status remains unchanged
CREATE POLICY "Users can update own profile"
ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  approval_status = (SELECT p.approval_status FROM public.profiles p WHERE p.user_id = auth.uid())
);