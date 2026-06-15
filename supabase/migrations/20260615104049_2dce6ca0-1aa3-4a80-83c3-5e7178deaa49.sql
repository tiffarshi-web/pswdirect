-- Phase 3: Atomic finalization RPC for successful Stripe payments.
-- This SECURITY DEFINER function handles ALL database writes for a successful
-- payment in a single transaction so booking + invoice updates cannot
-- partially fail. Side effects (PSW dispatch, emails) remain in the webhook
-- and run only after this RPC succeeds; their own idempotency guards
-- (dispatch_logs check, email_history dedup) prevent duplicates.

CREATE OR REPLACE FUNCTION public.admin_finalize_paid_booking_from_stripe(
  p_booking_id uuid,
  p_payment_intent_id text,
  p_stripe_charge_id text DEFAULT NULL,
  p_stripe_customer_id text DEFAULT NULL,
  p_stripe_payment_method_id text DEFAULT NULL,
  p_amount_paid numeric DEFAULT NULL,
  p_currency text DEFAULT 'cad',
  p_stripe_event_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_invoice_id uuid;
  v_invoice_number text;
  v_existing_invoice_id uuid;
  v_hst_amount numeric := 0;
  v_subtotal numeric;
  v_surge numeric;
  v_total numeric;
  v_service_label text;
  v_total_minutes int := 0;
  v_taxable_minutes int := 0;
  v_taxable_fraction numeric := 0;
  v_pricing_snapshot jsonb;
  v_already_finalized boolean := false;
BEGIN
  -- 1) Lock the booking row to serialize concurrent webhook deliveries
  SELECT * INTO v_booking
    FROM public.bookings
   WHERE id = p_booking_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- 2) Idempotency: already paid with the same PI → return success, do nothing
  IF v_booking.payment_status = 'paid'
     AND v_booking.stripe_payment_intent_id IS NOT NULL
     AND v_booking.stripe_payment_intent_id = p_payment_intent_id THEN
    v_already_finalized := true;

    SELECT id, invoice_number INTO v_existing_invoice_id, v_invoice_number
      FROM public.invoices
     WHERE booking_id = v_booking.id AND invoice_type = 'client_invoice'
     LIMIT 1;

    -- Still mark the webhook event processed so admins see it green
    IF p_stripe_event_id IS NOT NULL THEN
      UPDATE public.stripe_webhook_events
         SET status = 'processed', processed_at = now()
       WHERE event_id = p_stripe_event_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'already_finalized', true,
      'booking_id', v_booking.id,
      'booking_code', v_booking.booking_code,
      'invoice_id', v_existing_invoice_id,
      'invoice_number', v_invoice_number,
      'status', v_booking.status
    );
  END IF;

  -- 3) Defensive: refuse to overwrite a different PI on an already-paid booking
  IF v_booking.payment_status = 'paid'
     AND v_booking.stripe_payment_intent_id IS NOT NULL
     AND v_booking.stripe_payment_intent_id <> p_payment_intent_id THEN
    RAISE EXCEPTION 'booking_already_paid_with_different_payment_intent: existing=% incoming=%',
      v_booking.stripe_payment_intent_id, p_payment_intent_id
      USING ERRCODE = 'P0001';
  END IF;

  v_subtotal := COALESCE(v_booking.subtotal, 0);
  v_surge := COALESCE(v_booking.surge_amount, 0);
  v_total := COALESCE(v_booking.total, 0);
  v_service_label := COALESCE(array_to_string(v_booking.service_type, ', '), 'Home Care');

  -- 4) Compute HST from service_tasks (same rule as webhook). Pricing/tax
  --    calculation is preserved verbatim — do NOT change rates or rules.
  IF v_booking.service_type IS NOT NULL AND array_length(v_booking.service_type, 1) > 0 THEN
    SELECT COALESCE(SUM(COALESCE(included_minutes, 30)), 0),
           COALESCE(SUM(CASE WHEN apply_hst THEN COALESCE(included_minutes, 30) ELSE 0 END), 0)
      INTO v_total_minutes, v_taxable_minutes
      FROM public.service_tasks
     WHERE task_name = ANY (v_booking.service_type);

    IF v_total_minutes > 0 THEN
      v_taxable_fraction := v_taxable_minutes::numeric / v_total_minutes::numeric;
      v_hst_amount := round(v_subtotal * v_taxable_fraction * 0.13 * 100) / 100;
    ELSIF COALESCE(v_booking.is_transport_booking, false)
       OR EXISTS (
            SELECT 1 FROM unnest(v_booking.service_type) s
             WHERE s ~* '(doctor|escort|hospital|discharge)'
          ) THEN
      v_hst_amount := round(v_subtotal * 0.13 * 100) / 100;
    END IF;
  END IF;

  -- 5) Update booking → paid, save Stripe identifiers, promote to pending
  UPDATE public.bookings
     SET payment_status = 'paid',
         stripe_payment_intent_id = p_payment_intent_id,
         stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
         stripe_payment_method_id = COALESCE(p_stripe_payment_method_id, stripe_payment_method_id),
         status = CASE WHEN status = 'awaiting_payment' THEN 'pending' ELSE status END,
         updated_at = now()
   WHERE id = v_booking.id
   RETURNING * INTO v_booking;

  -- 6) Generate / reuse invoice number
  SELECT id, invoice_number INTO v_existing_invoice_id, v_invoice_number
    FROM public.invoices
   WHERE booking_id = v_booking.id AND invoice_type = 'client_invoice'
   LIMIT 1;

  IF v_invoice_number IS NULL THEN
    BEGIN
      v_invoice_number := public.generate_invoice_number();
    EXCEPTION WHEN OTHERS THEN
      v_invoice_number := v_booking.booking_code;
    END;
  END IF;

  v_pricing_snapshot := jsonb_build_object(
    'subtotal', v_subtotal,
    'surgeAmount', v_surge,
    'hstAmount', v_hst_amount,
    'total', v_total,
    'hours', v_booking.hours,
    'serviceType', v_service_label,
    'isTransport', COALESCE(v_booking.is_transport_booking, false),
    'isAsap', COALESCE(v_booking.is_asap, false),
    'scheduledDate', v_booking.scheduled_date,
    'startTime', v_booking.start_time,
    'endTime', v_booking.end_time,
    'capturedAt', to_jsonb(now()),
    'stripePaymentIntentId', p_payment_intent_id,
    'stripeChargeId', p_stripe_charge_id,
    'amountPaid', p_amount_paid,
    'currency', p_currency
  );

  -- 7) Upsert invoice (idempotent on UNIQUE(booking_id, invoice_type))
  INSERT INTO public.invoices (
    booking_id, invoice_number, booking_code, client_email, client_name,
    invoice_type, subtotal, tax, surge_amount, rush_amount, total, currency,
    status, document_status, service_type, duration_hours, pricing_snapshot,
    stripe_payment_intent_id, client_phone, client_address, client_postal_code, client_province,
    payment_reference, paid_at
  ) VALUES (
    v_booking.id, v_invoice_number, v_booking.booking_code, v_booking.client_email, v_booking.client_name,
    'client_invoice', v_subtotal, v_hst_amount, v_surge, 0, v_total, COALESCE(p_currency, 'CAD'),
    'generated', 'paid', v_service_label, v_booking.hours, v_pricing_snapshot,
    p_payment_intent_id, v_booking.client_phone,
    COALESCE(v_booking.patient_address, v_booking.client_address),
    COALESCE(v_booking.patient_postal_code, v_booking.client_postal_code),
    'ON',
    COALESCE(p_stripe_charge_id, p_payment_intent_id), now()
  )
  ON CONFLICT (booking_id, invoice_type) DO UPDATE
     SET stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
         document_status = 'paid',
         paid_at = COALESCE(public.invoices.paid_at, now()),
         payment_reference = COALESCE(public.invoices.payment_reference, EXCLUDED.payment_reference),
         pricing_snapshot = EXCLUDED.pricing_snapshot,
         updated_at = now()
  RETURNING id, invoice_number INTO v_invoice_id, v_invoice_number;

  -- 8) Mark webhook event processed (best-effort; missing row not fatal)
  IF p_stripe_event_id IS NOT NULL THEN
    UPDATE public.stripe_webhook_events
       SET status = 'processed', processed_at = now()
     WHERE event_id = p_stripe_event_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_finalized', false,
    'booking_id', v_booking.id,
    'booking_code', v_booking.booking_code,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'status', v_booking.status,
    'payment_status', v_booking.payment_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_finalize_paid_booking_from_stripe(
  uuid, text, text, text, text, numeric, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_finalize_paid_booking_from_stripe(
  uuid, text, text, text, text, numeric, text, text
) TO service_role;