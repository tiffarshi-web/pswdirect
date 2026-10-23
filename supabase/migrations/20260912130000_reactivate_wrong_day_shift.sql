-- Admin-only recovery for a caregiver who attended on the wrong date.
-- Reopens the same paid booking, preserves its assigned PSW, and removes the
-- mistaken completion from operational/payroll views until the real visit ends.
CREATE OR REPLACE FUNCTION public.admin_reactivate_wrong_day_shift(
  p_booking_id uuid,
  p_correct_date date,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin text;
  v_booking public.bookings%ROWTYPE;
  v_payroll public.payroll_entries%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_correct_date IS NULL THEN
    RAISE EXCEPTION 'Correct service date is required';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A correction reason of at least 5 characters is required';
  END IF;

  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  IF v_booking.psw_assigned IS NULL OR v_booking.psw_assigned = '' THEN
    RAISE EXCEPTION 'The order has no assigned PSW';
  END IF;
  IF v_booking.checked_in_at IS NULL AND v_booking.signed_out_at IS NULL
     AND v_booking.status NOT IN ('completed', 'in-progress') THEN
    RAISE EXCEPTION 'The order has no attendance record to correct';
  END IF;

  SELECT * INTO v_payroll
  FROM public.payroll_entries
  WHERE shift_id = p_booking_id::text
  FOR UPDATE;

  -- Never silently undo money that has entered a payout workflow.
  IF FOUND AND (
    v_payroll.status = 'cleared'
    OR v_payroll.cleared_at IS NOT NULL
    OR v_payroll.payout_request_id IS NOT NULL
    OR v_payroll.manual_payout_id IS NOT NULL
    OR v_payroll.manually_paid_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Payroll for this order is already in a payout workflow. Reverse or void that payout before reactivating the order.';
  END IF;

  INSERT INTO public.admin_audit_log
    (action, actor_email, booking_id, booking_code, psw_id, reason, details)
  VALUES (
    'wrong_day_shift_reactivated',
    v_admin,
    v_booking.id,
    v_booking.booking_code,
    v_booking.psw_assigned,
    btrim(p_reason),
    jsonb_build_object(
      'previous_status', v_booking.status,
      'previous_scheduled_date', v_booking.scheduled_date,
      'correct_scheduled_date', p_correct_date,
      'mistaken_checked_in_at', v_booking.checked_in_at,
      'mistaken_signed_out_at', v_booking.signed_out_at,
      'mistaken_care_sheet', v_booking.care_sheet,
      'assigned_psw_name', v_booking.psw_first_name
    )
  );

  -- Pending earnings/overtime were created from the mistaken visit and must
  -- not remain payable. Paid/linked payroll is blocked above.
  DELETE FROM public.payroll_entries
  WHERE shift_id = p_booking_id::text;

  DELETE FROM public.overtime_charges
  WHERE booking_id = p_booking_id
    AND status IN ('pending_admin', 'pending', 'rejected');

  PERFORM set_config('app.trusted_rpc', 'on', true);

  UPDATE public.bookings
  SET scheduled_date = p_correct_date,
      status = 'active',
      checked_in_at = NULL,
      signed_out_at = NULL,
      check_in_lat = NULL,
      check_in_lng = NULL,
      check_in_accuracy_m = NULL,
      check_in_distance_m = NULL,
      check_in_outside_radius = false,
      gps_check_in_failed = false,
      gps_check_in_failure_reason = NULL,
      sign_out_lat = NULL,
      sign_out_lng = NULL,
      sign_out_accuracy_m = NULL,
      sign_out_distance_m = NULL,
      sign_out_outside_radius = false,
      care_sheet = NULL,
      care_sheet_status = NULL,
      care_sheet_submitted_at = NULL,
      care_sheet_psw_name = NULL,
      care_sheet_flagged = false,
      care_sheet_flag_reason = NULL,
      overtime_minutes = 0,
      flagged_for_overtime = false,
      manual_check_in = false,
      manual_check_out = false,
      manual_override_at = now(),
      manual_override_by = v_admin,
      manual_override_reason = 'Wrong-day correction: ' || btrim(p_reason),
      verification_status = 'pending',
      completion_email_sent_at = NULL,
      care_sheet_sent_at = NULL,
      invoice_sent_at = NULL,
      rebook_nudge_sent_at = NULL,
      review_request_email_sent_at = NULL,
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'booking_code', v_booking.booking_code,
    'scheduled_date', p_correct_date,
    'status', 'active',
    'psw_assigned', v_booking.psw_assigned
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reactivate_wrong_day_shift(uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reactivate_wrong_day_shift(uuid, date, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.admin_reactivate_wrong_day_shift(uuid, date, text) IS
  'Admin-only audited recovery for wrong-day attendance. Preserves assignment and reopens the order on the correct date.';
