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

  _clean := jsonb_build_object(
    'moodOnArrival',       LEFT(COALESCE(_care_sheet ->> 'moodOnArrival',''),  40),
    'moodOnDeparture',     LEFT(COALESCE(_care_sheet ->> 'moodOnDeparture',''),40),
    'tasksCompleted',      _tasks,
    'observations',        LEFT(COALESCE(_care_sheet ->> 'observations',''),   4000),
    'pswFirstName',        LEFT(COALESCE(_care_sheet ->> 'pswFirstName',''),   80),
    'officeNumber',        LEFT(COALESCE(_care_sheet ->> 'officeNumber',''),   40),
    'isHospitalDischarge', COALESCE((_care_sheet ->> 'isHospitalDischarge')::boolean, false),
    'dischargeNotes',      LEFT(COALESCE(_care_sheet ->> 'dischargeNotes',''), 2000),
    'additionalNotes',     LEFT(COALESCE(_care_sheet ->> 'additionalNotes',''), 4000)
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
REVOKE ALL ON FUNCTION public.save_care_sheet_draft(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_care_sheet_draft(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_care_sheet_draft(uuid, jsonb) TO service_role;