
-- Tightened payout eligibility: only approved + client-paid shifts
CREATE OR REPLACE FUNCTION public.create_payout_request(p_psw_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz;
  v_open_count int;
  v_total numeric;
  v_count int;
  v_min_date date;
  v_max_date date;
  v_request_id uuid;
  v_psw_email text;
  v_cutoff timestamptz;
  v_first_job timestamptz;
BEGIN
  SELECT email, first_job_completed_at INTO v_psw_email, v_first_job
  FROM public.psw_profiles WHERE id = p_psw_id;
  IF v_psw_email IS NULL OR v_psw_email != (auth.jwt() ->> 'email') THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'message', 'You can only create payout requests for your own account.');
  END IF;

  IF v_first_job IS NULL THEN
    RETURN jsonb_build_object('error', 'no_first_job', 'message', 'You can request payout after 7 days of completed work.');
  END IF;

  v_now := now();

  IF v_first_job > (v_now - INTERVAL '7 days') THEN
    RETURN jsonb_build_object('error', 'not_eligible_yet', 'message', 'You can request payout 7 days after your first completed shift.');
  END IF;

  SELECT COUNT(*) INTO v_open_count
  FROM public.payout_requests
  WHERE psw_id = p_psw_id
    AND status IN ('requested', 'approved', 'payout_ready');

  IF v_open_count > 0 THEN
    RETURN jsonb_build_object('error', 'open_request_exists', 'message', 'You already have a payout request in progress.');
  END IF;

  v_cutoff := v_now - INTERVAL '7 days';

  SELECT
    COALESCE(SUM(pe.total_owed), 0),
    COUNT(*),
    MIN(pe.earned_date),
    MAX(pe.earned_date)
  INTO v_total, v_count, v_min_date, v_max_date
  FROM public.payroll_entries pe
  WHERE pe.psw_id = p_psw_id::text
    AND pe.payout_request_id IS NULL
    AND pe.status != 'cleared'
    AND pe.completed_at IS NOT NULL
    AND pe.completed_at <= v_cutoff
    AND pe.requires_admin_review = false
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id::text = pe.shift_id
        AND b.status = 'completed'
        AND COALESCE(b.was_refunded, false) = false
        AND b.verification_status IN ('approved', 'paid')
        AND b.payment_status = 'paid'
    );

  IF v_count = 0 OR v_total <= 0 THEN
    RETURN jsonb_build_object('error', 'no_eligible_earnings', 'message', 'No earnings are eligible yet. Shifts must be completed 7+ days ago, approved by admin, and paid by the client.');
  END IF;

  INSERT INTO public.payout_requests (psw_id, period_start, period_end, total_amount, entry_count, status)
  VALUES (p_psw_id, v_min_date, v_max_date, v_total, v_count, 'requested')
  RETURNING id INTO v_request_id;

  UPDATE public.payroll_entries pe
  SET payout_request_id = v_request_id
  WHERE pe.psw_id = p_psw_id::text
    AND pe.payout_request_id IS NULL
    AND pe.status != 'cleared'
    AND pe.completed_at IS NOT NULL
    AND pe.completed_at <= v_cutoff
    AND pe.requires_admin_review = false
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id::text = pe.shift_id
        AND b.status = 'completed'
        AND COALESCE(b.was_refunded, false) = false
        AND b.verification_status IN ('approved', 'paid')
        AND b.payment_status = 'paid'
    );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'total_amount', v_total,
    'entry_count', v_count
  );
END;
$function$;
