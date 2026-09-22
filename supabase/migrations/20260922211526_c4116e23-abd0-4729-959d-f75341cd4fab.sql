CREATE OR REPLACE FUNCTION public.complete_shift_signout(
  _booking_id uuid,
  _care_sheet jsonb,
  _sign_out_lat numeric DEFAULT NULL,
  _sign_out_lng numeric DEFAULT NULL,
  _sign_out_accuracy_m numeric DEFAULT NULL,
  _sign_out_distance_m numeric DEFAULT NULL,
  _sign_out_outside_radius boolean DEFAULT false,
  _care_sheet_flagged boolean DEFAULT false,
  _care_sheet_flag_reason jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
  _flag_reason_arr text[];
  _location_review boolean := false;
  _incident boolean := false;
  _incident_summary text;
BEGIN
  -- Trusted RPC: this function is the authoritative sign-out path and is the
  -- only non-admin writer allowed to move verification_status into the office
  -- review queue. Without this the column guard rejected every sign-out taken
  -- with a weak, missing or out-of-range location.
  PERFORM set_config('app.trusted_rpc', 'on', true);

  _psw_id := public.current_psw_profile_id();
  IF _psw_id IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF _care_sheet IS NULL OR jsonb_typeof(_care_sheet) <> 'object' THEN
    RAISE EXCEPTION 'invalid_care_sheet' USING ERRCODE = '22023';
  END IF;

  IF _care_sheet_flag_reason IS NULL THEN
    _flag_reason_arr := NULL;
  ELSIF jsonb_typeof(_care_sheet_flag_reason) = 'array' THEN
    SELECT COALESCE(array_agg(x), ARRAY[]::text[])
      INTO _flag_reason_arr
      FROM jsonb_array_elements_text(_care_sheet_flag_reason) AS x;
  ELSIF jsonb_typeof(_care_sheet_flag_reason) = 'string' THEN
    _flag_reason_arr := ARRAY[trim(both '"' from _care_sheet_flag_reason::text)];
  ELSE
    _flag_reason_arr := ARRAY[_care_sheet_flag_reason::text];
  END IF;

  SELECT * INTO _row
    FROM public.bookings
   WHERE id = _booking_id
     AND psw_assigned = _psw_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(_row.verification_status, '') = 'voided' THEN
    RAISE EXCEPTION 'attendance_voided' USING ERRCODE = '22023';
  END IF;

  IF _row.checked_in_at IS NULL THEN
    RAISE EXCEPTION 'not_checked_in' USING ERRCODE = '22023';
  END IF;

  _worked_minutes := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (_now - _row.checked_in_at)) / 60)::int);

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

  _location_review := COALESCE(_sign_out_outside_radius, false)
                      OR _sign_out_lat IS NULL
                      OR _sign_out_lng IS NULL;

  _incident := COALESCE((_care_sheet ->> 'incidentReported')::boolean, false)
               OR COALESCE(NULLIF(btrim(COALESCE(_care_sheet ->> 'safetyConcerns','')), ''), NULL) IS NOT NULL;
  _incident_summary := LEFT(COALESCE(_care_sheet ->> 'safetyConcerns', ''), 2000);

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
         sign_out_outside_radius = COALESCE(_sign_out_outside_radius, false),
         verification_status = CASE
           WHEN verification_status = 'awaiting_review' THEN 'awaiting_review'
           WHEN _location_review THEN 'awaiting_review'
           ELSE verification_status END,
         incident_reported = CASE WHEN _incident THEN true ELSE incident_reported END,
         incident_reported_at = CASE WHEN _incident AND incident_reported_at IS NULL THEN _now ELSE incident_reported_at END,
         incident_summary = CASE WHEN _incident AND NULLIF(_incident_summary,'') IS NOT NULL
                                 THEN _incident_summary ELSE incident_summary END,
         care_sheet_flagged = CASE WHEN _care_sheet_flagged THEN true ELSE care_sheet_flagged END,
         care_sheet_flag_reason = COALESCE(_flag_reason_arr, care_sheet_flag_reason)
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

  PERFORM set_config('app.trusted_rpc', 'off', true);

  RETURN jsonb_build_object(
    'success',                _signed_out_at IS NOT NULL,
    'did_update',             _updated = 1,
    'already_completed',      (_updated = 0 AND _signed_out_at IS NOT NULL),
    'signed_out_at',          _signed_out_at,
    'status',                 _status,
    'care_sheet_submitted_at',_submitted_at,
    'overtime_minutes',       COALESCE(_overtime_minutes, 0),
    'flagged_for_overtime',   COALESCE(_flagged, false),
    'attendance_review',      _location_review,
    'incident_reported',      _incident,
    'worked_minutes',         _worked_minutes,
    'booked_minutes',         _booked_minutes
  );
END;
$function$;