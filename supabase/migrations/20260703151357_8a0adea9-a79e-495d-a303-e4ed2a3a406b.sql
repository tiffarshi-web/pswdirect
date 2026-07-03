
-- Ephemeral test harness: probes trigger by impersonating a non-admin user via GUCs,
-- running an UPDATE inside a savepoint, and rolling back. Nothing is persisted.
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
    -- Reached only if trigger allowed the write. Force rollback of this savepoint.
    RAISE EXCEPTION 'ALLOWED' USING ERRCODE = 'P0001';
  EXCEPTION
    WHEN OTHERS THEN
      v_sqlstate := SQLSTATE;
      v_msg := SQLERRM;
      v_blocked := (v_sqlstate = '42501');
  END;
  scenario := p_column;
  sqlstate_code := v_sqlstate;
  error_message := left(v_msg, 200);
  blocked := v_blocked;
  RETURN NEXT;
END;
$$;

-- Run the suite against a real assigned booking
DO $$
DECLARE
  r record;
  bid uuid := '6eeeba7e-f58f-4a79-87a5-b07f030a3aa6';
BEGIN
  RAISE NOTICE '=== Booking column-lock regression: booking % ===', bid;
  FOR r IN
    SELECT * FROM (VALUES
      ('psw_pay_rate',            '999'),
      ('hourly_rate',             '999'),
      ('total',                   '1'),
      ('subtotal',                '1'),
      ('hst_amount',              '0'),
      ('payment_status',          quote_literal('refunded')),
      ('verification_status',     quote_literal('verified')),
      ('adjustment_amount',       '5000'),
      ('adjustment_status',       quote_literal('charged')),
      ('billing_note',            quote_literal('hijack')),
      ('stripe_payment_intent_id',quote_literal('pi_hijack')),
      ('stripe_customer_id',      quote_literal('cus_hijack')),
      ('billing_adjustment_required', 'true')
    ) AS t(col, val)
  LOOP
    FOR r IN SELECT * FROM public._test_booking_column_lock(bid, r.col, r.val) LOOP
      RAISE NOTICE '  % | sqlstate=% | blocked=% | %',
        rpad(r.scenario, 28), r.sqlstate_code, r.blocked, r.error_message;
    END LOOP;
  END LOOP;
END $$;

DROP FUNCTION public._test_booking_column_lock(uuid, text, text, uuid);
