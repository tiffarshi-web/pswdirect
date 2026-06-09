
-- Safety: enforce ordering on new rows only
ALTER TABLE public.shift_time_adjustments
  DROP CONSTRAINT IF EXISTS chk_sta_order;
ALTER TABLE public.shift_time_adjustments
  ADD CONSTRAINT chk_sta_order
  CHECK (adjusted_clock_out > adjusted_clock_in) NOT VALID;

CREATE OR REPLACE FUNCTION public.admin_apply_shift_correction(
  p_booking_id uuid,
  p_adjusted_in timestamptz,
  p_adjusted_out timestamptz,
  p_reason text,
  p_billable_hours numeric DEFAULT NULL,
  p_confirm_followup boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin       text;
  b             public.bookings%ROWTYPE;
  v_booked_min  int;
  v_worked_min  int;
  v_overtime    int;
  v_closed      boolean;
  v_in_changed  boolean;
  v_out_changed boolean;
  v_sta_id      uuid;
  v_billing     jsonb := NULL;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  IF p_adjusted_in IS NULL OR p_adjusted_out IS NULL THEN
    RAISE EXCEPTION 'Both adjusted clock-in and clock-out are required';
  END IF;
  IF p_adjusted_out <= p_adjusted_in THEN
    RAISE EXCEPTION 'Adjusted clock-out must be after adjusted clock-in';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Adjustment reason is required';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Protect against silent overwrite of a closed billing adjustment
  v_closed := lower(COALESCE(b.adjustment_status,'')) IN ('charged','refunded');
  IF v_closed AND NOT p_confirm_followup THEN
    RAISE EXCEPTION 'follow_up_confirmation_required: booking adjustment_status=% requires explicit follow-up confirmation', b.adjustment_status
      USING ERRCODE = 'check_violation';
  END IF;

  v_in_changed  := (b.checked_in_at  IS DISTINCT FROM p_adjusted_in);
  v_out_changed := (b.signed_out_at IS DISTINCT FROM p_adjusted_out);

  -- 1. Audit row
  INSERT INTO public.shift_time_adjustments
    (booking_id, original_clock_in, original_clock_out,
     adjusted_clock_in, adjusted_clock_out, adjustment_reason, adjusted_by)
  VALUES
    (p_booking_id, b.checked_in_at, b.signed_out_at,
     p_adjusted_in, p_adjusted_out, btrim(p_reason), v_admin)
  RETURNING id INTO v_sta_id;

  -- 2. Per-field admin adjustments
  IF v_in_changed THEN
    INSERT INTO public.shift_admin_adjustments
      (booking_id, booking_code, admin_email, field_name, original_value, new_value, reason)
    VALUES
      (p_booking_id, b.booking_code, v_admin, 'checked_in_at',
       b.checked_in_at::text, p_adjusted_in::text, btrim(p_reason));
  END IF;
  IF v_out_changed THEN
    INSERT INTO public.shift_admin_adjustments
      (booking_id, booking_code, admin_email, field_name, original_value, new_value, reason)
    VALUES
      (p_booking_id, b.booking_code, v_admin, 'signed_out_at',
       b.signed_out_at::text, p_adjusted_out::text, btrim(p_reason));
  END IF;

  -- 3. Preserve originals on first edit only
  IF v_in_changed AND b.original_checked_in_at IS NULL THEN
    UPDATE public.bookings SET original_checked_in_at = b.checked_in_at WHERE id = p_booking_id;
  END IF;
  IF v_out_changed AND b.original_signed_out_at IS NULL THEN
    UPDATE public.bookings SET original_signed_out_at = b.signed_out_at WHERE id = p_booking_id;
  END IF;

  -- 4. Compute overtime (worked − booked)
  v_booked_min := COALESCE((b.hours * 60)::int, 0);
  v_worked_min := GREATEST(0, EXTRACT(EPOCH FROM (p_adjusted_out - p_adjusted_in))::int / 60);
  v_overtime   := GREATEST(0, v_worked_min - v_booked_min);

  -- 5. Update booking
  UPDATE public.bookings
  SET checked_in_at        = p_adjusted_in,
      signed_out_at        = p_adjusted_out,
      overtime_minutes     = v_overtime,
      flagged_for_overtime = (v_overtime >= 15),
      updated_at           = now()
  WHERE id = p_booking_id;

  -- 6. Recalculate payroll (uses existing function — math unchanged)
  PERFORM public.upsert_payroll_entry_for_booking(p_booking_id);

  -- 7. Optional billing recalc (only if caller passed billable hours)
  IF p_billable_hours IS NOT NULL AND p_billable_hours > 0 THEN
    IF ABS(p_billable_hours - COALESCE(b.hours, 0)) > 0.05 THEN
      v_billing := public.admin_set_billable_hours(
        p_booking_id,
        p_billable_hours,
        'Time adjustment: ' || btrim(p_reason)
      );
    END IF;
  END IF;

  -- 8. Audit log
  INSERT INTO public.admin_audit_log
    (action, actor_email, booking_id, booking_code, reason, details)
  VALUES (
    'shift_correction_applied',
    v_admin,
    p_booking_id,
    b.booking_code,
    btrim(p_reason),
    jsonb_build_object(
      'shift_time_adjustment_id', v_sta_id,
      'before', jsonb_build_object(
        'checked_in_at',  b.checked_in_at,
        'signed_out_at',  b.signed_out_at,
        'overtime_minutes', b.overtime_minutes,
        'adjustment_status', b.adjustment_status,
        'final_billable_hours', b.final_billable_hours
      ),
      'after', jsonb_build_object(
        'checked_in_at', p_adjusted_in,
        'signed_out_at', p_adjusted_out,
        'overtime_minutes', v_overtime,
        'billable_hours_requested', p_billable_hours
      ),
      'follow_up_after_close', v_closed,
      'billing_result', v_billing
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'shift_time_adjustment_id', v_sta_id,
    'overtime_minutes', v_overtime,
    'follow_up', v_closed,
    'billing', v_billing
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_apply_shift_correction(uuid, timestamptz, timestamptz, text, numeric, boolean) TO authenticated;
