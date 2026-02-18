
-- Create is_admin() function that checks admin_invitations
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_invitations
    WHERE email = (auth.jwt() ->> 'email')
      AND status = 'accepted'
      AND accepted_at IS NOT NULL
      AND expires_at > now()
  )
  OR public.has_role(auth.uid(), 'admin')
$$;

-- Drop and recreate psw_profiles admin policies to also use is_admin()
DROP POLICY IF EXISTS "Admins can read all PSW profiles" ON public.psw_profiles;
CREATE POLICY "Admins can read all PSW profiles"
  ON public.psw_profiles FOR SELECT
  USING (public.is_admin() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all PSW profiles" ON public.psw_profiles;
CREATE POLICY "Admins can update all PSW profiles"
  ON public.psw_profiles FOR UPDATE
  USING (public.is_admin() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert PSW profiles" ON public.psw_profiles;
CREATE POLICY "Admins can insert PSW profiles"
  ON public.psw_profiles FOR INSERT
  WITH CHECK (public.is_admin() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete PSW profiles" ON public.psw_profiles;
CREATE POLICY "Admins can delete PSW profiles"
  ON public.psw_profiles FOR DELETE
  USING (public.is_admin() OR has_role(auth.uid(), 'admin'::app_role));

-- Update psw_status_audit policies to also use is_admin()
DROP POLICY IF EXISTS "Admins can create audit logs" ON public.psw_status_audit;
CREATE POLICY "Admins can create audit logs"
  ON public.psw_status_audit FOR INSERT
  WITH CHECK (public.is_admin() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.psw_status_audit;
CREATE POLICY "Admins can view all audit logs"
  ON public.psw_status_audit FOR SELECT
  USING (public.is_admin() OR has_role(auth.uid(), 'admin'::app_role));

-- Update notification_queue insert policy for admins (keep the "Anyone can enqueue" for PSW signup)
DROP POLICY IF EXISTS "Admins can insert notification queue" ON public.notification_queue;
CREATE POLICY "Admins can insert notification queue"
  ON public.notification_queue FOR INSERT
  WITH CHECK (public.is_admin() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can read notification queue" ON public.notification_queue;
CREATE POLICY "Admins can read notification queue"
  ON public.notification_queue FOR SELECT
  USING (public.is_admin() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update notification queue" ON public.notification_queue;
CREATE POLICY "Admins can update notification queue"
  ON public.notification_queue FOR UPDATE
  USING (public.is_admin() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete notification queue" ON public.notification_queue;
CREATE POLICY "Admins can delete notification queue"
  ON public.notification_queue FOR DELETE
  USING (public.is_admin() OR has_role(auth.uid(), 'admin'::app_role));
