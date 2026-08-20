CREATE OR REPLACE FUNCTION public.psw_eligible_booking_ids(p_psw_id uuid, p_radius_km numeric DEFAULT NULL::numeric)
 RETURNS TABLE(booking_id uuid, booking_code text, distance_km numeric, radius_km numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    psw.vetting_status = 'approved'
    AND psw.lifecycle_status = 'active'
    AND (psw.police_check_date IS NULL OR (psw.police_check_date + INTERVAL '1 year') >= CURRENT_DATE)
    AND psw.home_lat IS NOT NULL AND psw.home_lng IS NOT NULL
    AND b.status = 'pending'
    AND (b.psw_assigned IS NULL OR b.psw_assigned = '')
    AND (b.stripe_payment_intent_id IS NULL OR COALESCE(b.payment_status, '') = 'paid')
    AND COALESCE(b.recovered_from_payment_intent, false) = false
    -- Stay claimable until the scheduled START time (America/Toronto) has passed
    AND (
      (b.scheduled_date + COALESCE(b.start_time, TIME '00:00'))
        AT TIME ZONE 'America/Toronto'
    ) > now()
    AND b.service_latitude IS NOT NULL AND b.service_longitude IS NOT NULL
    AND b.service_latitude BETWEEN 41.5 AND 57.0
    AND b.service_longitude BETWEEN -95.5 AND -74.0
    AND (
      CASE WHEN psw.is_test
        THEN COALESCE(b.is_test_data, false) = true
             AND b.test_target_psw_id IS NOT NULL
             AND b.test_target_psw_id = psw.id
        ELSE COALESCE(b.is_test_data, false) = false
      END
    )
    AND (6371 * acos(LEAST(1, GREATEST(-1,
          cos(radians(psw.home_lat)) * cos(radians(b.service_latitude)) *
          cos(radians(b.service_longitude) - radians(psw.home_lng)) +
          sin(radians(psw.home_lat)) * sin(radians(b.service_latitude))
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
    );
$function$;