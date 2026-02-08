-- ============================================================
-- FIX REMAINING SECURITY ISSUES
-- ============================================================

-- 1. Fix SECURITY DEFINER VIEW issue - recreate profiles view with security_invoker
DROP VIEW IF EXISTS public.profiles;
CREATE VIEW public.profiles
WITH (security_invoker = on)
AS SELECT 
  id,
  user_id,
  created_at,
  updated_at,
  email,
  full_name,
  first_name,
  phone,
  default_address,
  default_postal_code
FROM public.client_profiles;

-- 2. Fix remaining permissive INSERT/UPDATE policies

-- Drop overly permissive policies on psw_profiles
DROP POLICY IF EXISTS "Anyone can create a PSW profile application" ON public.psw_profiles;

-- Recreate PSW signup policy - allow authenticated OR anon users to create PSW applications
-- This is needed for signup flow but we track via email
CREATE POLICY "Allow PSW profile application signup"
ON public.psw_profiles FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Allow insert only if email matches the auth email (for authenticated)
  -- OR if it's an anonymous signup (email will be verified via auth)
  (auth.jwt() IS NULL) OR (email = (auth.jwt() ->> 'email'))
);

-- Drop overly permissive policies on bookings
DROP POLICY IF EXISTS "Allow guest bookings" ON public.bookings;

-- Recreate guest booking policy with email validation
CREATE POLICY "Allow guest bookings with email"
ON public.bookings FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Guest bookings must have client_email set
  client_email IS NOT NULL AND client_email != ''
);

-- Drop overly permissive email_logs insert
DROP POLICY IF EXISTS "Service can insert email logs" ON public.email_logs;

-- Email logs should only be inserted by authenticated service/admin
CREATE POLICY "Service role can insert email logs"
ON public.email_logs FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Drop overly permissive service_tasks policies
DROP POLICY IF EXISTS "Authenticated users can delete service tasks" ON public.service_tasks;
DROP POLICY IF EXISTS "Authenticated users can insert service tasks" ON public.service_tasks;
DROP POLICY IF EXISTS "Authenticated users can update service tasks" ON public.service_tasks;

-- Drop overly permissive pricing_configs policies
DROP POLICY IF EXISTS "Authenticated users can insert pricing configs" ON public.pricing_configs;
DROP POLICY IF EXISTS "Authenticated users can update pricing configs" ON public.pricing_configs;