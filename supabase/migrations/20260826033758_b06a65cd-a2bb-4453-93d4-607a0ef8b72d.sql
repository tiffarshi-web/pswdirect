DO $migration$
DECLARE
  v_def text;
  v_original text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'claim_booking'
    AND pg_get_function_identity_arguments(p.oid) = 'p_booking_id uuid, p_psw_id uuid, p_psw_name text, p_psw_photo_url text, p_psw_vehicle_photo_url text, p_psw_license_plate text, p_correlation_id text';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'claim_booking function was not found';
  END IF;

  v_original := v_def;

  v_def := replace(
    v_def,
    'v_caller_email := lower(coalesce(auth.jwt() ->> ''email'', ''''));',
    'v_caller_email := lower(btrim(coalesce(auth.jwt() ->> ''email'', '''')));'
  );

  v_def := replace(
    v_def,
    'lower(coalesce(v_psw.email, '''')) <> v_caller_email',
    'lower(btrim(coalesce(v_psw.email, ''''))) <> v_caller_email'
  );

  IF v_def = v_original
     OR position('lower(btrim(coalesce(auth.jwt() ->> ''email'', '''')))' in v_def) = 0
     OR position('lower(btrim(coalesce(v_psw.email, ''''))) <> v_caller_email' in v_def) = 0 THEN
    RAISE EXCEPTION 'claim_booking identity patch did not match the live function';
  END IF;

  EXECUTE v_def;
END;
$migration$;

REVOKE ALL ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) TO service_role;