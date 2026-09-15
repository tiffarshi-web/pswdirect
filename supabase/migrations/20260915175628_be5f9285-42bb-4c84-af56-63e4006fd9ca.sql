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
    -- Phase 8: an active provincial authorization is required for the order's province
    AND EXISTS (
      SELECT 1 FROM public.provider_provincial_authorizations a
      WHERE a.psw_profile_id = psw.id
        AND a.province = COALESCE(b.service_province, 'ON')
        AND a.provider_type = COALESCE(b.required_provider_type, 'PSW')
        AND a.verification_status = 'verified'
        AND a.job_eligible = true
        AND (a.expires_at IS NULL OR a.expires_at >= CURRENT_DATE)
    )
    -- Phase 8: never dispatch for a province whose client bookings are switched off
    AND EXISTS (
      SELECT 1 FROM public.provinces pr
      WHERE pr.code = COALESCE(b.service_province, 'ON')
        AND pr.is_active = true
        AND pr.bookings_enabled = true
    )
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

-- Keep authorization eligibility in step with caregiver approval changes.
CREATE OR REPLACE FUNCTION public.sync_provincial_authorization_from_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.provider_provincial_authorizations a
  SET job_eligible = (NEW.vetting_status = 'approved'
                      AND COALESCE(NEW.eligible_for_jobs, true)
                      AND a.verification_status = 'verified'),
      updated_at = now()
  WHERE a.psw_profile_id = NEW.id
    AND a.province = COALESCE(NEW.province, 'ON');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_provincial_authorization_from_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_provincial_auth ON public.psw_profiles;
CREATE TRIGGER trg_sync_provincial_auth
  AFTER UPDATE OF vetting_status, eligible_for_jobs ON public.psw_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_provincial_authorization_from_profile();