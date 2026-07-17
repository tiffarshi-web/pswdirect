
-- 1) Harden save_care_sheet_draft: whitelist keys, enforce sizes, use helper.
CREATE OR REPLACE FUNCTION public.save_care_sheet_draft(
  _booking_id uuid,
  _care_sheet jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _psw_id text;
  _updated integer;
  _clean jsonb;
  _tasks jsonb;
BEGIN
  _psw_id := public.current_psw_profile_id();
  IF _psw_id IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF _care_sheet IS NULL OR jsonb_typeof(_care_sheet) <> 'object' THEN
    RAISE EXCEPTION 'invalid_payload' USING ERRCODE = '22023';
  END IF;
  IF octet_length(_care_sheet::text) > 20000 THEN
    RAISE EXCEPTION 'payload_too_large' USING ERRCODE = '22023';
  END IF;

  _tasks := COALESCE(_care_sheet -> 'tasksCompleted', '[]'::jsonb);
  IF jsonb_typeof(_tasks) <> 'array' THEN
    _tasks := '[]'::jsonb;
  END IF;

  -- Construct a clean object from only the permitted keys; discard everything else.
  _clean := jsonb_build_object(
    'moodOnArrival',       LEFT(COALESCE(_care_sheet ->> 'moodOnArrival',''),  40),
    'moodOnDeparture',     LEFT(COALESCE(_care_sheet ->> 'moodOnDeparture',''),40),
    'tasksCompleted',      _tasks,
    'observations',        LEFT(COALESCE(_care_sheet ->> 'observations',''),   4000),
    'pswFirstName',        LEFT(COALESCE(_care_sheet ->> 'pswFirstName',''),   80),
    'officeNumber',        LEFT(COALESCE(_care_sheet ->> 'officeNumber',''),   40),
    'isHospitalDischarge', COALESCE((_care_sheet ->> 'isHospitalDischarge')::boolean, false),
    'dischargeNotes',      LEFT(COALESCE(_care_sheet ->> 'dischargeNotes',''), 2000)
  );

  UPDATE public.bookings
     SET care_sheet = _clean,
         care_sheet_status = 'draft',
         care_sheet_last_saved_at = now()
   WHERE id = _booking_id
     AND psw_assigned = _psw_id
     AND checked_in_at IS NOT NULL
     AND signed_out_at IS NULL
     AND status IN ('in-progress','active')
     AND (care_sheet_status IS NULL OR care_sheet_status IN ('draft','missing'));

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.save_care_sheet_draft(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_care_sheet_draft(uuid, jsonb) TO authenticated;

-- 2) Idempotency column for the PSW-arrived notification.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS arrived_notified_at timestamptz;

-- 3) complete_shift_signout — authoritative sign-out with did_update / already_completed.
CREATE OR REPLACE FUNCTION public.complete_shift_signout(
  _booking_id uuid,
  _care_sheet jsonb,
  _overtime_minutes integer,
  _flagged_for_overtime boolean,
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

  UPDATE public.bookings
     SET signed_out_at = now(),
         status = 'completed',
         care_sheet = _care_sheet,
         care_sheet_status = 'submitted',
         care_sheet_submitted_at = now(),
         care_sheet_psw_name = _care_sheet ->> 'pswFirstName',
         overtime_minutes = _overtime_minutes,
         flagged_for_overtime = _flagged_for_overtime,
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

  SELECT b.signed_out_at, b.status, b.care_sheet_submitted_at
    INTO _signed_out_at, _status, _submitted_at
    FROM public.bookings b
   WHERE b.id = _booking_id
     AND b.psw_assigned = _psw_id;

  RETURN jsonb_build_object(
    'success',                _signed_out_at IS NOT NULL,
    'did_update',             _updated = 1,
    'already_completed',      (_updated = 0 AND _signed_out_at IS NOT NULL),
    'signed_out_at',          _signed_out_at,
    'status',                 _status,
    'care_sheet_submitted_at',_submitted_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_shift_signout(
  uuid, jsonb, integer, boolean, numeric, numeric, numeric, numeric, boolean, boolean, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_shift_signout(
  uuid, jsonb, integer, boolean, numeric, numeric, numeric, numeric, boolean, boolean, jsonb
) TO authenticated;
