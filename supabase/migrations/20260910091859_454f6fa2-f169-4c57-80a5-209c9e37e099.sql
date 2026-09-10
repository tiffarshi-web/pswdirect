-- ============================================================
-- Location-based shift matching
-- ============================================================

-- 1. Verified caregiver locations (one authoritative row per caregiver)
CREATE TABLE IF NOT EXISTS public.psw_verified_locations (
  psw_id uuid PRIMARY KEY,
  latitude numeric(10,8) NOT NULL,
  longitude numeric(11,8) NOT NULL,
  accuracy_m numeric,
  source text NOT NULL DEFAULT 'device',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.psw_verified_locations TO authenticated;
GRANT ALL ON public.psw_verified_locations TO service_role;

ALTER TABLE public.psw_verified_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PSWs read only their own verified location" ON public.psw_verified_locations;
CREATE POLICY "PSWs read only their own verified location"
ON public.psw_verified_locations FOR SELECT TO authenticated
USING (
  psw_id IN (
    SELECT p.id FROM public.psw_profiles p
    WHERE lower(btrim(p.email)) = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
  )
);

DROP POLICY IF EXISTS "Admins read all verified locations" ON public.psw_verified_locations;
CREATE POLICY "Admins read all verified locations"
ON public.psw_verified_locations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage verified locations" ON public.psw_verified_locations;
CREATE POLICY "Admins manage verified locations"
ON public.psw_verified_locations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_psw_verified_locations_recorded_at
  ON public.psw_verified_locations (recorded_at DESC);

DROP TRIGGER IF EXISTS trg_psw_verified_locations_updated_at ON public.psw_verified_locations;
CREATE TRIGGER trg_psw_verified_locations_updated_at
BEFORE UPDATE ON public.psw_verified_locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Administrator-controlled location expiry (hours)
CREATE OR REPLACE FUNCTION public.dispatch_location_max_age_hours()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT NULLIF(btrim(setting_value), '')::numeric
       FROM public.app_settings
      WHERE setting_key = 'location_max_age_hours'
      LIMIT 1),
    24
  );
$$;

GRANT EXECUTE ON FUNCTION public.dispatch_location_max_age_hours() TO authenticated, anon, service_role;

-- 3. Effective dispatch location for a caregiver
--    Uses the most recent device-verified position when it is still trusted,
--    otherwise the caregiver's verified home address coordinates.
CREATE OR REPLACE FUNCTION public.psw_dispatch_location(p_psw_id uuid)
RETURNS TABLE(lat numeric, lng numeric, source text, age_hours numeric, is_fresh boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH cfg AS (SELECT public.dispatch_location_max_age_hours() AS max_age),
  v AS (
    SELECT l.latitude, l.longitude, l.recorded_at,
           EXTRACT(EPOCH FROM (now() - l.recorded_at)) / 3600.0 AS age_hours
    FROM public.psw_verified_locations l
    WHERE l.psw_id = p_psw_id
      AND l.latitude BETWEEN -90 AND 90
      AND l.longitude BETWEEN -180 AND 180
      AND NOT (l.latitude = 0 AND l.longitude = 0)
  ),
  h AS (SELECT p.home_lat, p.home_lng FROM public.psw_profiles p WHERE p.id = p_psw_id)
  SELECT
    CASE WHEN v.latitude IS NOT NULL AND v.age_hours <= cfg.max_age THEN v.latitude ELSE h.home_lat END,
    CASE WHEN v.latitude IS NOT NULL AND v.age_hours <= cfg.max_age THEN v.longitude ELSE h.home_lng END,
    CASE WHEN v.latitude IS NOT NULL AND v.age_hours <= cfg.max_age THEN 'device'
         WHEN h.home_lat IS NOT NULL THEN 'home_address'
         ELSE 'none' END,
    ROUND(v.age_hours::numeric, 2),
    COALESCE(v.age_hours <= cfg.max_age, false)
  FROM cfg
  LEFT JOIN h ON true
  LEFT JOIN v ON true;
$$;

GRANT EXECUTE ON FUNCTION public.psw_dispatch_location(uuid) TO authenticated, service_role;

-- 4. Server-authoritative location recording. The caller cannot choose the
--    caregiver: it is resolved from the verified session e-mail.
CREATE OR REPLACE FUNCTION public.record_psw_location(
  p_lat numeric,
  p_lng numeric,
  p_accuracy_m numeric DEFAULT NULL,
  p_source text DEFAULT 'device'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
  v_psw   public.psw_profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'session_expired');
  END IF;

  IF p_lat IS NULL OR p_lng IS NULL
     OR p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180
     OR (p_lat = 0 AND p_lng = 0) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_coordinates');
  END IF;

  v_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  SELECT * INTO v_psw FROM public.psw_profiles p
   WHERE lower(btrim(p.email)) = v_email
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'psw_not_found');
  END IF;

  INSERT INTO public.psw_verified_locations (psw_id, latitude, longitude, accuracy_m, source, recorded_at)
  VALUES (v_psw.id, round(p_lat, 8), round(p_lng, 8), p_accuracy_m,
          COALESCE(NULLIF(btrim(p_source), ''), 'device'), now())
  ON CONFLICT (psw_id) DO UPDATE
    SET latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        accuracy_m = EXCLUDED.accuracy_m,
        source = EXCLUDED.source,
        recorded_at = now(),
        updated_at = now();

  RETURN jsonb_build_object('ok', true, 'psw_id', v_psw.id, 'recorded_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_psw_location(numeric, numeric, numeric, text) TO authenticated, service_role;

-- 5. Eligibility now measured from the effective dispatch location.
CREATE OR REPLACE FUNCTION public.psw_eligible_booking_ids(
  p_psw_id uuid,
  p_radius_km numeric DEFAULT NULL
)
RETURNS TABLE(booking_id uuid, booking_code text, distance_km numeric, radius_km numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
           loc.lat AS loc_lat,
           loc.lng AS loc_lng
    FROM public.psw_profiles p
    LEFT JOIN LATERAL public.psw_dispatch_location(p.id) loc ON true
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
    AND b.service_latitude BETWEEN 41.5 AND 57.0
    AND b.service_longitude BETWEEN -95.5 AND -74.0
    -- Addresses that could not be geocoded confidently are never auto-dispatched;
    -- they surface in the administrator review queue instead.
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
    -- No conflicting accepted shift
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
$$;

-- 6. Administrator dispatch candidate list (never exposed to caregivers)
CREATE OR REPLACE FUNCTION public.admin_dispatch_candidates(p_booking_id uuid)
RETURNS TABLE(
  psw_id uuid,
  psw_number text,
  first_name text,
  last_name text,
  latitude numeric,
  longitude numeric,
  location_source text,
  location_age_hours numeric,
  location_is_fresh boolean,
  distance_km numeric,
  radius_km numeric,
  is_eligible boolean,
  exclusion_reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_radius numeric := public.active_service_radius_km();
  v_b public.bookings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.psw_number::text,
    p.first_name,
    p.last_name,
    loc.lat,
    loc.lng,
    loc.source,
    loc.age_hours,
    loc.is_fresh,
    CASE WHEN loc.lat IS NULL OR v_b.service_latitude IS NULL THEN NULL
      ELSE ROUND((6371 * acos(LEAST(1, GREATEST(-1,
        cos(radians(loc.lat)) * cos(radians(v_b.service_latitude)) *
        cos(radians(v_b.service_longitude) - radians(loc.lng)) +
        sin(radians(loc.lat)) * sin(radians(v_b.service_latitude))
      ))))::numeric, 2) END,
    v_radius,
    EXISTS (SELECT 1 FROM public.psw_eligible_booking_ids(p.id) e WHERE e.booking_id = p_booking_id),
    CASE
      WHEN p.vetting_status <> 'approved' THEN 'not_approved'
      WHEN COALESCE(p.lifecycle_status, 'active') <> 'active' THEN 'suspended_or_inactive'
      WHEN public.has_pending_account_deletion(p.email) THEN 'account_deletion_requested'
      WHEN p.police_check_date IS NOT NULL AND (p.police_check_date + INTERVAL '1 year') < CURRENT_DATE THEN 'police_check_expired'
      WHEN loc.lat IS NULL THEN 'no_usable_location'
      WHEN v_b.service_latitude IS NULL THEN 'booking_not_geocoded'
      WHEN (6371 * acos(LEAST(1, GREATEST(-1,
             cos(radians(loc.lat)) * cos(radians(v_b.service_latitude)) *
             cos(radians(v_b.service_longitude) - radians(loc.lng)) +
             sin(radians(loc.lat)) * sin(radians(v_b.service_latitude))
           )))) > v_radius THEN 'outside_radius'
      WHEN public.booking_requires_vehicle(v_b.is_transport_booking, v_b.service_type)
           AND COALESCE(p.has_own_transport, '') <> 'yes-car' THEN 'no_vehicle'
      WHEN EXISTS (
        SELECT 1 FROM public.bookings c
        WHERE c.psw_assigned = p.id::text
          AND c.id <> p_booking_id
          AND c.scheduled_date = v_b.scheduled_date
          AND COALESCE(c.status, '') NOT IN ('cancelled', 'completed', 'archived')
          AND c.start_time IS NOT NULL AND c.end_time IS NOT NULL
          AND v_b.start_time IS NOT NULL AND v_b.end_time IS NOT NULL
          AND c.start_time < v_b.end_time
          AND v_b.start_time < c.end_time
      ) THEN 'schedule_conflict'
      WHEN NOT EXISTS (SELECT 1 FROM public.psw_eligible_booking_ids(p.id) e WHERE e.booking_id = p_booking_id)
        THEN 'other_matching_rule'
      ELSE NULL
    END
  FROM public.psw_profiles p
  LEFT JOIN LATERAL public.psw_dispatch_location(p.id) loc ON true
  WHERE COALESCE(p.is_test, false) = COALESCE(v_b.is_test_data, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_dispatch_candidates(uuid) TO authenticated, service_role;

-- 7. Administrator review queue for addresses that cannot be dispatched
CREATE OR REPLACE FUNCTION public.admin_geocode_review_queue()
RETURNS TABLE(
  booking_id uuid,
  booking_code text,
  scheduled_date date,
  start_time time,
  patient_address text,
  patient_postal_code text,
  service_latitude numeric,
  service_longitude numeric,
  geocode_status text,
  geocode_source text,
  reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT b.id, b.booking_code, b.scheduled_date, b.start_time,
         b.patient_address, b.patient_postal_code,
         b.service_latitude, b.service_longitude,
         b.geocode_status, b.geocode_source,
         CASE
           WHEN b.service_latitude IS NULL OR b.service_longitude IS NULL THEN 'missing_coordinates'
           WHEN COALESCE(NULLIF(btrim(b.geocode_status), ''), 'success') IN ('failed','pending','needs_review') THEN 'geocode_not_confident'
           WHEN b.service_latitude NOT BETWEEN 41.5 AND 57.0
             OR b.service_longitude NOT BETWEEN -95.5 AND -74.0 THEN 'outside_service_province'
           ELSE 'low_confidence_fallback'
         END
  FROM public.bookings b
  WHERE COALESCE(b.is_test_data, false) = false
    AND b.status IN ('pending', 'active')
    AND (b.psw_assigned IS NULL OR b.psw_assigned = '')
    AND (
      b.service_latitude IS NULL OR b.service_longitude IS NULL
      OR COALESCE(NULLIF(btrim(b.geocode_status), ''), 'success') IN ('failed','pending','needs_review')
      OR b.service_latitude NOT BETWEEN 41.5 AND 57.0
      OR b.service_longitude NOT BETWEEN -95.5 AND -74.0
      OR COALESCE(b.geocode_status, '') = 'city_fallback'
    )
  ORDER BY b.scheduled_date ASC NULLS LAST, b.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_geocode_review_queue() TO authenticated, service_role;