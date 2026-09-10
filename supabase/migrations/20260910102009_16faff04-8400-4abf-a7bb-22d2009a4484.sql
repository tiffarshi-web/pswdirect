
-- 1) Privacy-conscious location audit history (approximate coordinates only)
CREATE TABLE IF NOT EXISTS public.psw_location_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psw_id uuid NOT NULL,
  approx_latitude numeric,
  approx_longitude numeric,
  accuracy_m numeric,
  source text,
  distance_from_previous_km numeric,
  seconds_since_previous numeric,
  implied_speed_kmh numeric,
  accepted boolean NOT NULL DEFAULT true,
  flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.psw_location_audit TO authenticated;
GRANT ALL ON public.psw_location_audit TO service_role;

ALTER TABLE public.psw_location_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read location audit" ON public.psw_location_audit;
CREATE POLICY "Admins read location audit"
  ON public.psw_location_audit FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_psw_location_audit_psw_recorded
  ON public.psw_location_audit (psw_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_psw_location_audit_flagged
  ON public.psw_location_audit (flagged, recorded_at DESC) WHERE flagged;

-- 2) Shared authorization predicate for dispatch-location reads
CREATE OR REPLACE FUNCTION public.can_view_psw_dispatch(p_psw_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(auth.role(), '') = 'service_role'
      OR (
        auth.uid() IS NOT NULL
        AND (
          public.is_admin()
          OR (p_psw_id IS NOT NULL AND p_psw_id::text = public.current_psw_profile_id())
        )
      );
$$;

REVOKE ALL ON FUNCTION public.can_view_psw_dispatch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_psw_dispatch(uuid) TO authenticated, service_role;

-- 3) Internal effective location: recent verified device position ONLY.
--    The silent home-address fallback is removed: a stale or missing device
--    location yields no usable location, so the caregiver must refresh.
CREATE OR REPLACE FUNCTION public._dispatch_location_internal(p_psw_id uuid)
RETURNS TABLE(lat numeric, lng numeric, source text, age_hours numeric, is_fresh boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH cfg AS (SELECT public.dispatch_location_max_age_hours() AS max_age),
  v AS (
    SELECT l.latitude, l.longitude,
           EXTRACT(EPOCH FROM (now() - l.recorded_at)) / 3600.0 AS age_hours
    FROM public.psw_verified_locations l
    WHERE l.psw_id = p_psw_id
      AND l.latitude BETWEEN -90 AND 90
      AND l.longitude BETWEEN -180 AND 180
      AND NOT (l.latitude = 0 AND l.longitude = 0)
  )
  SELECT
    CASE WHEN v.age_hours <= cfg.max_age THEN v.latitude END,
    CASE WHEN v.age_hours <= cfg.max_age THEN v.longitude END,
    CASE WHEN v.age_hours <= cfg.max_age THEN 'device'
         WHEN v.age_hours IS NOT NULL THEN 'expired'
         ELSE 'none' END,
    ROUND(v.age_hours::numeric, 2),
    COALESCE(v.age_hours <= cfg.max_age, false)
  FROM cfg LEFT JOIN v ON true;
$$;

REVOKE ALL ON FUNCTION public._dispatch_location_internal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._dispatch_location_internal(uuid) TO service_role;

-- 4) Public location lookup is now authorization-checked (self or administrator)
CREATE OR REPLACE FUNCTION public.psw_dispatch_location(p_psw_id uuid)
RETURNS TABLE(lat numeric, lng numeric, source text, age_hours numeric, is_fresh boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.can_view_psw_dispatch(p_psw_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY SELECT * FROM public._dispatch_location_internal(p_psw_id);
END;
$$;

REVOKE ALL ON FUNCTION public.psw_dispatch_location(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psw_dispatch_location(uuid) TO authenticated, service_role;

-- 5) Eligibility: internal body + authorization-checked public wrapper
CREATE OR REPLACE FUNCTION public._eligible_booking_ids_internal(p_psw_id uuid, p_radius_km numeric DEFAULT NULL)
RETURNS TABLE(booking_id uuid, booking_code text, distance_km numeric, radius_km numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
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
$$;

REVOKE ALL ON FUNCTION public._eligible_booking_ids_internal(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._eligible_booking_ids_internal(uuid, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.psw_eligible_booking_ids(p_psw_id uuid, p_radius_km numeric DEFAULT NULL)
RETURNS TABLE(booking_id uuid, booking_code text, distance_km numeric, radius_km numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.can_view_psw_dispatch(p_psw_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY SELECT * FROM public._eligible_booking_ids_internal(p_psw_id, p_radius_km);
END;
$$;

REVOKE ALL ON FUNCTION public.psw_eligible_booking_ids(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psw_eligible_booking_ids(uuid, numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.count_available_jobs_for_psw(p_psw_id uuid, p_radius_km numeric DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT public.can_view_psw_dispatch(p_psw_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT COUNT(*)::int INTO v_count
  FROM public._eligible_booking_ids_internal(p_psw_id, p_radius_km);
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.count_available_jobs_for_psw(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_available_jobs_for_psw(uuid, numeric) TO authenticated, service_role;

-- 6) Administrator dispatch map uses the internal helpers (already admin-gated)
CREATE OR REPLACE FUNCTION public.admin_dispatch_candidates(p_booking_id uuid)
RETURNS TABLE(psw_id uuid, psw_number text, first_name text, last_name text, latitude numeric, longitude numeric, location_source text, location_age_hours numeric, location_is_fresh boolean, distance_km numeric, radius_km numeric, is_eligible boolean, exclusion_reason text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_radius numeric := public.active_service_radius_km();
  v_b public.bookings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = 'insufficient_privilege';
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
    EXISTS (SELECT 1 FROM public._eligible_booking_ids_internal(p.id) e WHERE e.booking_id = p_booking_id),
    CASE
      WHEN p.vetting_status <> 'approved' THEN 'not_approved'
      WHEN COALESCE(p.lifecycle_status, 'active') <> 'active' THEN 'suspended_or_inactive'
      WHEN public.has_pending_account_deletion(p.email) THEN 'account_deletion_requested'
      WHEN p.police_check_date IS NOT NULL AND (p.police_check_date + INTERVAL '1 year') < CURRENT_DATE THEN 'police_check_expired'
      WHEN loc.source = 'expired' THEN 'location_expired'
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
      WHEN NOT EXISTS (SELECT 1 FROM public._eligible_booking_ids_internal(p.id) e WHERE e.booking_id = p_booking_id)
        THEN 'other_matching_rule'
      ELSE NULL
    END
  FROM public.psw_profiles p
  LEFT JOIN LATERAL public._dispatch_location_internal(p.id) loc ON true
  WHERE COALESCE(p.is_test, false) = COALESCE(v_b.is_test_data, false);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dispatch_candidates(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dispatch_candidates(uuid) TO authenticated, service_role;

-- 7) Location writes: mock-location rejection, accuracy limits, jump detection, audit trail
CREATE OR REPLACE FUNCTION public.record_psw_location(
  p_lat numeric,
  p_lng numeric,
  p_accuracy_m numeric DEFAULT NULL,
  p_source text DEFAULT 'device',
  p_is_mocked boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
  v_psw   public.psw_profiles%ROWTYPE;
  v_prev  public.psw_verified_locations%ROWTYPE;
  v_dist  numeric;
  v_secs  numeric;
  v_speed numeric;
  v_flag  text;
  v_source text := lower(COALESCE(NULLIF(btrim(p_source), ''), 'device'));
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'session_expired');
  END IF;

  IF p_lat IS NULL OR p_lng IS NULL
     OR p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180
     OR (p_lat = 0 AND p_lng = 0) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_coordinates');
  END IF;

  IF v_source NOT IN ('device', 'manual_refresh') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_source');
  END IF;

  v_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  SELECT * INTO v_psw FROM public.psw_profiles p
   WHERE lower(btrim(p.email)) = v_email
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'psw_not_found');
  END IF;

  SELECT * INTO v_prev FROM public.psw_verified_locations l WHERE l.psw_id = v_psw.id;

  IF v_prev.psw_id IS NOT NULL THEN
    v_dist := 6371 * acos(LEAST(1, GREATEST(-1,
      cos(radians(v_prev.latitude)) * cos(radians(p_lat)) *
      cos(radians(p_lng) - radians(v_prev.longitude)) +
      sin(radians(v_prev.latitude)) * sin(radians(p_lat))
    )));
    v_secs := GREATEST(1, EXTRACT(EPOCH FROM (now() - v_prev.recorded_at)));
    v_speed := ROUND((v_dist / (v_secs / 3600.0))::numeric, 2);
  END IF;

  -- Reject clearly untrustworthy readings
  IF COALESCE(p_is_mocked, false) THEN
    v_flag := 'mock_location';
  ELSIF p_accuracy_m IS NOT NULL AND p_accuracy_m > 5000 THEN
    v_flag := 'accuracy_too_poor';
  ELSIF v_speed IS NOT NULL AND v_speed > 900 THEN
    v_flag := 'impossible_jump';
  ELSIF v_speed IS NOT NULL AND v_speed > 300 THEN
    v_flag := 'suspicious_speed';
  END IF;

  IF v_flag IN ('mock_location', 'accuracy_too_poor', 'impossible_jump') THEN
    INSERT INTO public.psw_location_audit (
      psw_id, approx_latitude, approx_longitude, accuracy_m, source,
      distance_from_previous_km, seconds_since_previous, implied_speed_kmh,
      accepted, flagged, flag_reason
    ) VALUES (
      v_psw.id, round(p_lat, 2), round(p_lng, 2), p_accuracy_m, v_source,
      ROUND(v_dist, 2), v_secs, v_speed, false, true, v_flag
    );
    RETURN jsonb_build_object('ok', false, 'reason', v_flag);
  END IF;

  INSERT INTO public.psw_verified_locations (psw_id, latitude, longitude, accuracy_m, source, recorded_at)
  VALUES (v_psw.id, round(p_lat, 8), round(p_lng, 8), p_accuracy_m, v_source, now())
  ON CONFLICT (psw_id) DO UPDATE
    SET latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        accuracy_m = EXCLUDED.accuracy_m,
        source = EXCLUDED.source,
        recorded_at = now(),
        updated_at = now();

  INSERT INTO public.psw_location_audit (
    psw_id, approx_latitude, approx_longitude, accuracy_m, source,
    distance_from_previous_km, seconds_since_previous, implied_speed_kmh,
    accepted, flagged, flag_reason
  ) VALUES (
    v_psw.id, round(p_lat, 2), round(p_lng, 2), p_accuracy_m, v_source,
    ROUND(v_dist, 2), v_secs, v_speed, true, v_flag IS NOT NULL, v_flag
  );

  RETURN jsonb_build_object('ok', true, 'psw_id', v_psw.id, 'recorded_at', now(), 'flagged', v_flag IS NOT NULL);
END;
$$;

DROP FUNCTION IF EXISTS public.record_psw_location(numeric, numeric, numeric, text);

REVOKE ALL ON FUNCTION public.record_psw_location(numeric, numeric, numeric, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_psw_location(numeric, numeric, numeric, text, boolean) TO authenticated, service_role;

-- 8) Caregiver location table: no anonymous reach at all
REVOKE ALL ON public.psw_verified_locations FROM anon;
