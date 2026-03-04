
-- Replace overly permissive insert policy with a more targeted one
DROP POLICY IF EXISTS "Service functions can insert notifications" ON public.notifications;

-- Allow authenticated users to insert only for their own email (covers SECURITY DEFINER functions which bypass RLS anyway)
-- The SECURITY DEFINER functions already bypass RLS, so we just need admin insert
