
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS recovered_from_payment_intent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recovery_source text;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_stripe_payment_intent_id_uniq
  ON public.bookings (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Reuse booking-code sequence used elsewhere; fall back to a timestamped code if absent.
CREATE OR REPLACE FUNCTION public.create_recovery_booking_from_pi(
  p_payment_intent_id text,
  p_amount            numeric,
  p_client_email      text,
  p_client_name       text DEFAULT NULL,
  p_client_phone      text DEFAULT NULL,
  p_service_type      text DEFAULT NULL,
  p_service_date      text DEFAULT NULL,
  p_service_time      text DEFAULT NULL,
  p_payment_status    text DEFAULT 'awaiting_payment',
  p_status            text DEFAULT 'awaiting_payment',
  p_source            text DEFAULT 'stripe_webhook'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_id uuid;
  v_code text;
  v_service_arr text[];
  v_date date;
  v_start time;
  v_end time;
BEGIN
  -- Idempotency: if any booking already references this PaymentIntent, return it.
  IF p_payment_intent_id IS NOT NULL THEN
    SELECT id INTO v_existing FROM public.bookings
      WHERE stripe_payment_intent_id = p_payment_intent_id LIMIT 1;
    IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  END IF;

  -- Generate a placeholder booking code
  BEGIN
    v_code := public.format_booking_code(nextval('booking_code_seq'));
  EXCEPTION WHEN OTHERS THEN
    v_code := 'CDT-REC-' || to_char(now(), 'YYMMDDHH24MISS');
  END;

  v_service_arr := CASE
    WHEN p_service_type IS NULL OR p_service_type = '' THEN ARRAY['Recovered Booking']::text[]
    ELSE string_to_array(p_service_type, ',')
  END;

  BEGIN v_date := COALESCE(p_service_date::date, CURRENT_DATE);
  EXCEPTION WHEN OTHERS THEN v_date := CURRENT_DATE; END;

  BEGIN v_start := COALESCE(p_service_time::time, '00:00'::time);
  EXCEPTION WHEN OTHERS THEN v_start := '00:00'::time; END;
  v_end := (v_start + INTERVAL '1 hour')::time;

  INSERT INTO public.bookings (
    booking_code, client_email, client_name, client_phone, client_address,
    patient_name, patient_address, service_type,
    scheduled_date, start_time, end_time,
    hours, hourly_rate, subtotal, total,
    status, payment_status, stripe_payment_intent_id,
    recovered_from_payment_intent, recovery_source, admin_notes
  ) VALUES (
    v_code,
    COALESCE(NULLIF(p_client_email, ''), 'unknown@recovered.local'),
    COALESCE(NULLIF(p_client_name,  ''), 'Recovered Customer'),
    p_client_phone,
    'UNKNOWN — recovered from Stripe',
    COALESCE(NULLIF(p_client_name, ''), 'Recovered Customer'),
    'UNKNOWN — recovered from Stripe',
    v_service_arr,
    v_date, v_start, v_end,
    1, COALESCE(p_amount, 0), COALESCE(p_amount, 0), COALESCE(p_amount, 0),
    p_status, p_payment_status, p_payment_intent_id,
    true, p_source,
    'Auto-recovered from Stripe PaymentIntent ' || COALESCE(p_payment_intent_id, '(unknown)')
      || '. Original booking row was missing — please review and complete client/service details.'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_recovery_booking_from_pi(text, numeric, text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_recovery_booking_from_pi(text, numeric, text, text, text, text, text, text, text, text, text) TO service_role;
