
-- 1. Fix claim_booking: correct transport eligibility predicate (text-based, yes-car only)
CREATE OR REPLACE FUNCTION public.claim_booking(
  p_booking_id uuid,
  p_psw_id uuid,
  p_psw_name text DEFAULT NULL::text,
  p_psw_photo_url text DEFAULT NULL::text,
  p_psw_vehicle_photo_url text DEFAULT NULL::text,
  p_psw_license_plate text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Vehicle requirement for transport bookings. Admin overrides allowed.
  -- has_own_transport is TEXT with valid values: 'yes-car', 'yes-transit', 'no', '', NULL.
  -- Only 'yes-car' means the PSW can drive clients to appointments.
  IF COALESCE(v_booking.is_transport_booking, false) = true
     AND NOT v_is_admin
     AND COALESCE(v_psw.has_own_transport, '') <> 'yes-car' THEN
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
$function$;

-- 2. Validation trigger for future writes
CREATE OR REPLACE FUNCTION public.validate_psw_has_own_transport()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.has_own_transport IS NOT NULL
     AND NEW.has_own_transport <> ''
     AND NEW.has_own_transport NOT IN ('yes-car', 'yes-transit', 'no') THEN
    RAISE EXCEPTION 'Invalid has_own_transport value: %. Must be one of: yes-car, yes-transit, no.', NEW.has_own_transport
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_psw_has_own_transport ON public.psw_profiles;
CREATE TRIGGER trg_validate_psw_has_own_transport
  BEFORE INSERT OR UPDATE OF has_own_transport ON public.psw_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_psw_has_own_transport();
