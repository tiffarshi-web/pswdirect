
DROP TABLE IF EXISTS public._regression_results_booking_columns;
CREATE TABLE public._regression_results_booking_columns (
  id serial PRIMARY KEY,
  actor text NOT NULL,
  scenario text NOT NULL,
  sqlstate_code text NOT NULL,
  blocked boolean NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public._regression_results_booking_columns TO authenticated, anon, service_role;

DO $$
DECLARE
  bid uuid := '6eeeba7e-f58f-4a79-87a5-b07f030a3aa6';
  fake_client uuid := '11111111-1111-1111-1111-111111111111';
  fake_psw uuid := '09c771b9-552a-408d-a988-b59b287e9793'; -- real assigned PSW user_id
  tests text[][] := ARRAY[
    ARRAY['psw_pay_rate','999'],
    ARRAY['hourly_rate','999'],
    ARRAY['total','1'],
    ARRAY['subtotal','1'],
    ARRAY['hst_amount','0'],
    ARRAY['payment_status', quote_literal('refunded')],
    ARRAY['verification_status', quote_literal('verified')],
    ARRAY['adjustment_amount','5000'],
    ARRAY['adjustment_status', quote_literal('charged')],
    ARRAY['billing_note', quote_literal('hijack')],
    ARRAY['stripe_payment_intent_id', quote_literal('pi_hijack')],
    ARRAY['stripe_customer_id', quote_literal('cus_hijack')],
    ARRAY['billing_adjustment_required','true'],
    ARRAY['client_phone', quote_literal('999-999-9999')] -- permitted, control
  ];
  t text[];
  actors text[][] := ARRAY[
    ARRAY['client', fake_client::text],
    ARRAY['psw',    fake_psw::text]
  ];
  a text[];
  v_sqlstate text; v_msg text; v_blocked boolean;
BEGIN
  FOREACH a SLICE 1 IN ARRAY actors LOOP
    FOREACH t SLICE 1 IN ARRAY tests LOOP
      v_sqlstate := '00000'; v_msg := ''; v_blocked := false;
      BEGIN
        PERFORM set_config('request.jwt.claims',
          json_build_object('sub', a[2], 'role', 'authenticated',
                            'email', a[1] || '@regression.test')::text, true);
        EXECUTE format('UPDATE public.bookings SET %I = %s WHERE id = %L',
                       t[1], t[2], bid);
        RAISE EXCEPTION 'ALLOWED' USING ERRCODE = 'P0001';
      EXCEPTION WHEN OTHERS THEN
        v_sqlstate := SQLSTATE;
        v_msg := SQLERRM;
        v_blocked := (v_sqlstate = '42501');
      END;
      INSERT INTO public._regression_results_booking_columns
        (actor, scenario, sqlstate_code, blocked, error_message)
        VALUES (a[1], t[1], v_sqlstate, v_blocked, left(v_msg,240));
    END LOOP;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public._test_booking_column_lock(uuid, text, text, uuid);
