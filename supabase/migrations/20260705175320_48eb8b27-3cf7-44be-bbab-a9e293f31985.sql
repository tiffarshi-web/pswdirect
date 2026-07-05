
-- Critical #1: Server-side vehicle enforcement on transport claims.
-- Critical #2: PSW self-unassign RPC (>= 2h before start, penalty via cancel_count).
-- High #6: Dispatch idempotency index on booking_id.

-- ---------------------------------------------------------------------------
-- 1. Extend claim_booking with vehicle requirement + preserve existing checks
-- ---------------------------------------------------------------------------
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
  v_caller_email text;
  v_is_admin boolean := false;
BEGIN
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF auth.uid() IS NOT NULL THEN
    SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO v_is_admin;
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  IF v_booking.status <> 'pending' OR (v_booking.psw_assigned IS NOT NULL AND v_booking.psw_assigned <> '') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed');
  END IF;

  IF v_booking.stripe_payment_intent_id IS NOT NULL
     AND COALESCE(v_booking.payment_status, '') <> 'paid' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unpaid');
  END IF;

  IF COALESCE(v_booking.recovered_from_payment_intent, false) = true THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unpaid');
  END IF;

  SELECT * INTO v_psw FROM public.psw_profiles WHERE id = p_psw_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'psw_not_found'); END IF;

  IF NOT v_is_admin THEN
    IF v_caller_email = '' OR lower(coalesce(v_psw.email, '')) <> v_caller_email THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
    END IF;
  END IF;

  IF v_psw.vetting_status <> 'approved' OR COALESCE(v_psw.lifecycle_status, 'active') <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'psw_not_eligible');
  END IF;

  IF v_psw.police_check_date IS NOT NULL
     AND (v_psw.police_check_date + INTERVAL '1 year') < CURRENT_DATE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'vsc_expired');
  END IF;

  -- NEW: Vehicle requirement for transport bookings. Admin overrides allowed.
  IF COALESCE(v_booking.is_transport_booking, false) = true
     AND NOT v_is_admin
     AND COALESCE(v_psw.has_own_transport, false) = false THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'vehicle_required');
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

-- ---------------------------------------------------------------------------
-- 2. PSW self-unassign RPC. Policy: allowed only if shift start is
--    at least 2 hours away. Anything closer requires admin reassignment.
--    Increments cancel_count as an accountability signal.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.psw_unassign_booking(
  p_booking_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_psw public.psw_profiles%ROWTYPE;
  v_caller_email text;
  v_is_admin boolean := false;
  v_start timestamptz;
BEGIN
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF auth.uid() IS NOT NULL THEN
    SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO v_is_admin;
  END IF;

  IF v_caller_email = '' AND NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  IF v_booking.psw_assigned IS NULL OR v_booking.psw_assigned = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_assigned');
  END IF;

  IF v_booking.status NOT IN ('active', 'pending') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_started');
  END IF;

  -- Ownership check
  SELECT * INTO v_psw FROM public.psw_profiles WHERE id::text = v_booking.psw_assigned;
  IF NOT v_is_admin THEN
    IF NOT FOUND OR lower(coalesce(v_psw.email, '')) <> v_caller_email THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
    END IF;
  END IF;

  -- 2-hour window guard (skipped for admins)
  v_start := (v_booking.scheduled_date::text || ' ' || v_booking.start_time::text)::timestamptz;
  IF NOT v_is_admin AND v_start < (now() + INTERVAL '2 hours') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_close_to_start');
  END IF;

  UPDATE public.bookings
  SET psw_assigned          = NULL,
      psw_first_name        = NULL,
      psw_photo_url         = NULL,
      psw_vehicle_photo_url = NULL,
      psw_license_plate     = NULL,
      claimed_at            = NULL,
      status                = 'pending',
      psw_cancel_reason     = LEFT(COALESCE(p_reason, 'psw_self_unassign'), 500),
      psw_cancelled_at      = now(),
      updated_at            = now()
  WHERE id = p_booking_id;

  -- Accountability signal — only when a PSW self-unassigns, not for admin actions
  IF NOT v_is_admin AND v_psw.id IS NOT NULL THEN
    UPDATE public.psw_profiles
    SET cancel_count = COALESCE(cancel_count, 0) + 1,
        updated_at = now()
    WHERE id = v_psw.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'booking_id', p_booking_id, 'redispatch', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.psw_unassign_booking(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.psw_unassign_booking(uuid, text) TO service_role;

COMMENT ON FUNCTION public.psw_unassign_booking(uuid, text) IS
'Allows an assigned PSW to release a booking if start_time is >= 2h away. Increments cancel_count. Admins can call any time.';

-- ---------------------------------------------------------------------------
-- 3. Dispatch idempotency: index on booking_id for fast duplicate detection.
--    (booking_code lookups keep working — this is additive.)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dispatch_logs_booking_id
  ON public.dispatch_logs (booking_id, created_at DESC);
