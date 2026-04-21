
-- Extend admin_set_billable_hours to handle negative variance (refund flow)
-- Negative variance → flag for refund, store absolute refund amount in adjustment_amount.
-- Positive variance → existing charge flow (unchanged behavior).
CREATE OR REPLACE FUNCTION public.admin_set_billable_hours(p_booking_id uuid, p_billable_hours numeric, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin text;
  b public.bookings%ROWTYPE;
  v_booked numeric;
  v_rate numeric;
  v_variance numeric;
  v_abs_variance numeric;
  v_tax_rate numeric := 0;
  v_subtotal numeric;
  v_tax numeric;
  v_total numeric;
  v_needs_charge boolean;
  v_needs_refund boolean;
  v_new_status text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  v_booked := COALESCE(b.hours, 0);
  v_rate := COALESCE(b.hourly_rate, 0);
  v_variance := ROUND((p_billable_hours - v_booked)::numeric, 2);
  v_abs_variance := ABS(v_variance);
  v_needs_charge := v_variance > 0.05;
  v_needs_refund := v_variance < -0.05;

  IF COALESCE(b.is_taxable, false) THEN
    v_tax_rate := 0.13;
  END IF;

  v_subtotal := ROUND((v_abs_variance * v_rate)::numeric, 2);
  v_tax := ROUND((v_subtotal * v_tax_rate)::numeric, 2);
  v_total := ROUND((v_subtotal + v_tax)::numeric, 2);

  -- Status: 'needs_action' for charge, 'refund_required' for refund, preserve closed states
  v_new_status := CASE
    WHEN v_needs_charge THEN COALESCE(NULLIF(b.adjustment_status,''),'needs_action')
    WHEN v_needs_refund THEN 'refund_required'
    ELSE b.adjustment_status
  END;

  UPDATE public.bookings
  SET final_billable_hours = ROUND(p_billable_hours::numeric, 2),
      billing_adjustment_required = (v_needs_charge OR v_needs_refund),
      adjustment_amount = CASE WHEN (v_needs_charge OR v_needs_refund) THEN v_total ELSE adjustment_amount END,
      adjustment_status = v_new_status,
      billing_note = COALESCE(p_note, billing_note),
      billing_adjustment_handled_at = CASE WHEN (v_needs_charge OR v_needs_refund) THEN NULL ELSE billing_adjustment_handled_at END,
      billing_adjustment_handled_by = CASE WHEN (v_needs_charge OR v_needs_refund) THEN NULL ELSE billing_adjustment_handled_by END,
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'final_billable_hours', ROUND(p_billable_hours::numeric, 2),
    'booked_hours', v_booked,
    'billing_variance_hours', v_variance,
    'adjustment_subtotal', v_subtotal,
    'adjustment_tax', v_tax,
    'adjustment_total', v_total,
    'needs_charge', v_needs_charge,
    'needs_refund', v_needs_refund,
    'set_by', v_admin
  );
END;
$function$;

-- Record a refund for a billing adjustment (delta-only against original PI)
CREATE OR REPLACE FUNCTION public.admin_record_adjustment_refund(
  p_booking_id uuid,
  p_stripe_refund_id text,
  p_amount numeric,
  p_failure_reason text DEFAULT NULL::text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin text;
  v_success boolean;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');
  v_success := p_stripe_refund_id IS NOT NULL AND p_failure_reason IS NULL;

  UPDATE public.bookings
  SET adjustment_amount = COALESCE(p_amount, adjustment_amount),
      adjustment_charged_at = now(),
      adjustment_charged_by = v_admin,
      adjustment_failure_reason = CASE WHEN v_success THEN NULL ELSE p_failure_reason END,
      adjustment_status = CASE WHEN v_success THEN 'refunded' ELSE 'refund_failed' END,
      billing_adjustment_required = CASE WHEN v_success THEN false ELSE true END,
      billing_adjustment_handled_at = CASE WHEN v_success THEN now() ELSE billing_adjustment_handled_at END,
      billing_adjustment_handled_by = CASE WHEN v_success THEN v_admin ELSE billing_adjustment_handled_by END,
      stripe_adjustment_status = CASE WHEN v_success THEN 'refunded' ELSE 'refund_failed' END,
      updated_at = now()
  WHERE id = p_booking_id;
END;
$function$;
