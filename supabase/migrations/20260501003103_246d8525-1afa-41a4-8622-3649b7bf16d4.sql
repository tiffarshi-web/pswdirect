CREATE OR REPLACE FUNCTION public.create_payout_request(p_psw_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz;
  v_toronto_now timestamp;
  v_dow int;
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
  -- Verify caller owns this PSW profile
  SELECT email, first_job_completed_at INTO v_psw_email, v_first_job
  FROM public.psw_profiles WHERE id = p_psw_id;
  IF v_psw_email IS NULL OR v_psw_email != (auth.jwt() ->> 'email') THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'message', 'You can only create payout requests for your own account.');
  END IF;

  -- Must have completed first job to activate weekly payout schedule
  IF v_first_job IS NULL THEN
    RETURN jsonb_build_object('error', 'no_first_job', 'message', 'You can request payout after 14 days of completed work.');
  END IF;

  v_now := now();
  v_toronto_now := v_now AT TIME ZONE 'America/Toronto';
  v_dow := EXTRACT(DOW FROM v_toronto_now);

  IF v_dow != 4 THEN
    RETURN jsonb_build_object('error', 'not_thursday', 'message', 'Payout requests are available on Thursdays only.');
  END IF;

  -- 14-day eligibility from first completed shift
  IF v_first_job > (v_now - INTERVAL '14 days') THEN
    RETURN jsonb_build_object('error', 'not_eligible_yet', 'message', 'You can request payout after 14 days of completed work.');
  END IF;

  SELECT COUNT(*) INTO v_open_count
  FROM public.payout_requests
  WHERE psw_id = p_psw_id
    AND status IN ('requested', 'approved', 'payout_ready');

  IF v_open_count > 0 THEN
    RETURN jsonb_build_object('error', 'open_request_exists', 'message', 'You already have a payout request in progress.');
  END IF;

  -- 14-day holdback on individual shift earnings
  v_cutoff := v_now - INTERVAL '14 days';

  SELECT
    COALESCE(SUM(total_owed), 0),
    COUNT(*),
    MIN(earned_date),
    MAX(earned_date)
  INTO v_total, v_count, v_min_date, v_max_date
  FROM public.payroll_entries
  WHERE psw_id = p_psw_id::text
    AND payout_request_id IS NULL
    AND status != 'cleared'
    AND completed_at IS NOT NULL
    AND completed_at <= v_cutoff
    AND requires_admin_review = false;

  IF v_count = 0 OR v_total <= 0 THEN
    RETURN jsonb_build_object('error', 'no_eligible_earnings', 'message', 'No earnings are eligible yet (shifts must be completed 14+ days ago).');
  END IF;

  INSERT INTO public.payout_requests (psw_id, period_start, period_end, total_amount, entry_count, status)
  VALUES (p_psw_id, v_min_date, v_max_date, v_total, v_count, 'requested')
  RETURNING id INTO v_request_id;

  UPDATE public.payroll_entries
  SET payout_request_id = v_request_id
  WHERE psw_id = p_psw_id::text
    AND payout_request_id IS NULL
    AND status != 'cleared'
    AND completed_at IS NOT NULL
    AND completed_at <= v_cutoff
    AND requires_admin_review = false;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'total_amount', v_total,
    'entry_count', v_count
  );
END;
$function$;