-- 1. Remove direct PSW SELECT on raw bookings (they read psw_safe_booking_view, a definer view)
DROP POLICY IF EXISTS "Assigned PSW can select own bookings" ON public.bookings;

-- 2. Remove broad PSW UPDATE + catch-all authenticated UPDATE on raw bookings
DROP POLICY IF EXISTS "Assigned PSW can update own booking" ON public.bookings;
DROP POLICY IF EXISTS "Booking column protection enforced by trigger" ON public.bookings;

-- 3. Dedicated, column-scoped RPCs for the remaining PSW write paths

CREATE OR REPLACE FUNCTION public.psw_unclaim_shift(
  _booking_id uuid,
  _reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _psw uuid := public.current_psw_profile_id();
  _updated int;
BEGIN
  IF _psw IS NULL THEN
    RAISE EXCEPTION 'Not a caregiver account';
  END IF;

  UPDATE public.bookings
     SET psw_assigned = NULL,
         psw_first_name = NULL,
         psw_photo_url = NULL,
         psw_vehicle_photo_url = NULL,
         psw_license_plate = NULL,
         claimed_at = NULL,
         status = 'pending',
         psw_cancel_reason = _reason,
         psw_cancelled_at = now()
   WHERE id = _booking_id
     AND psw_assigned = _psw
     AND checked_in_at IS NULL;

  GET DIAGNOSTICS _updated = ROW_COUNT;
  IF _updated = 0 THEN
    RAISE EXCEPTION 'Shift not found, not assigned to you, or already started';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.psw_unclaim_shift(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.psw_unclaim_shift(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.psw_save_care_sheet(
  _booking_id uuid,
  _care_sheet jsonb,
  _psw_name text DEFAULT NULL,
  _submit boolean DEFAULT false,
  _flagged boolean DEFAULT false,
  _flag_reason jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _psw uuid := public.current_psw_profile_id();
  _updated int;
BEGIN
  IF _psw IS NULL THEN
    RAISE EXCEPTION 'Not a caregiver account';
  END IF;

  UPDATE public.bookings
     SET care_sheet = _care_sheet,
         care_sheet_status = CASE WHEN _submit THEN 'submitted' ELSE 'draft' END,
         care_sheet_last_saved_at = now(),
         care_sheet_submitted_at = CASE WHEN _submit THEN now() ELSE care_sheet_submitted_at END,
         care_sheet_psw_name = COALESCE(_psw_name, care_sheet_psw_name),
         care_sheet_flagged = CASE WHEN _flagged THEN true ELSE care_sheet_flagged END,
         care_sheet_flag_reason = CASE WHEN _flagged THEN _flag_reason ELSE care_sheet_flag_reason END
   WHERE id = _booking_id
     AND psw_assigned = _psw;

  GET DIAGNOSTICS _updated = ROW_COUNT;
  IF _updated = 0 THEN
    RAISE EXCEPTION 'Shift not found or not assigned to you';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.psw_save_care_sheet(uuid, jsonb, text, boolean, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.psw_save_care_sheet(uuid, jsonb, text, boolean, boolean, jsonb) TO authenticated;