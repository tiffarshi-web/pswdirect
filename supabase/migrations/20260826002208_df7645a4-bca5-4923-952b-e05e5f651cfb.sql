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
    '  v_code text;
BEGIN',
    '  v_code text;
  v_already_assigned_to_psw boolean := false;
BEGIN'
  );

  v_def := replace(
    v_def,
    '  IF v_booking.status <> ''pending'' OR (v_booking.psw_assigned IS NOT NULL AND v_booking.psw_assigned <> '''') THEN
    PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, ''failed'', ''already_claimed'', p_correlation_id, NULL);
    RETURN jsonb_build_object(''ok'', false, ''reason'', ''already_claimed'');
  END IF;',
    '  IF v_booking.psw_assigned = p_psw_id::text
     AND v_booking.status IN (''active'', ''claimed'') THEN
    v_already_assigned_to_psw := true;
  ELSIF v_booking.status <> ''pending'' OR (v_booking.psw_assigned IS NOT NULL AND v_booking.psw_assigned <> '''') THEN
    PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, ''failed'', ''already_claimed'', p_correlation_id, NULL);
    RETURN jsonb_build_object(''ok'', false, ''reason'', ''already_claimed'');
  END IF;'
  );

  v_def := replace(
    v_def,
    '  END IF;

  v_booking_is_test := COALESCE(v_booking.is_test_data, false);',
    '  END IF;

  IF v_already_assigned_to_psw THEN
    PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, ''success'', ''already_assigned_to_psw'', p_correlation_id, NULL);
    RETURN jsonb_build_object(''ok'', true, ''booking_id'', p_booking_id, ''already_assigned'', true);
  END IF;

  v_booking_is_test := COALESCE(v_booking.is_test_data, false);'
  );

  IF v_def = v_original
     OR position('v_already_assigned_to_psw boolean := false' in v_def) = 0
     OR position('''already_assigned_to_psw''' in v_def) = 0 THEN
    RAISE EXCEPTION 'claim_booking safety patch did not match the live function';
  END IF;

  EXECUTE v_def;
END;
$migration$;

REVOKE ALL ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) TO service_role;