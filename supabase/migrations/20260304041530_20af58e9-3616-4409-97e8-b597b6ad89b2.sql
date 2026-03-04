
-- 1. Create payout_requests table
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psw_id uuid NOT NULL REFERENCES public.psw_profiles(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'requested',
  approved_at timestamptz,
  payout_ready_at timestamptz,
  cleared_at timestamptz,
  rejected_at timestamptz,
  admin_notes text,
  total_amount numeric NOT NULL DEFAULT 0,
  entry_count int NOT NULL DEFAULT 0
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- PSW can view own payout requests
CREATE POLICY "PSWs can view own payout requests"
ON public.payout_requests FOR SELECT
USING (psw_id IN (SELECT id FROM public.psw_profiles WHERE email = (auth.jwt() ->> 'email')));

-- Admin full CRUD
CREATE POLICY "Admins can read all payout requests"
ON public.payout_requests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert payout requests"
ON public.payout_requests FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payout requests"
ON public.payout_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payout requests"
ON public.payout_requests FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Alter payroll_entries - add new columns (cleared_at already exists)
ALTER TABLE public.payroll_entries
  ADD COLUMN IF NOT EXISTS payout_request_id uuid REFERENCES public.payout_requests(id),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS earned_date date;

-- 3. Add last4 to psw_banking
ALTER TABLE public.psw_banking
  ADD COLUMN IF NOT EXISTS last4 text;

-- 4. SECURITY DEFINER function: create payout request (PSW calls this)
CREATE OR REPLACE FUNCTION public.create_payout_request(p_psw_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
BEGIN
  -- Verify caller owns this PSW profile
  SELECT email INTO v_psw_email FROM public.psw_profiles WHERE id = p_psw_id;
  IF v_psw_email IS NULL OR v_psw_email != (auth.jwt() ->> 'email') THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'message', 'You can only create payout requests for your own account.');
  END IF;

  v_now := now();
  v_toronto_now := v_now AT TIME ZONE 'America/Toronto';
  v_dow := EXTRACT(DOW FROM v_toronto_now); -- 0=Sun, 4=Thu

  IF v_dow != 4 THEN
    RETURN jsonb_build_object('error', 'not_thursday', 'message', 'Payout requests are available on Thursdays only.');
  END IF;

  -- Check no open requests
  SELECT COUNT(*) INTO v_open_count
  FROM public.payout_requests
  WHERE psw_id = p_psw_id
    AND status IN ('requested', 'approved', 'payout_ready');

  IF v_open_count > 0 THEN
    RETURN jsonb_build_object('error', 'open_request_exists', 'message', 'You already have a payout request in progress.');
  END IF;

  -- Cutoff: 14 days ago in Toronto time
  v_cutoff := (v_toronto_now - INTERVAL '14 days') AT TIME ZONE 'America/Toronto';

  -- Get eligible entries
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
    AND completed_at <= v_cutoff;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('error', 'no_eligible_entries', 'message', 'No earnings are eligible yet. Shifts must be completed 14+ days ago.');
  END IF;

  -- Create payout request
  INSERT INTO public.payout_requests (psw_id, period_start, period_end, total_amount, entry_count)
  VALUES (p_psw_id, v_min_date, v_max_date, v_total, v_count)
  RETURNING id INTO v_request_id;

  -- Link entries
  UPDATE public.payroll_entries
  SET payout_request_id = v_request_id
  WHERE psw_id = p_psw_id::text
    AND payout_request_id IS NULL
    AND status != 'cleared'
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

-- 5. Admin action functions
CREATE OR REPLACE FUNCTION public.admin_approve_payout(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.payout_requests
  SET status = 'approved', approved_at = now()
  WHERE id = p_request_id AND status = 'requested';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_payout_ready(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.payout_requests
  SET status = 'payout_ready', payout_ready_at = now()
  WHERE id = p_request_id AND status = 'approved';
  UPDATE public.payroll_entries
  SET status = 'payout_ready'
  WHERE payout_request_id = p_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_clear_payout(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.payout_requests
  SET status = 'cleared', cleared_at = now()
  WHERE id = p_request_id AND status = 'payout_ready';
  UPDATE public.payroll_entries
  SET status = 'cleared', cleared_at = now()
  WHERE payout_request_id = p_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_payout(p_request_id uuid, p_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.payout_requests
  SET status = 'rejected', rejected_at = now(), admin_notes = p_notes
  WHERE id = p_request_id AND status IN ('requested', 'approved', 'payout_ready');
  -- Unlink entries so PSW can request again
  UPDATE public.payroll_entries
  SET payout_request_id = NULL, status = 'pending'
  WHERE payout_request_id = p_request_id;
END;
$$;

-- 6. Secure banking access for CPA generation (admin only)
CREATE OR REPLACE FUNCTION public.get_psw_banking_for_cpa(p_psw_id uuid)
RETURNS TABLE(transit_number text, institution_number text, account_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  RETURN QUERY
  SELECT b.transit_number, b.institution_number, b.account_number
  FROM public.psw_banking b
  WHERE b.psw_id = p_psw_id;
END;
$$;
