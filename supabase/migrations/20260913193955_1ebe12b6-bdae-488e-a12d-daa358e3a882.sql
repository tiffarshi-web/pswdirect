
-- ── Provinces ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.provinces (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  bookings_enabled BOOLEAN NOT NULL DEFAULT false,
  provider_type TEXT NOT NULL DEFAULT 'PSW',
  provider_term_long TEXT NOT NULL DEFAULT 'Personal Support Worker',
  provider_term_short TEXT NOT NULL DEFAULT 'PSW',
  registration_required BOOLEAN NOT NULL DEFAULT false,
  registration_label TEXT,
  cities TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  policy_version TEXT NOT NULL DEFAULT 'v1',
  travel_zones JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_documents TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.provinces TO anon, authenticated;
GRANT ALL ON public.provinces TO service_role;
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read provinces" ON public.provinces;
CREATE POLICY "Anyone can read provinces" ON public.provinces FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage provinces" ON public.provinces;
CREATE POLICY "Admins manage provinces" ON public.provinces FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_provinces_updated_at BEFORE UPDATE ON public.provinces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.provinces (code, name, is_active, bookings_enabled, provider_type,
  provider_term_long, provider_term_short, registration_required, registration_label, cities, policy_version)
VALUES
  ('ON','Ontario', true, true, 'PSW','Personal Support Worker','PSW', false, NULL, ARRAY[]::text[], 'on-v1'),
  ('AB','Alberta', true, false, 'HCA','Health Care Aide','HCA', true,
   'Alberta HCA registration / practice permit number', ARRAY['Calgary']::text[], 'ab-v1')
ON CONFLICT (code) DO NOTHING;

-- ── Provincial pricing ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.provincial_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province TEXT NOT NULL REFERENCES public.provinces(code),
  city_or_zone TEXT NOT NULL DEFAULT 'default',
  service_id TEXT NOT NULL,
  client_hourly_price NUMERIC(10,2) NOT NULL,
  provider_hourly_payout NUMERIC(10,2) NOT NULL,
  minimum_booking_hours NUMERIC(4,2) NOT NULL DEFAULT 2,
  weekend_premium NUMERIC(10,2) NOT NULL DEFAULT 0,
  holiday_premium NUMERIC(10,2) NOT NULL DEFAULT 0,
  travel_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (province, city_or_zone, service_id)
);

GRANT SELECT ON public.provincial_pricing TO anon, authenticated;
GRANT ALL ON public.provincial_pricing TO service_role;
ALTER TABLE public.provincial_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active provincial pricing" ON public.provincial_pricing;
CREATE POLICY "Anyone can read active provincial pricing" ON public.provincial_pricing
  FOR SELECT USING (active = true OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage provincial pricing" ON public.provincial_pricing;
CREATE POLICY "Admins manage provincial pricing" ON public.provincial_pricing FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_provincial_pricing_updated_at BEFORE UPDATE ON public.provincial_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Provider profile provincial fields ───────────────────────────────────────
ALTER TABLE public.psw_profiles
  ADD COLUMN IF NOT EXISTS province TEXT NOT NULL DEFAULT 'ON',
  ADD COLUMN IF NOT EXISTS provider_type TEXT NOT NULL DEFAULT 'PSW',
  ADD COLUMN IF NOT EXISTS provincial_registration_number TEXT,
  ADD COLUMN IF NOT EXISTS registration_status TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS registration_expiry DATE,
  ADD COLUMN IF NOT EXISTS registration_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_verified_by UUID,
  ADD COLUMN IF NOT EXISTS eligible_for_jobs BOOLEAN NOT NULL DEFAULT true;

UPDATE public.psw_profiles SET province = 'ON' WHERE province IS NULL OR btrim(province) = '';
UPDATE public.psw_profiles SET provider_type = 'PSW' WHERE provider_type IS NULL OR btrim(provider_type) = '';

CREATE INDEX IF NOT EXISTS idx_psw_profiles_province ON public.psw_profiles (province);

-- ── Booking provincial fields ────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_province TEXT NOT NULL DEFAULT 'ON',
  ADD COLUMN IF NOT EXISTS service_city TEXT,
  ADD COLUMN IF NOT EXISTS pricing_region TEXT,
  ADD COLUMN IF NOT EXISTS required_provider_type TEXT NOT NULL DEFAULT 'PSW',
  ADD COLUMN IF NOT EXISTS provincial_policy_version TEXT;

UPDATE public.bookings SET service_province = 'ON' WHERE service_province IS NULL OR btrim(service_province) = '';
UPDATE public.bookings SET provincial_policy_version = 'on-v1' WHERE provincial_policy_version IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_service_province ON public.bookings (service_province);

-- ── Registration enforcement ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_provincial_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_required BOOLEAN;
BEGIN
  SELECT registration_required INTO v_required FROM public.provinces WHERE code = NEW.province;

  IF COALESCE(v_required, false) THEN
    IF NEW.registration_status IS NULL OR NEW.registration_status = 'not_required' THEN
      NEW.registration_status := 'pending';
    END IF;
    IF NEW.registration_status <> 'verified'
       OR NEW.registration_expiry IS NULL
       OR NEW.registration_expiry < CURRENT_DATE THEN
      NEW.eligible_for_jobs := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS psw_profiles_enforce_registration ON public.psw_profiles;
CREATE TRIGGER psw_profiles_enforce_registration
  BEFORE INSERT OR UPDATE ON public.psw_profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_provincial_registration();

-- Nightly-safe helper: suspend expired registrations
CREATE OR REPLACE FUNCTION public.suspend_expired_provincial_registrations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.psw_profiles p
     SET eligible_for_jobs = false,
         registration_status = CASE WHEN p.registration_status = 'verified' THEN 'expired' ELSE p.registration_status END
    FROM public.provinces pr
   WHERE pr.code = p.province
     AND pr.registration_required = true
     AND p.eligible_for_jobs = true
     AND (p.registration_expiry IS NULL OR p.registration_expiry < CURRENT_DATE
          OR p.registration_status <> 'verified');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.suspend_expired_provincial_registrations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_expired_provincial_registrations() TO service_role;

-- Registrations expiring soon (for renewal warnings)
CREATE OR REPLACE FUNCTION public.expiring_provincial_registrations(p_days INTEGER DEFAULT 30)
RETURNS TABLE(psw_id UUID, email TEXT, first_name TEXT, province TEXT, registration_expiry DATE, days_left INTEGER)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.first_name, p.province, p.registration_expiry,
         (p.registration_expiry - CURRENT_DATE)::int
  FROM public.psw_profiles p
  JOIN public.provinces pr ON pr.code = p.province AND pr.registration_required
  WHERE p.registration_expiry IS NOT NULL
    AND p.registration_expiry >= CURRENT_DATE
    AND p.registration_expiry <= CURRENT_DATE + (p_days || ' days')::interval;
$$;

REVOKE ALL ON FUNCTION public.expiring_provincial_registrations(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expiring_provincial_registrations(INTEGER) TO service_role;

-- ── Province-aware job matching ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._eligible_booking_ids_internal(p_psw_id uuid, p_radius_km numeric DEFAULT NULL::numeric)
 RETURNS TABLE(booking_id uuid, booking_code text, distance_km numeric, radius_km numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH cfg AS (
    SELECT COALESCE(p_radius_km, public.active_service_radius_km(), 75) AS radius
  ),
  psw AS (
    SELECT p.id, p.email, p.vetting_status,
           COALESCE(p.lifecycle_status, 'active') AS lifecycle_status,
           COALESCE(p.is_test, false) AS is_test,
           p.gender, p.has_own_transport,
           COALESCE(p.languages, ARRAY[]::text[]) AS languages,
           p.police_check_date,
           COALESCE(p.province, 'ON') AS province,
           COALESCE(p.provider_type, 'PSW') AS provider_type,
           COALESCE(p.eligible_for_jobs, true) AS eligible_for_jobs,
           loc.lat AS loc_lat,
           loc.lng AS loc_lng
    FROM public.psw_profiles p
    LEFT JOIN LATERAL public._dispatch_location_internal(p.id) loc ON true
    WHERE p.id = p_psw_id
  )
  SELECT b.id,
         b.booking_code,
         ROUND((6371 * acos(LEAST(1, GREATEST(-1,
           cos(radians(psw.loc_lat)) * cos(radians(b.service_latitude)) *
           cos(radians(b.service_longitude) - radians(psw.loc_lng)) +
           sin(radians(psw.loc_lat)) * sin(radians(b.service_latitude))
         ))))::numeric, 2) AS distance_km,
         cfg.radius
  FROM public.bookings b, psw, cfg
  WHERE
    psw.vetting_status = 'approved'
    AND psw.lifecycle_status = 'active'
    AND psw.eligible_for_jobs = true
    AND COALESCE(b.service_province, 'ON') = psw.province
    AND COALESCE(b.required_provider_type, 'PSW') = psw.provider_type
    AND NOT public.has_pending_account_deletion(psw.email)
    AND (psw.police_check_date IS NULL OR (psw.police_check_date + INTERVAL '1 year') >= CURRENT_DATE)
    AND psw.loc_lat IS NOT NULL AND psw.loc_lng IS NOT NULL
    AND b.status = 'pending'
    AND (b.psw_assigned IS NULL OR b.psw_assigned = '')
    AND (b.stripe_payment_intent_id IS NULL OR COALESCE(b.payment_status, '') = 'paid')
    AND COALESCE(b.recovered_from_payment_intent, false) = false
    AND (
      (b.scheduled_date + COALESCE(b.start_time, TIME '00:00'))
        AT TIME ZONE 'America/Toronto'
    ) > now()
    AND b.service_latitude IS NOT NULL AND b.service_longitude IS NOT NULL
    AND b.service_latitude BETWEEN 41.5 AND 60.0
    AND b.service_longitude BETWEEN -120.5 AND -74.0
    AND COALESCE(NULLIF(btrim(b.geocode_status), ''), 'success')
        NOT IN ('failed', 'pending', 'needs_review')
    AND (
      CASE WHEN psw.is_test
        THEN COALESCE(b.is_test_data, false) = true
             AND b.test_target_psw_id IS NOT NULL
             AND b.test_target_psw_id = psw.id
        ELSE COALESCE(b.is_test_data, false) = false
      END
    )
    AND (6371 * acos(LEAST(1, GREATEST(-1,
          cos(radians(psw.loc_lat)) * cos(radians(b.service_latitude)) *
          cos(radians(b.service_longitude) - radians(psw.loc_lng)) +
          sin(radians(psw.loc_lat)) * sin(radians(b.service_latitude))
        )))) <= cfg.radius
    AND (
      NOT public.booking_requires_vehicle(b.is_transport_booking, b.service_type)
      OR psw.has_own_transport = 'yes-car'
    )
    AND (
      COALESCE(b.preferred_gender, 'no-preference') = 'no-preference'
      OR b.created_at <= now() - INTERVAL '2 hours'
      OR (psw.gender IS NOT NULL
          AND psw.gender NOT IN ('prefer-not-to-say', 'other')
          AND psw.gender = b.preferred_gender)
    )
    AND (
      COALESCE(array_length(b.preferred_languages, 1), 0) = 0
      OR b.created_at <= now() - INTERVAL '2 hours'
      OR psw.languages && b.preferred_languages
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings c
      WHERE c.psw_assigned = p_psw_id::text
        AND c.id <> b.id
        AND c.scheduled_date = b.scheduled_date
        AND COALESCE(c.status, '') NOT IN ('cancelled', 'completed', 'archived')
        AND c.start_time IS NOT NULL AND c.end_time IS NOT NULL
        AND b.start_time IS NOT NULL AND b.end_time IS NOT NULL
        AND c.start_time < b.end_time
        AND b.start_time < c.end_time
    );
$function$;

-- ── Province waiting list (unsupported provinces) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.province_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  province TEXT,
  city TEXT,
  postal_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.province_waitlist TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.province_waitlist TO authenticated;
GRANT ALL ON public.province_waitlist TO service_role;
ALTER TABLE public.province_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can join the waitlist" ON public.province_waitlist;
CREATE POLICY "Anyone can join the waitlist" ON public.province_waitlist FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins read waitlist" ON public.province_waitlist;
CREATE POLICY "Admins read waitlist" ON public.province_waitlist FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins manage waitlist" ON public.province_waitlist;
CREATE POLICY "Admins manage waitlist" ON public.province_waitlist FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_province_waitlist_updated_at BEFORE UPDATE ON public.province_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
