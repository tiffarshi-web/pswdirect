
-- Remove anon-targeted "Service can insert/update" policies; edge functions use service_role which bypasses RLS

DROP POLICY IF EXISTS "Service can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Service can insert overtime charges" ON public.overtime_charges;
DROP POLICY IF EXISTS "Service can insert unreconciled payments" ON public.unreconciled_payments;
DROP POLICY IF EXISTS "Service can insert dispatch logs" ON public.dispatch_logs;
DROP POLICY IF EXISTS "Service can update dispatch logs" ON public.dispatch_logs;
DROP POLICY IF EXISTS "Service can insert communication sessions" ON public.communication_sessions;
DROP POLICY IF EXISTS "Service can update communication sessions" ON public.communication_sessions;

-- PSW signup: require authenticated session; edge function `register-psw` uses service_role and bypasses RLS.
DROP POLICY IF EXISTS "Allow PSW profile application signup" ON public.psw_profiles;
CREATE POLICY "Authenticated users can create their own PSW profile"
ON public.psw_profiles
FOR INSERT
TO authenticated
WITH CHECK (email = (auth.jwt() ->> 'email'));
