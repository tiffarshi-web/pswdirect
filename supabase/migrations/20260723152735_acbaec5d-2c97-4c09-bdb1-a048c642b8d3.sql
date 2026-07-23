
CREATE OR REPLACE FUNCTION public.check_in_to_shift(
  p_booking_id uuid,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_gps_failure_reason text DEFAULT NULL,
  p_outside_radius boolean DEFAULT false,
  p_distance_m double precision DEFAULT NULL,
  p_accuracy_m double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- psw_profiles.id is stored as text in bookings.psw_assigned, and
  -- current_psw_profile_id() returns text. Keeping this text avoids the
  -- text/uuid operator mismatch that previously blocked all check-ins.
  v_psw_id text;
  v_row public.bookings%ROWTYPE;
  v_soft_fail boolean;
  v_did_update boolean := false;
BEGIN
  v_psw_id := public.current_psw_profile_id();
  IF v_psw_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_row FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_row.psw_assigned IS DISTINCT FROM v_psw_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_assigned');
  END IF;

  IF v_row.status IN ('cancelled','completed','archived','refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_row.status);
  END IF;

  IF v_row.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'did_update', false,
      'already_checked_in', true,
      'checked_in_at', v_row.checked_in_at,
      'status', v_row.status
    );
  END IF;

  v_soft_fail := COALESCE(p_outside_radius, false) OR (p_gps_failure_reason IS NOT NULL);

  UPDATE public.bookings
     SET checked_in_at              = now(),
         check_in_lat               = p_lat,
         check_in_lng               = p_lng,
         status                     = 'in-progress',
         gps_check_in_failed        = v_soft_fail,
         gps_check_in_failure_reason= p_gps_failure_reason,
         check_in_outside_radius    = COALESCE(p_outside_radius, false),
         check_in_distance_m        = p_distance_m,
         check_in_accuracy_m        = p_accuracy_m,
         verification_status        = CASE WHEN v_soft_fail THEN 'awaiting_review' ELSE 'active' END
   WHERE id = p_booking_id
     AND psw_assigned = v_psw_id
     AND checked_in_at IS NULL
     AND signed_out_at IS NULL
     AND status NOT IN ('cancelled','completed','archived','refunded')
   RETURNING * INTO v_row;

  v_did_update := FOUND;

  IF NOT v_did_update THEN
    SELECT * INTO v_row FROM public.bookings WHERE id = p_booking_id;
    IF v_row.checked_in_at IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'did_update', false,
        'already_checked_in', true,
        'checked_in_at', v_row.checked_in_at,
        'status', v_row.status
      );
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'update_failed');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'did_update', true,
    'already_checked_in', false,
    'checked_in_at', v_row.checked_in_at,
    'status', v_row.status
  );
END;
$function$;
