
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
BEGIN
  -- Resolve caller to a psw_profiles.id via JWT email
  SELECT p.id::text INTO _psw_id
  FROM public.psw_profiles p
  WHERE p.email = (auth.jwt() ->> 'email');

  IF _psw_id IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.bookings
     SET care_sheet = _care_sheet,
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
