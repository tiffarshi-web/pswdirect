
-- Lock down suppressed_emails: only admins via UI; edge functions use service role (bypasses RLS)
DROP POLICY IF EXISTS "Allow read access to suppressed_emails" ON public.suppressed_emails;
DROP POLICY IF EXISTS "Allow insert to suppressed_emails" ON public.suppressed_emails;
DROP POLICY IF EXISTS "Allow delete from suppressed_emails" ON public.suppressed_emails;

CREATE POLICY "Admins can read suppressed emails"
  ON public.suppressed_emails FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert suppressed emails"
  ON public.suppressed_emails FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete suppressed emails"
  ON public.suppressed_emails FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Lock down notification_queue INSERT: edge functions use service role (bypasses RLS)
DROP POLICY IF EXISTS "Anyone can enqueue notifications" ON public.notification_queue;

CREATE POLICY "Authenticated can enqueue notifications"
  ON public.notification_queue FOR INSERT TO authenticated
  WITH CHECK (true);

-- Fix SECURITY DEFINER views: switch to security_invoker so RLS of caller applies
ALTER VIEW public.psw_safe_booking_view SET (security_invoker = on);
ALTER VIEW public.psw_public_directory SET (security_invoker = on);
