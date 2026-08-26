DO $migration$
DECLARE
  v_oid oid;
  v_def text;
  v_old text := $needle$
  IF NOT v_is_admin THEN
    SELECT count(*) INTO v_conflicts
$needle$;
  v_new text := $replacement$
  -- Re-check the same authoritative predicate used by Available Jobs while the
  -- booking row is locked. This closes the visibility-to-claim race and prevents
  -- direct RPC calls from bypassing radius, date, gender, language, coordinate,
  -- vehicle, payment, VSC, lifecycle, and QA-isolation rules.
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1
    FROM public.psw_eligible_booking_ids(p_psw_id) eligible
    WHERE eligible.booking_id = p_booking_id
  ) THEN
    PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, 'failed', 'outside_eligibility', p_correlation_id, NULL);
    RETURN jsonb_build_object('ok', false, 'reason', 'outside_eligibility');
  END IF;

  IF NOT v_is_admin THEN
    SELECT count(*) INTO v_conflicts
$replacement$;
BEGIN
  SELECT p.oid, pg_get_functiondef(p.oid)
  INTO v_oid, v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'claim_booking'
    AND pg_get_function_identity_arguments(p.oid) = 'p_booking_id uuid, p_psw_id uuid, p_psw_name text, p_psw_photo_url text, p_psw_vehicle_photo_url text, p_psw_license_plate text, p_correlation_id text';

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'claim_booking function was not found';
  END IF;

  IF position('outside_eligibility' IN v_def) > 0 THEN
    RETURN;
  END IF;

  IF position(v_old IN v_def) = 0 THEN
    RAISE EXCEPTION 'claim_booking eligibility patch did not match the live function';
  END IF;

  v_def := replace(v_def, v_old, v_new);
  EXECUTE v_def;
END;
$migration$;

REVOKE ALL ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) TO service_role;