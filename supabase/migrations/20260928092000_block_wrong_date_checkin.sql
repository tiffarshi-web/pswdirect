-- Prevent a provider from starting an order on any calendar date other than
-- the scheduled service date. The comparison is made in the order province's
-- configured timezone (Ontario/Toronto, Alberta/Edmonton, etc.), never in UTC
-- or the caregiver device's potentially incorrect timezone.
CREATE OR REPLACE FUNCTION public.check_in_to_shift(
  p_booking_id uuid,
  p_lat double precision DEFAULT NULL::double precision,
  p_lng double precision DEFAULT NULL::double precision,
  p_gps_failure_reason text DEFAULT NULL::text,
  p_outside_radius boolean DEFAULT false,
  p_distance_m double precision DEFAULT NULL::double precision,
  p_accuracy_m double precision DEFAULT NULL::double precision
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_psw_id text;
  v_row public.bookings%ROWTYPE;
  v_soft_fail boolean;
  v_did_update boolean := false;
  v_timezone text;
  v_service_date date;
BEGIN
  PERFORM set_config('app.trusted_rpc', 'on', true);

  v_psw_id := public.current_psw_profile_id();
  IF v_psw_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_row
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_row.psw_assigned IS DISTINCT FROM v_psw_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_assigned');
  END IF;

  IF v_row.status IN ('cancelled','completed','archived','refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_row.status);
  END IF;

  -- Preserve idempotency for a shift that was already validly started. The
  -- date lock applies to creating the initial attendance record, not retries.
  IF v_row.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'did_update', false,
      'already_checked_in', true,
      'checked_in_at', v_row.checked_in_at,
      'status', v_row.status
    );
  END IF;

  IF v_row.scheduled_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_scheduled_date');
  END IF;

  SELECT NULLIF(btrim(p.timezone), '')
    INTO v_timezone
  FROM public.provinces p
  WHERE p.code = COALESCE(NULLIF(btrim(v_row.service_province), ''), 'ON');

  v_timezone := COALESCE(
    v_timezone,
    CASE WHEN COALESCE(v_row.service_province, 'ON') = 'AB'
      THEN 'America/Edmonton'
      ELSE 'America/Toronto'
    END
  );
  v_service_date := (now() AT TIME ZONE v_timezone)::date;

  IF v_service_date IS DISTINCT FROM v_row.scheduled_date THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'wrong_service_date',
      'scheduled_date', v_row.scheduled_date,
      'current_service_date', v_service_date,
      'service_timezone', v_timezone,
      'service_province', COALESCE(NULLIF(v_row.service_province, ''), 'ON')
    );
  END IF;

  v_soft_fail := COALESCE(p_outside_radius, false) OR (p_gps_failure_reason IS NOT NULL);

  UPDATE public.bookings
     SET checked_in_at               = now(),
         check_in_lat                = p_lat,
         check_in_lng                = p_lng,
         status                      = 'in-progress',
         gps_check_in_failed         = v_soft_fail,
         gps_check_in_failure_reason = p_gps_failure_reason,
         check_in_outside_radius     = COALESCE(p_outside_radius, false),
         check_in_distance_m         = p_distance_m,
         check_in_accuracy_m         = p_accuracy_m,
         verification_status         = CASE WHEN v_soft_fail THEN 'awaiting_review' ELSE 'active' END
   WHERE id = p_booking_id
     AND psw_assigned = v_psw_id
     AND scheduled_date = v_service_date
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

REVOKE ALL ON FUNCTION public.check_in_to_shift(
  uuid, double precision, double precision, text, boolean, double precision, double precision
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_in_to_shift(
  uuid, double precision, double precision, text, boolean, double precision, double precision
) TO authenticated, service_role;

COMMENT ON FUNCTION public.check_in_to_shift(
  uuid, double precision, double precision, text, boolean, double precision, double precision
) IS 'Starts provider attendance only on the booking scheduled date in the service province timezone; GPS remains a non-blocking review signal.';
