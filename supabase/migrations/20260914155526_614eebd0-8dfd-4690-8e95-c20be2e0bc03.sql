ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS sign_out_gps_failure_reason text,
  ADD COLUMN IF NOT EXISTS incident_reported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS incident_reported_at timestamptz,
  ADD COLUMN IF NOT EXISTS incident_summary text,
  ADD COLUMN IF NOT EXISTS care_sheet_delivery_status text,
  ADD COLUMN IF NOT EXISTS care_sheet_delivery_error text,
  ADD COLUMN IF NOT EXISTS care_sheet_delivery_attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_bookings_incident_reported
  ON public.bookings (incident_reported, scheduled_date DESC)
  WHERE incident_reported = true;

-- ---------------------------------------------------------------------------
-- Sign-out: voided attendance can never complete a booking; weak/absent GPS
-- routes the visit to office review instead of blocking the caregiver.
-- ---------------------------------------------------------------------------
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
SET search_path TO 'public'
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

  -- Phase 2 integration: attendance voided by a wrong-day correction cannot
  -- be completed. The caregiver must check in again on the corrected date.
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

  -- Weak, missing or out-of-range finishing location: complete the visit but
  -- send the attendance to the office review queue. Never block sign-out.
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

-- ---------------------------------------------------------------------------
-- Draft autosave: keep safety concerns, incident indication and follow-up.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_care_sheet_draft(_booking_id uuid, _care_sheet jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  _clean := jsonb_build_object(
    'moodOnArrival',       LEFT(COALESCE(_care_sheet ->> 'moodOnArrival',''),  40),
    'moodOnDeparture',     LEFT(COALESCE(_care_sheet ->> 'moodOnDeparture',''),40),
    'tasksCompleted',      _tasks,
    'observations',        LEFT(COALESCE(_care_sheet ->> 'observations',''),   4000),
    'pswFirstName',        LEFT(COALESCE(_care_sheet ->> 'pswFirstName',''),   80),
    'officeNumber',        LEFT(COALESCE(_care_sheet ->> 'officeNumber',''),   40),
    'isHospitalDischarge', COALESCE((_care_sheet ->> 'isHospitalDischarge')::boolean, false),
    'dischargeNotes',      LEFT(COALESCE(_care_sheet ->> 'dischargeNotes',''), 2000),
    'additionalNotes',     LEFT(COALESCE(_care_sheet ->> 'additionalNotes',''), 4000),
    'safetyConcerns',      LEFT(COALESCE(_care_sheet ->> 'safetyConcerns',''), 2000),
    'incidentReported',    COALESCE((_care_sheet ->> 'incidentReported')::boolean, false),
    'followUpRecommended', LEFT(COALESCE(_care_sheet ->> 'followUpRecommended',''), 1000)
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
$function$;

-- ---------------------------------------------------------------------------
-- Earnings: exactly one entry per completed visit, never paid, never a payout.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_payroll_entry_earning_status(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  b public.bookings%ROWTYPE;
  e record;
  v_status public.provider_earning_status;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT earning_status, requires_admin_review
    INTO e
    FROM public.payroll_entries WHERE shift_id = p_booking_id::text;
  IF NOT FOUND THEN RETURN; END IF;

  -- Never move an entry the office has already acted on.
  IF e.earning_status IN ('approved_for_manual_payment','paid_manually','disputed','voided') THEN
    RETURN;
  END IF;

  IF COALESCE(b.care_sheet_status, '') <> 'submitted' THEN
    v_status := 'pending_care_sheet';
  ELSE
    v_status := 'pending_office_review';
  END IF;

  UPDATE public.payroll_entries
     SET earning_status = v_status,
         updated_at = now()
   WHERE shift_id = p_booking_id::text
     AND earning_status IS DISTINCT FROM v_status;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_payroll_entry_earning_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_payroll_entry_earning_status(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_booking_payroll_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed'
     AND NEW.psw_assigned IS NOT NULL
     AND NEW.psw_assigned <> ''
     AND COALESCE(NEW.was_refunded, false) = false
     AND COALESCE(NEW.verification_status, '') <> 'voided'
  THEN
    PERFORM public.upsert_payroll_entry_for_booking(NEW.id);
    PERFORM public.set_payroll_entry_earning_status(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;