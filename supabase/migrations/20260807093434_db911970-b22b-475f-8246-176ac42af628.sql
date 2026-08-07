CREATE OR REPLACE FUNCTION public.psw_save_care_sheet(_booking_id uuid, _care_sheet jsonb, _psw_name text DEFAULT NULL::text, _submit boolean DEFAULT false, _flagged boolean DEFAULT false, _flag_reason jsonb DEFAULT NULL::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _psw uuid := public.current_psw_profile_id();
  _updated int;
  _reasons text[] := NULL;
BEGIN
  IF _psw IS NULL THEN
    RAISE EXCEPTION 'Not a caregiver account';
  END IF;

  IF _flagged AND _flag_reason IS NOT NULL THEN
    IF jsonb_typeof(_flag_reason) = 'array' THEN
      SELECT array_agg(value) INTO _reasons
      FROM jsonb_array_elements_text(_flag_reason) AS value;
    ELSE
      _reasons := ARRAY[trim(both '"' from _flag_reason::text)];
    END IF;
  END IF;

  UPDATE public.bookings
     SET care_sheet = _care_sheet,
         care_sheet_status = CASE WHEN _submit THEN 'submitted' ELSE 'draft' END,
         care_sheet_last_saved_at = now(),
         care_sheet_submitted_at = CASE WHEN _submit THEN now() ELSE care_sheet_submitted_at END,
         care_sheet_psw_name = COALESCE(_psw_name, care_sheet_psw_name),
         care_sheet_flagged = CASE WHEN _flagged THEN true ELSE care_sheet_flagged END,
         care_sheet_flag_reason = CASE WHEN _flagged THEN COALESCE(_reasons, care_sheet_flag_reason) ELSE care_sheet_flag_reason END
   WHERE id = _booking_id
     AND psw_assigned = _psw;

  GET DIAGNOSTICS _updated = ROW_COUNT;
  IF _updated = 0 THEN
    RAISE EXCEPTION 'Shift not found or not assigned to you';
  END IF;

  RETURN true;
END;
$function$;