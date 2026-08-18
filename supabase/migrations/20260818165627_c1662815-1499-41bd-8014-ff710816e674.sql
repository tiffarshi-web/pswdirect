-- 1. Link invoices to booking groups
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS booking_group_id uuid REFERENCES public.booking_groups(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_one_per_group
  ON public.invoices (booking_group_id)
  WHERE booking_group_id IS NOT NULL AND invoice_type = 'group_invoice';

-- Freeze each visit's allocated value on the booking rows themselves
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS group_allocated_total numeric;

-- 2. Authoritative group finalization (idempotent)
CREATE OR REPLACE FUNCTION public.finalize_paid_group_from_stripe(
  p_group_id uuid,
  p_payment_intent_id text,
  p_stripe_charge_id text DEFAULT NULL,
  p_stripe_customer_id text DEFAULT NULL,
  p_stripe_payment_method_id text DEFAULT NULL,
  p_currency text DEFAULT 'CAD',
  p_stripe_event_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group record;
  v_anchor record;
  v_invoice_id uuid;
  v_invoice_number text;
  v_visits jsonb;
  v_total_hours numeric := 0;
  v_already boolean := false;
  v_codes text[];
BEGIN
  SELECT * INTO v_group FROM public.booking_groups WHERE id = p_group_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'group_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT id INTO v_invoice_id FROM public.invoices
   WHERE booking_group_id = p_group_id AND invoice_type = 'group_invoice' LIMIT 1;

  IF v_group.payment_status = 'paid'
     AND v_group.stripe_payment_intent_id IS NOT NULL
     AND v_group.stripe_payment_intent_id = p_payment_intent_id
     AND v_invoice_id IS NOT NULL THEN
    v_already := true;
  END IF;

  IF v_group.payment_status = 'paid'
     AND v_group.stripe_payment_intent_id IS NOT NULL
     AND v_group.stripe_payment_intent_id <> p_payment_intent_id THEN
    RAISE EXCEPTION 'group_already_paid_with_different_payment_intent' USING ERRCODE = 'P0001';
  END IF;

  -- Mark every live visit paid. No per-visit invoice is created.
  UPDATE public.bookings b
     SET payment_status = 'paid',
         stripe_payment_intent_id = p_payment_intent_id,
         stripe_customer_id = COALESCE(p_stripe_customer_id, b.stripe_customer_id),
         stripe_payment_method_id = COALESCE(p_stripe_payment_method_id, b.stripe_payment_method_id),
         group_allocated_total = COALESCE(b.group_allocated_total, b.total),
         status = CASE WHEN b.status = 'awaiting_payment' THEN 'pending' ELSE b.status END,
         updated_at = now()
   WHERE b.booking_group_id = p_group_id
     AND b.status <> 'cancelled';

  SELECT jsonb_agg(v ORDER BY (v->>'visitIndex')::int), sum((v->>'hours')::numeric), array_agg(v->>'bookingCode')
    INTO v_visits, v_total_hours, v_codes
  FROM (
    SELECT jsonb_build_object(
             'visitIndex', COALESCE(b.visit_index, 1),
             'bookingId', b.id,
             'bookingCode', b.booking_code,
             'serviceDate', b.scheduled_date,
             'startTime', b.start_time,
             'endTime', b.end_time,
             'hours', COALESCE(b.hours, 0),
             'hourlyRate', CASE WHEN COALESCE(b.hours,0) > 0
                                THEN round(COALESCE(b.subtotal,0) / b.hours, 2) ELSE 0 END,
             'subtotal', COALESCE(b.subtotal, 0),
             'allocatedTotal', COALESCE(b.group_allocated_total, b.total, 0)
           ) AS v
      FROM public.bookings b
     WHERE b.booking_group_id = p_group_id
       AND b.status <> 'cancelled'
  ) s;

  SELECT * INTO v_anchor FROM public.bookings
   WHERE booking_group_id = p_group_id AND status <> 'cancelled'
   ORDER BY visit_index NULLS LAST LIMIT 1;

  IF v_anchor.id IS NULL THEN
    RAISE EXCEPTION 'group_has_no_live_visits' USING ERRCODE = 'P0002';
  END IF;

  IF v_invoice_id IS NULL THEN
    BEGIN
      v_invoice_number := public.generate_invoice_number();
    EXCEPTION WHEN OTHERS THEN
      v_invoice_number := COALESCE(v_group.group_code, 'GRP-' || left(p_group_id::text, 6));
    END;

    INSERT INTO public.invoices (
      booking_id, booking_group_id, invoice_number, booking_code, client_email, client_name,
      invoice_type, subtotal, tax, surge_amount, rush_amount, total, currency,
      status, document_status, service_type, duration_hours, pricing_snapshot,
      stripe_payment_intent_id, client_phone, client_address, client_postal_code, client_province,
      payment_reference, paid_at
    ) VALUES (
      v_anchor.id, p_group_id, v_invoice_number,
      COALESCE(v_group.group_code, v_anchor.booking_code),
      v_group.client_email, v_group.client_name,
      'group_invoice',
      COALESCE(v_group.subtotal, 0), 0, 0, 0, COALESCE(v_group.total, 0), COALESCE(p_currency, 'CAD'),
      'generated', 'paid', 'Home Care', v_total_hours,
      jsonb_build_object(
        'groupId', p_group_id,
        'groupCode', v_group.group_code,
        'visitCount', COALESCE(jsonb_array_length(v_visits), 0),
        'visits', COALESCE(v_visits, '[]'::jsonb),
        'totalHours', v_total_hours,
        'subtotal', COALESCE(v_group.subtotal, 0),
        'hstAmount', 0,
        'parkingFee', 0,
        'total', COALESCE(v_group.total, 0),
        'serviceRecipient', COALESCE(v_anchor.patient_name, v_group.client_name),
        'serviceAddress', COALESCE(v_anchor.patient_address, v_anchor.client_address),
        'amountPaid', COALESCE(v_group.total, 0),
        'paymentDate', to_jsonb(now()),
        'stripePaymentIntentId', p_payment_intent_id,
        'stripeChargeId', p_stripe_charge_id,
        'capturedAt', to_jsonb(now())
      ),
      p_payment_intent_id, v_group.client_phone,
      COALESCE(v_anchor.patient_address, v_anchor.client_address),
      COALESCE(v_anchor.patient_postal_code, v_anchor.client_postal_code),
      'ON',
      COALESCE(p_stripe_charge_id, p_payment_intent_id), now()
    )
    RETURNING id, invoice_number INTO v_invoice_id, v_invoice_number;
  ELSE
    SELECT invoice_number INTO v_invoice_number FROM public.invoices WHERE id = v_invoice_id;
  END IF;

  UPDATE public.booking_groups
     SET payment_status = 'paid',
         status = 'active',
         stripe_payment_intent_id = p_payment_intent_id,
         stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
         stripe_payment_method_id = COALESCE(p_stripe_payment_method_id, stripe_payment_method_id),
         invoice_id = v_invoice_id,
         updated_at = now()
   WHERE id = p_group_id;

  IF p_stripe_event_id IS NOT NULL THEN
    UPDATE public.stripe_webhook_events
       SET status = 'processed', processed_at = now()
     WHERE event_id = p_stripe_event_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_finalized', v_already,
    'group_id', p_group_id,
    'group_code', v_group.group_code,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'visit_codes', COALESCE(v_codes, ARRAY[]::text[]),
    'total_hours', v_total_hours,
    'total', COALESCE(v_group.total, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_paid_group_from_stripe(uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_paid_group_from_stripe(uuid, text, text, text, text, text, text) TO service_role;

-- 3. Admin group overview
CREATE OR REPLACE FUNCTION public.admin_list_booking_groups()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_out jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(g ORDER BY g->>'createdAt' DESC), '[]'::jsonb) INTO v_out
  FROM (
    SELECT jsonb_build_object(
      'id', bg.id,
      'groupCode', bg.group_code,
      'createdAt', bg.created_at,
      'clientName', bg.client_name,
      'clientEmail', bg.client_email,
      'clientPhone', bg.client_phone,
      'status', bg.status,
      'paymentStatus', bg.payment_status,
      'paymentIntentId', bg.stripe_payment_intent_id,
      'subtotal', bg.subtotal,
      'hstAmount', bg.hst_amount,
      'parkingFee', bg.parking_fee,
      'total', bg.total,
      'visitCount', bg.visit_count,
      'invoiceId', inv.id,
      'invoiceNumber', inv.invoice_number,
      'invoiceStatus', inv.status,
      'invoicePaidAt', inv.paid_at,
      'totalHours', (SELECT COALESCE(sum(b2.hours), 0) FROM public.bookings b2
                      WHERE b2.booking_group_id = bg.id AND b2.status <> 'cancelled'),
      'patientName', (SELECT b3.patient_name FROM public.bookings b3
                       WHERE b3.booking_group_id = bg.id ORDER BY b3.visit_index NULLS LAST LIMIT 1),
      'visits', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
                 'id', b.id,
                 'bookingCode', b.booking_code,
                 'visitIndex', b.visit_index,
                 'scheduledDate', b.scheduled_date,
                 'startTime', b.start_time,
                 'endTime', b.end_time,
                 'hours', b.hours,
                 'status', b.status,
                 'paymentStatus', b.payment_status,
                 'assignedPswName', b.psw_first_name,
                 'assignedPswId', b.assigned_psw_id,
                 'cancelledAt', b.cancelled_at,
                 'allocatedTotal', COALESCE(b.group_allocated_total, b.total)
               ) ORDER BY b.visit_index NULLS LAST), '[]'::jsonb)
          FROM public.bookings b WHERE b.booking_group_id = bg.id
      )
    ) AS g
    FROM public.booking_groups bg
    LEFT JOIN public.invoices inv
      ON inv.booking_group_id = bg.id AND inv.invoice_type = 'group_invoice'
  ) t;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_booking_groups() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_booking_groups() TO authenticated, service_role;