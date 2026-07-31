-- ============================================================
-- SINGLE SOURCE OF TRUTH FOR PSW JOB ELIGIBILITY
-- ============================================================

CREATE OR REPLACE FUNCTION public.active_service_radius_km()
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT NULLIF(btrim(setting_value), '')::numeric
       FROM public.app_settings
      WHERE setting_key = 'active_service_radius'
      LIMIT 1),
    75
  );
$$;

-- Transport requirement detection (shared)
CREATE OR REPLACE FUNCTION public.booking_requires_vehicle(p_is_transport boolean, p_service_type text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(p_is_transport, false)
      OR EXISTS (
        SELECT 1 FROM unnest(COALESCE(p_service_type, ARRAY[]::text[])) s
        WHERE lower(s) ~ '(doctor escort|hospital pick-?up|hospital drop-?off|appointment transportation|medical transport|doctor visit|hospital discharge)'
      );
$$;

-- Core eligibility: every (booking, psw) pair that passes ALL rules.
CREATE OR REPLACE FUNCTION public.psw_eligible_booking_ids(
  p_psw_id uuid,
  p_radius_km numeric DEFAULT NULL
)
RETURNS TABLE(booking_id uuid, booking_code text, distance_km numeric, radius_km numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH cfg AS (
    SELECT COALESCE(p_radius_km, public.active_service_radius_km(), 75) AS radius
  ),
  psw AS (
    SELECT p.id, p.home_lat, p.home_lng, p.vetting_status,
           COALESCE(p.lifecycle_status, 'active') AS lifecycle_status,
           COALESCE(p.is_test, false) AS is_test,
           p.gender, p.has_own_transport,
           COALESCE(p.languages, ARRAY[]::text[]) AS languages,
           p.police_check_date
    FROM public.psw_profiles p
    WHERE p.id = p_psw_id
  )
  SELECT b.id,
         b.booking_code,
         ROUND((6371 * acos(LEAST(1, GREATEST(-1,
           cos(radians(psw.home_lat)) * cos(radians(b.service_latitude)) *
           cos(radians(b.service_longitude) - radians(psw.home_lng)) +
           sin(radians(psw.home_lat)) * sin(radians(b.service_latitude))
         ))))::numeric, 2) AS distance_km,
         cfg.radius
  FROM public.bookings b, psw, cfg
  WHERE
    -- PSW lifecycle / approval
    psw.vetting_status = 'approved'
    AND psw.lifecycle_status = 'active'
    AND (psw.police_check_date IS NULL OR (psw.police_check_date + INTERVAL '1 year') >= CURRENT_DATE)
    AND psw.home_lat IS NOT NULL AND psw.home_lng IS NOT NULL
    -- Booking claimable
    AND b.status = 'pending'
    AND (b.psw_assigned IS NULL OR b.psw_assigned = '')
    AND (b.stripe_payment_intent_id IS NULL OR COALESCE(b.payment_status, '') = 'paid')
    AND COALESCE(b.recovered_from_payment_intent, false) = false
    -- Valid Ontario coordinates
    AND b.service_latitude IS NOT NULL AND b.service_longitude IS NOT NULL
    AND b.service_latitude BETWEEN 41.5 AND 57.0
    AND b.service_longitude BETWEEN -95.5 AND -74.0
    -- QA / production isolation
    AND (
      CASE WHEN psw.is_test
        THEN COALESCE(b.is_test_data, false) = true
             AND b.test_target_psw_id IS NOT NULL
             AND b.test_target_psw_id = psw.id
        ELSE COALESCE(b.is_test_data, false) = false
      END
    )
    -- Distance within active radius (inclusive)
    AND (6371 * acos(LEAST(1, GREATEST(-1,
          cos(radians(psw.home_lat)) * cos(radians(b.service_latitude)) *
          cos(radians(b.service_longitude) - radians(psw.home_lng)) +
          sin(radians(psw.home_lat)) * sin(radians(b.service_latitude))
        )))) <= cfg.radius
    -- Vehicle requirement for transport services
    AND (
      NOT public.booking_requires_vehicle(b.is_transport_booking, b.service_type)
      OR psw.has_own_transport = 'yes-car'
    )
    -- Gender preference: enforced for the first 2 hours after posting
    AND (
      COALESCE(b.preferred_gender, 'no-preference') = 'no-preference'
      OR b.created_at <= now() - INTERVAL '2 hours'
      OR (psw.gender IS NOT NULL
          AND psw.gender NOT IN ('prefer-not-to-say', 'other')
          AND psw.gender = b.preferred_gender)
    )
    -- Language preference: enforced for the first 2 hours after posting
    AND (
      COALESCE(array_length(b.preferred_languages, 1), 0) = 0
      OR b.created_at <= now() - INTERVAL '2 hours'
      OR psw.languages && b.preferred_languages
    );
$$;

-- Count = exactly the same list (badge/feed parity guaranteed).
CREATE OR REPLACE FUNCTION public.count_available_jobs_for_psw(
  p_psw_id uuid,
  p_radius_km numeric DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::int FROM public.psw_eligible_booking_ids(p_psw_id, p_radius_km);
$$;

-- Reverse direction: eligible PSWs for one booking (dispatch / notifications).
CREATE OR REPLACE FUNCTION public.eligible_psws_for_booking(
  p_booking_id uuid,
  p_radius_km numeric DEFAULT NULL
)
RETURNS TABLE(psw_id uuid, email text, first_name text, distance_km numeric, radius_km numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.email, p.first_name, e.distance_km, e.radius_km
  FROM public.psw_profiles p
  CROSS JOIN LATERAL public.psw_eligible_booking_ids(p.id, p_radius_km) e
  WHERE e.booking_id = p_booking_id;
$$;

REVOKE ALL ON FUNCTION public.psw_eligible_booking_ids(uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.eligible_psws_for_booking(uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.count_available_jobs_for_psw(uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.active_service_radius_km() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.active_service_radius_km() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.booking_requires_vehicle(boolean, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.psw_eligible_booking_ids(uuid, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_available_jobs_for_psw(uuid, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.eligible_psws_for_booking(uuid, numeric) TO service_role;