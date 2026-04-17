
-- =========================================================
-- 1) Trigger: when payroll override exceeds booked, suggest billable hours on booking
-- =========================================================
CREATE OR REPLACE FUNCTION public.suggest_billable_from_payroll()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_booked numeric;
  v_final numeric;
BEGIN
  -- shift_id maps to bookings.id (text -> uuid)
  BEGIN
    v_booking_id := NEW.shift_id::uuid;
  EXCEPTION WHEN others THEN
    RETURN NEW;
  END;

  v_booked := COALESCE(NEW.booked_hours, 0);
  v_final := COALESCE(NEW.payable_hours_override, NEW.hours_worked, v_booked);

  IF v_final - v_booked > 0.05 THEN
    UPDATE public.bookings
    SET suggested_billable_hours = ROUND(v_final::numeric, 2),
        updated_at = now()
    WHERE id = v_booking_id
      AND (final_billable_hours IS NULL OR final_billable_hours = booked_hours_compat(hours))
      AND COALESCE(suggested_billable_hours, -1) <> ROUND(v_final::numeric, 2);
  END IF;

  RETURN NEW;
END;
$$;

-- Helper: tolerate hours type
CREATE OR REPLACE FUNCTION public.booked_hours_compat(p_hours numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT p_hours; $$;

DROP TRIGGER IF EXISTS trg_suggest_billable_from_payroll ON public.payroll_entries;
CREATE TRIGGER trg_suggest_billable_from_payroll
AFTER INSERT OR UPDATE OF payable_hours_override, hours_worked, booked_hours
ON public.payroll_entries
FOR EACH ROW
EXECUTE FUNCTION public.suggest_billable_from_payroll();

-- =========================================================
-- 2) RPC: admin_set_billable_hours — admin sets final_billable_hours on booking
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_set_billable_hours(
  p_booking_id uuid,
  p_billable_hours numeric,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin text;
  b public.bookings%ROWTYPE;
  v_booked numeric;
  v_rate numeric;
  v_variance numeric;
  v_tax_rate numeric := 0;
  v_subtotal numeric;
  v_tax numeric;
  v_total numeric;
  v_needs boolean;
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
  v_needs := v_variance > 0.05;

  -- Mirror original booking's tax setting
  IF COALESCE(b.is_taxable, false) THEN
    v_tax_rate := 0.13;
  END IF;

  v_subtotal := ROUND((GREATEST(v_variance, 0) * v_rate)::numeric, 2);
  v_tax := ROUND((v_subtotal * v_tax_rate)::numeric, 2);
  v_total := ROUND((v_subtotal + v_tax)::numeric, 2);

  UPDATE public.bookings
  SET final_billable_hours = ROUND(p_billable_hours::numeric, 2),
      billing_adjustment_required = v_needs,
      adjustment_amount = v_total,
      adjustment_status = CASE
        WHEN v_needs THEN COALESCE(NULLIF(adjustment_status,''),'needs_action')
        ELSE COALESCE(adjustment_status, NULL)
      END,
      billing_note = COALESCE(p_note, billing_note),
      billing_adjustment_handled_at = CASE WHEN v_needs THEN NULL ELSE billing_adjustment_handled_at END,
      billing_adjustment_handled_by = CASE WHEN v_needs THEN NULL ELSE billing_adjustment_handled_by END,
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
    'billing_adjustment_required', v_needs,
    'set_by', v_admin
  );
END;
$$;

-- =========================================================
-- 3) RPC: admin_mark_billing_no_charge — admin absorbs the time
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_mark_billing_no_charge(
  p_booking_id uuid,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  UPDATE public.bookings
  SET billing_adjustment_required = false,
      adjustment_status = 'no_charge',
      billing_adjustment_handled_at = now(),
      billing_adjustment_handled_by = v_admin,
      billing_note = COALESCE(p_note, billing_note),
      updated_at = now()
  WHERE id = p_booking_id;
END;
$$;

-- =========================================================
-- 4) RPC: admin_mark_billing_handled_v2 — manually handled outside system
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_mark_billing_handled_v2(
  p_booking_id uuid,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_admin text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  UPDATE public.bookings
  SET billing_adjustment_required = false,
      adjustment_status = 'handled_manually',
      billing_adjustment_handled_at = now(),
      billing_adjustment_handled_by = v_admin,
      billing_note = COALESCE(p_note, billing_note),
      updated_at = now()
  WHERE id = p_booking_id;
END;
$$;

-- =========================================================
-- 5) RPC: admin_record_adjustment_charge — called by edge function after Stripe
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_record_adjustment_charge(
  p_booking_id uuid,
  p_payment_intent_id text,
  p_stripe_status text,
  p_amount numeric,
  p_failure_reason text DEFAULT NULL,
  p_adjustment_invoice_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin text;
  v_success boolean;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');
  v_success := lower(COALESCE(p_stripe_status,'')) IN ('succeeded','requires_capture');

  UPDATE public.bookings
  SET stripe_adjustment_payment_intent_id = p_payment_intent_id,
      stripe_adjustment_status = p_stripe_status,
      adjustment_amount = COALESCE(p_amount, adjustment_amount),
      adjustment_invoice_id = COALESCE(p_adjustment_invoice_id, adjustment_invoice_id),
      adjustment_charged_at = now(),
      adjustment_charged_by = v_admin,
      adjustment_failure_reason = CASE WHEN v_success THEN NULL ELSE p_failure_reason END,
      adjustment_status = CASE WHEN v_success THEN 'charged' ELSE 'failed' END,
      billing_adjustment_required = CASE WHEN v_success THEN false ELSE true END,
      billing_adjustment_handled_at = CASE WHEN v_success THEN now() ELSE billing_adjustment_handled_at END,
      billing_adjustment_handled_by = CASE WHEN v_success THEN v_admin ELSE billing_adjustment_handled_by END,
      updated_at = now()
  WHERE id = p_booking_id;
END;
$$;

-- =========================================================
-- 6) RPC: admin_record_adjustment_invoice_sent — for "Send Adjustment Invoice"
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_record_adjustment_invoice_sent(
  p_booking_id uuid,
  p_adjustment_invoice_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_admin text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  UPDATE public.bookings
  SET adjustment_invoice_id = p_adjustment_invoice_id,
      adjustment_amount = COALESCE(p_amount, adjustment_amount),
      adjustment_status = 'sent_invoice',
      billing_adjustment_required = false,
      billing_adjustment_handled_at = now(),
      billing_adjustment_handled_by = v_admin,
      updated_at = now()
  WHERE id = p_booking_id;
END;
$$;
