-- Replace complete_shift_signout: drop client-supplied overtime params, compute server-side.
DROP FUNCTION IF EXISTS public.complete_shift_signout(
  uuid, jsonb, integer, boolean, numeric, numeric, numeric, numeric, boolean, boolean, jsonb
);

CREATE OR REPLACE FUNCTION public.complete_shift_signout(
  _booking_id uuid,
  _care_sheet jsonb,
  _sign_out_lat numeric,
  _sign_out_lng numeric,
  _sign_out_accuracy_m numeric,
  _sign_out_distance_m numeric,
  _sign_out_outside_radius boolean,
  _care_sheet_flagged boolean,
  _care_sheet_flag_reason jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _psw_id text;
  _updated integer;
  _now timestamptz := now();
  _row public.bookings%ROWTYPE;
  _worked_minutes integer := 0;
  _booked_minutes integer := 0;
  _overtime_minutes integer := 0;
  _flagged boolean := false;
  _signed_out_at timestamptz;
  _status text;
  _submitted_at timestamptz;
BEGIN
  _psw_id := public.current_psw_profile_id();
  IF _psw_id IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF _care_sheet IS NULL OR jsonb_typeof(_care_sheet) <> 'object' THEN
    RAISE EXCEPTION 'invalid_care_sheet' USING ERRCODE = '22023';
  END IF;

  -- Lock authoritative row for this PSW.
  SELECT * INTO _row
    FROM public.bookings
   WHERE id = _booking_id
     AND psw_assigned = _psw_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Compute worked / booked / overtime authoritatively.
  IF _row.checked_in_at IS NOT NULL THEN
    _worked_minutes := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (_now - _row.checked_in_at)) / 60)::int);
  END IF;

  IF _row.scheduled_date IS NOT NULL
     AND _row.start_time IS NOT NULL
     AND _row.end_time IS NOT NULL THEN
    _booked_minutes := GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (
        (_row.scheduled_date + _row.end_time) - (_row.scheduled_date + _row.start_time)
      )) / 60)::int
    );
  END IF;

  _overtime_minutes := GREATEST(0, _worked_minutes - _booked_minutes);
  _flagged := _overtime_minutes >= 15;

  UPDATE public.bookings
     SET signed_out_at = _now,
         status = 'completed',
         care_sheet = _care_sheet,
         care_sheet_status = 'submitted',
         care_sheet_submitted_at = _now,
         care_sheet_psw_name = _care_sheet ->> 'pswFirstName',
         overtime_minutes = _overtime_minutes,
         flagged_for_overtime = _flagged,
         sign_out_lat = _sign_out_lat,
         sign_out_lng = _sign_out_lng,
         sign_out_accuracy_m = _sign_out_accuracy_m,
         sign_out_distance_m = _sign_out_distance_m,
         sign_out_outside_radius = _sign_out_outside_radius,
         care_sheet_flagged = CASE WHEN _care_sheet_flagged THEN true ELSE care_sheet_flagged END,
         care_sheet_flag_reason = COALESCE(_care_sheet_flag_reason, care_sheet_flag_reason)
   WHERE id = _booking_id
     AND psw_assigned = _psw_id
     AND checked_in_at IS NOT NULL
     AND signed_out_at IS NULL
     AND status IN ('in-progress','active');

  GET DIAGNOSTICS _updated = ROW_COUNT;

  SELECT b.signed_out_at, b.status, b.care_sheet_submitted_at,
         b.overtime_minutes, b.flagged_for_overtime
    INTO _signed_out_at, _status, _submitted_at, _overtime_minutes, _flagged
    FROM public.bookings b
   WHERE b.id = _booking_id
     AND b.psw_assigned = _psw_id;

  RETURN jsonb_build_object(
    'success',                _signed_out_at IS NOT NULL,
    'did_update',             _updated = 1,
    'already_completed',      (_updated = 0 AND _signed_out_at IS NOT NULL),
    'signed_out_at',          _signed_out_at,
    'status',                 _status,
    'care_sheet_submitted_at',_submitted_at,
    'overtime_minutes',       COALESCE(_overtime_minutes, 0),
    'flagged_for_overtime',   COALESCE(_flagged, false),
    'worked_minutes',         _worked_minutes,
    'booked_minutes',         _booked_minutes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_shift_signout(
  uuid, jsonb, numeric, numeric, numeric, numeric, boolean, boolean, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_shift_signout(
  uuid, jsonb, numeric, numeric, numeric, numeric, boolean, boolean, jsonb
) TO authenticated;
