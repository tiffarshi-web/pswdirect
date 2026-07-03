
CREATE OR REPLACE FUNCTION public._test_booking_column_lock(
  p_booking_id uuid,
  p_column text,
  p_sql_value text,
  p_fake_uid uuid DEFAULT '11111111-1111-1111-1111-111111111111'::uuid
) RETURNS TABLE(scenario text, sqlstate_code text, error_message text, blocked boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sqlstate text := '00000';
  v_msg text := '';
  v_blocked boolean := false;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', p_fake_uid::text, 'role', 'authenticated', 'email', 'regression@test.local')::text,
      true);
    EXECUTE format('UPDATE public.bookings SET %I = %s WHERE id = %L',
                   p_column, p_sql_value, p_booking_id);
    RAISE EXCEPTION 'ALLOWED_BY_TRIGGER' USING ERRCODE = 'P0001';
  EXCEPTION
    WHEN OTHERS THEN
      v_sqlstate := SQLSTATE;
      v_msg := SQLERRM;
      v_blocked := (v_sqlstate = '42501');
  END;
  scenario := p_column;
  sqlstate_code := v_sqlstate;
  error_message := left(v_msg, 240);
  blocked := v_blocked;
  RETURN NEXT;
END;
$$;

-- Restrict execution to service_role only (assistant read_query uses service role).
REVOKE ALL ON FUNCTION public._test_booking_column_lock(uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._test_booking_column_lock(uuid, text, text, uuid) TO service_role;
