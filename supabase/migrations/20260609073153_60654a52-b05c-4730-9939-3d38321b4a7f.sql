
-- =====================================================================
-- 1. Atomic claim function (replaces optimistic update)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.claim_booking(
  p_booking_id uuid,
  p_psw_id uuid,
  p_psw_name text DEFAULT NULL,
  p_psw_photo_url text DEFAULT NULL,
  p_psw_vehicle_photo_url text DEFAULT NULL,
  p_psw_license_plate text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_psw     public.psw_profiles%ROWTYPE;
  v_first   text;
BEGIN
  -- Lock the booking row to serialize concurrent claim attempts
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF v_booking.status <> 'pending' OR (v_booking.psw_assigned IS NOT NULL AND v_booking.psw_assigned <> '') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed');
  END IF;

  -- Payment / order eligibility:
  --  * paid Stripe order  → ok
  --  * admin-created order with no stripe PI → ok (invoice / manual / insurance)
  IF v_booking.stripe_payment_intent_id IS NOT NULL
     AND COALESCE(v_booking.payment_status, '') <> 'paid' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unpaid');
  END IF;

  IF COALESCE(v_booking.recovered_from_payment_intent, false) = true THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unpaid');
  END IF;

  -- PSW eligibility
  SELECT * INTO v_psw FROM public.psw_profiles WHERE id = p_psw_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'psw_not_found');
  END IF;

  IF v_psw.vetting_status <> 'approved' OR COALESCE(v_psw.lifecycle_status, 'active') <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'psw_not_eligible');
  END IF;

  IF v_psw.police_check_date IS NOT NULL
     AND (v_psw.police_check_date + INTERVAL '1 year') < CURRENT_DATE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'vsc_expired');
  END IF;

  v_first := COALESCE(NULLIF(split_part(COALESCE(p_psw_name, ''), ' ', 1), ''), v_psw.first_name);

  UPDATE public.bookings
  SET psw_assigned          = p_psw_id::text,
      psw_first_name        = v_first,
      psw_photo_url         = COALESCE(p_psw_photo_url, v_psw.profile_photo_url),
      psw_vehicle_photo_url = COALESCE(p_psw_vehicle_photo_url, psw_vehicle_photo_url),
      psw_license_plate     = COALESCE(p_psw_license_plate, psw_license_plate),
      claimed_at            = now(),
      status                = 'active',
      updated_at            = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('ok', true, 'booking_id', p_booking_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text) TO service_role;

-- =====================================================================
-- 2. Count nearby PSWs (no PII) for client dashboard
-- =====================================================================
CREATE OR REPLACE FUNCTION public.count_nearby_psws(
  p_lat numeric,
  p_lng numeric,
  p_radius_km numeric DEFAULT 75
)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.psw_profiles p
  WHERE p.vetting_status = 'approved'
    AND COALESCE(p.lifecycle_status, 'active') = 'active'
    AND p.home_lat IS NOT NULL
    AND p.home_lng IS NOT NULL
    AND (
      p.police_check_date IS NULL
      OR (p.police_check_date + INTERVAL '1 year') >= CURRENT_DATE
    )
    AND (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(p.home_lat)) *
        cos(radians(p.home_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(p.home_lat))
      )
    ) <= p_radius_km;
$$;

GRANT EXECUTE ON FUNCTION public.count_nearby_psws(numeric, numeric, numeric) TO authenticated, anon;

-- =====================================================================
-- 3. Count of available jobs for a specific PSW (for red badge)
--    Uses PSW's stored home_lat/lng + provided radius.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.count_available_jobs_for_psw(
  p_psw_id uuid,
  p_radius_km numeric DEFAULT 75
)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH psw AS (
    SELECT home_lat, home_lng, vetting_status, lifecycle_status
    FROM public.psw_profiles WHERE id = p_psw_id
  )
  SELECT COUNT(*)::int
  FROM public.bookings b, psw
  WHERE psw.vetting_status = 'approved'
    AND COALESCE(psw.lifecycle_status, 'active') = 'active'
    AND b.status = 'pending'
    AND (b.psw_assigned IS NULL OR b.psw_assigned = '')
    AND (
      b.stripe_payment_intent_id IS NULL
      OR COALESCE(b.payment_status, '') = 'paid'
    )
    AND COALESCE(b.recovered_from_payment_intent, false) = false
    AND (
      psw.home_lat IS NULL OR psw.home_lng IS NULL
      OR b.service_latitude IS NULL OR b.service_longitude IS NULL
      OR (
        6371 * acos(
          cos(radians(psw.home_lat)) * cos(radians(b.service_latitude)) *
          cos(radians(b.service_longitude) - radians(psw.home_lng)) +
          sin(radians(psw.home_lat)) * sin(radians(b.service_latitude))
        )
      ) <= p_radius_km
    );
$$;

GRANT EXECUTE ON FUNCTION public.count_available_jobs_for_psw(uuid, numeric) TO authenticated, service_role;
