-- ============================================================
-- PRODUCTION RLS SECURITY HARDENING
-- Healthcare Platform - Role-Based Access Control
-- ============================================================

-- ============================================================
-- 1. DROP OVERLY PERMISSIVE POLICIES
-- ============================================================

-- payroll_entries: Remove all "Anyone can..." policies
DROP POLICY IF EXISTS "Anyone can delete payroll entries" ON public.payroll_entries;
DROP POLICY IF EXISTS "Anyone can insert payroll entries" ON public.payroll_entries;
DROP POLICY IF EXISTS "Anyone can read payroll entries" ON public.payroll_entries;
DROP POLICY IF EXISTS "Anyone can update payroll entries" ON public.payroll_entries;

-- pricing_settings: Remove all "Anyone can..." policies
DROP POLICY IF EXISTS "Anyone can delete pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Anyone can insert pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Anyone can update pricing settings" ON public.pricing_settings;

-- refund_logs: Remove overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert refund logs" ON public.refund_logs;
DROP POLICY IF EXISTS "Anyone can read refund logs" ON public.refund_logs;
DROP POLICY IF EXISTS "Anyone can update refund logs" ON public.refund_logs;

-- bookings: Remove overly permissive policies
DROP POLICY IF EXISTS "Allow booking updates for completion" ON public.bookings;
DROP POLICY IF EXISTS "Public can read bookings by email match" ON public.bookings;

-- email_logs: Remove overly permissive policies
DROP POLICY IF EXISTS "Anyone can view email logs" ON public.email_logs;

-- ============================================================
-- 2. CREATE PROPER ROLE-BASED POLICIES
-- ============================================================

-- PAYROLL_ENTRIES: PSWs can view their own entries
CREATE POLICY "PSWs can view their own payroll entries"
ON public.payroll_entries FOR SELECT
TO authenticated
USING (
  psw_id IN (
    SELECT id::text FROM public.psw_profiles 
    WHERE email = (auth.jwt() ->> 'email')
  )
);

-- PRICING_SETTINGS: Keep public read (needed for booking flow)
-- Already has "Anyone can read pricing settings" which is appropriate for public pricing

-- REFUND_LOGS: Only admins should access (already have admin policies)
-- No additional policies needed - admin-only access is correct

-- BOOKINGS: PSWs can view and update their assigned bookings
CREATE POLICY "PSWs can view assigned bookings"
ON public.bookings FOR SELECT
TO authenticated
USING (
  psw_assigned IN (
    SELECT id::text FROM public.psw_profiles 
    WHERE email = (auth.jwt() ->> 'email')
  )
);

CREATE POLICY "PSWs can update assigned bookings"
ON public.bookings FOR UPDATE
TO authenticated
USING (
  psw_assigned IN (
    SELECT id::text FROM public.psw_profiles 
    WHERE email = (auth.jwt() ->> 'email')
  )
)
WITH CHECK (
  psw_assigned IN (
    SELECT id::text FROM public.psw_profiles 
    WHERE email = (auth.jwt() ->> 'email')
  )
);

-- EMAIL_LOGS: Users can view emails sent to them
CREATE POLICY "Users can view their own email logs"
ON public.email_logs FOR SELECT
TO authenticated
USING (recipient_email = (auth.jwt() ->> 'email'));

-- ============================================================
-- 3. VERIFY RLS IS ENABLED ON ALL TABLES
-- ============================================================
-- (These are idempotent - safe to run even if already enabled)

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psw_banking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psw_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psw_status_audit ENABLE ROW LEVEL SECURITY;