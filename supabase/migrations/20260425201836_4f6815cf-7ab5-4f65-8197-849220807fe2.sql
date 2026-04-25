-- 1. Add first_job_completed_at to psw_profiles
ALTER TABLE public.psw_profiles
  ADD COLUMN IF NOT EXISTS first_job_completed_at timestamptz;

-- 2. Backfill from earliest payroll entry per PSW
UPDATE public.psw_profiles p
SET first_job_completed_at = sub.first_completed
FROM (
  SELECT psw_id::uuid AS psw_id, MIN(COALESCE(completed_at, created_at)) AS first_completed
  FROM public.payroll_entries
  WHERE completed_at IS NOT NULL OR created_at IS NOT NULL
  GROUP BY psw_id
) sub
WHERE p.id = sub.psw_id
  AND p.first_job_completed_at IS NULL;

-- 3. Trigger to stamp first_job_completed_at when first payroll entry is inserted
CREATE OR REPLACE FUNCTION public.stamp_psw_first_job_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_psw_uuid uuid;
BEGIN
  BEGIN
    v_psw_uuid := NEW.psw_id::uuid;
  EXCEPTION WHEN others THEN
    RETURN NEW;
  END;

  UPDATE public.psw_profiles
  SET first_job_completed_at = COALESCE(NEW.completed_at, now()),
      updated_at = now()
  WHERE id = v_psw_uuid
    AND first_job_completed_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_psw_first_job ON public.payroll_entries;
CREATE TRIGGER trg_stamp_psw_first_job
AFTER INSERT ON public.payroll_entries
FOR EACH ROW
EXECUTE FUNCTION public.stamp_psw_first_job_completed();

-- 4. Update create_payout_request: 14d -> 7d holdback
CREATE OR REPLACE FUNCTION public.create_payout_request(p_psw_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    RETURN jsonb_build_object('error', 'no_first_job', 'message', 'Complete your first job to activate weekly payouts.');
  END IF;

  v_now := now();
  v_toronto_now := v_now AT TIME ZONE 'America/Toronto';
  v_dow := EXTRACT(DOW FROM v_toronto_now);

  IF v_dow != 4 THEN
    RETURN jsonb_build_object('error', 'not_thursday', 'message', 'Payout requests are available on Thursdays only.');
  END IF;

  SELECT COUNT(*) INTO v_open_count
  FROM public.payout_requests
  WHERE psw_id = p_psw_id
    AND status IN ('requested', 'approved', 'payout_ready');

  IF v_open_count > 0 THEN
    RETURN jsonb_build_object('error', 'open_request_exists', 'message', 'You already have a payout request in progress.');
  END IF;

  -- 7-day holdback (was 14)
  v_cutoff := (v_toronto_now - INTERVAL '7 days') AT TIME ZONE 'America/Toronto';

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
    AND requires_admin_review = false
    AND completed_at IS NOT NULL
    AND completed_at <= v_cutoff;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('error', 'no_eligible_entries', 'message', 'No earnings are eligible yet. Shifts must be completed 7+ days ago and admin-approved.');
  END IF;

  INSERT INTO public.payout_requests (psw_id, period_start, period_end, total_amount, entry_count)
  VALUES (p_psw_id, v_min_date, v_max_date, v_total, v_count)
  RETURNING id INTO v_request_id;

  UPDATE public.payroll_entries
  SET payout_request_id = v_request_id
  WHERE psw_id = p_psw_id::text
    AND payout_request_id IS NULL
    AND status != 'cleared'
    AND requires_admin_review = false
    AND completed_at IS NOT NULL
    AND completed_at <= v_cutoff;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'total_amount', v_total,
    'entry_count', v_count,
    'period_start', v_min_date,
    'period_end', v_max_date
  );
END;
$$;