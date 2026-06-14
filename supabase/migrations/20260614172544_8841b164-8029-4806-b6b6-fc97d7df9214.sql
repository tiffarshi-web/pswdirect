
DROP POLICY IF EXISTS "Settings are publicly readable" ON public.app_settings;

CREATE POLICY "Public can read safe app settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (
  setting_key IN (
    'office_number',
    'active_service_radius',
    'asap_lead_time_minutes',
    'asap_multiplier',
    'asap_pricing_enabled',
    'category_rates',
    'flexible_hours_enabled',
    'stripe_publishable_key'
  )
);

DROP POLICY IF EXISTS "PSW self-update cannot change admin fields" ON public.psw_profiles;

CREATE POLICY "PSW self-update cannot change admin fields"
ON public.psw_profiles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
WITH CHECK (
  is_admin()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.psw_profiles p
    WHERE p.id = psw_profiles.id
      AND p.vetting_status IS NOT DISTINCT FROM psw_profiles.vetting_status
      AND p.vetting_notes IS NOT DISTINCT FROM psw_profiles.vetting_notes
      AND p.approved_at IS NOT DISTINCT FROM psw_profiles.approved_at
      AND p.lifecycle_status IS NOT DISTINCT FROM psw_profiles.lifecycle_status
      AND p.banned_at IS NOT DISTINCT FROM psw_profiles.banned_at
      AND p.flag_count IS NOT DISTINCT FROM psw_profiles.flag_count
      AND p.cancel_count IS NOT DISTINCT FROM psw_profiles.cancel_count
      AND p.rejection_reasons IS NOT DISTINCT FROM psw_profiles.rejection_reasons
      AND p.gov_id_status IS NOT DISTINCT FROM psw_profiles.gov_id_status
      AND p.psw_cert_status IS NOT DISTINCT FROM psw_profiles.psw_cert_status
  )
);

DROP POLICY IF EXISTS "Booking sensitive columns admin or psw only" ON public.bookings;

CREATE POLICY "Booking sensitive columns admin or psw only"
ON public.bookings
AS RESTRICTIVE
FOR UPDATE
TO authenticated
WITH CHECK (
  is_admin()
  OR (psw_assigned IN (
        SELECT (p.id)::text FROM public.psw_profiles p
        WHERE p.email = (auth.jwt() ->> 'email')
     ))
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = bookings.id
      AND b.total IS NOT DISTINCT FROM bookings.total
      AND b.subtotal IS NOT DISTINCT FROM bookings.subtotal
      AND b.hourly_rate IS NOT DISTINCT FROM bookings.hourly_rate
      AND b.surge_amount IS NOT DISTINCT FROM bookings.surge_amount
      AND b.hst_amount IS NOT DISTINCT FROM bookings.hst_amount
      AND b.payment_status IS NOT DISTINCT FROM bookings.payment_status
      AND b.stripe_payment_intent_id IS NOT DISTINCT FROM bookings.stripe_payment_intent_id
      AND b.stripe_customer_id IS NOT DISTINCT FROM bookings.stripe_customer_id
      AND b.psw_assigned IS NOT DISTINCT FROM bookings.psw_assigned
      AND b.status IS NOT DISTINCT FROM bookings.status
  )
);
