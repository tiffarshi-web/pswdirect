-- =============================================================================
-- Partial payment support: per-entry paid/remaining tracking + overpayment guard
-- =============================================================================

-- Replace admin_record_manual_payout to accept per-entry amounts (partial payments)
DROP FUNCTION IF EXISTS public.admin_record_manual_payout(uuid, numeric, timestamptz, public.payout_method, uuid[], text, text);

CREATE OR REPLACE FUNCTION public.admin_record_manual_payout(
  p_psw_id uuid,
  p_amount numeric,
  p_paid_at timestamptz,
  p_method public.payout_method,
  p_entry_ids uuid[],
  p_entry_amounts numeric[] DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin text;
  v_payout_id uuid;
  v_entry_id uuid;
  v_apply_amount numeric;
  v_total_owed numeric;
  v_already_paid numeric;
  v_remaining numeric;
  v_alloc_total numeric := 0;
  v_idx int;
  v_count int;
  v_entry record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;
  IF p_entry_ids IS NULL OR array_length(p_entry_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one earnings entry must be selected';
  END IF;

  v_count := array_length(p_entry_ids, 1);

  IF p_entry_amounts IS NOT NULL AND array_length(p_entry_amounts, 1) <> v_count THEN
    RAISE EXCEPTION 'Per-entry amounts array must match entry count';
  END IF;

  -- Validate every entry: belongs to PSW, approved, and has remaining balance
  FOR v_idx IN 1..v_count LOOP
    v_entry_id := p_entry_ids[v_idx];

    SELECT pe.total_owed, pe.psw_id, pe.requires_admin_review, pe.status
      INTO v_entry
    FROM public.payroll_entries pe
    WHERE pe.id = v_entry_id;

    IF v_entry IS NULL THEN
      RAISE EXCEPTION 'Entry % not found', v_entry_id;
    END IF;
    IF v_entry.psw_id <> p_psw_id::text THEN
      RAISE EXCEPTION 'Entry % does not belong to this caregiver', v_entry_id;
    END IF;
    IF v_entry.requires_admin_review THEN
      RAISE EXCEPTION 'Entry % requires admin review before payout', v_entry_id;
    END IF;

    v_total_owed := v_entry.total_owed;

    -- Sum of prior non-voided allocations to this entry
    SELECT COALESCE(SUM(pel.amount_applied), 0)
      INTO v_already_paid
    FROM public.payout_entry_links pel
    JOIN public.payouts po ON po.id = pel.payout_id
    WHERE pel.payroll_entry_id = v_entry_id
      AND po.voided_at IS NULL;

    v_remaining := v_total_owed - v_already_paid;

    IF v_remaining <= 0 THEN
      RAISE EXCEPTION 'Entry % is already fully paid (no remaining balance)', v_entry_id;
    END IF;

    -- Determine how much of this payment to apply to this entry
    IF p_entry_amounts IS NOT NULL THEN
      v_apply_amount := p_entry_amounts[v_idx];
      IF v_apply_amount IS NULL OR v_apply_amount <= 0 THEN
        RAISE EXCEPTION 'Per-entry amount must be greater than zero (entry %)', v_entry_id;
      END IF;
    ELSE
      -- Default: pay the full remaining balance per entry
      v_apply_amount := v_remaining;
    END IF;

    IF v_apply_amount > v_remaining + 0.005 THEN
      RAISE EXCEPTION 'Payment of $% exceeds remaining balance $% for entry %',
        v_apply_amount, v_remaining, v_entry_id;
    END IF;

    v_alloc_total := v_alloc_total + v_apply_amount;
  END LOOP;

  -- Total of allocations must equal the payment amount (allow small rounding)
  IF abs(v_alloc_total - p_amount) > 0.01 THEN
    RAISE EXCEPTION 'Allocation total $% does not match payout amount $%', v_alloc_total, p_amount;
  END IF;

  -- Insert the payout record
  INSERT INTO public.payouts (
    psw_id, amount_paid, paid_at, payment_method, reference_number, note, created_by_admin
  ) VALUES (
    p_psw_id, p_amount, COALESCE(p_paid_at, now()), p_method, p_reference, p_note, v_admin
  ) RETURNING id INTO v_payout_id;

  -- Insert links + recompute paid/cleared status per entry
  FOR v_idx IN 1..v_count LOOP
    v_entry_id := p_entry_ids[v_idx];

    IF p_entry_amounts IS NOT NULL THEN
      v_apply_amount := p_entry_amounts[v_idx];
    ELSE
      SELECT pe.total_owed - COALESCE((
        SELECT SUM(pel.amount_applied)
        FROM public.payout_entry_links pel
        JOIN public.payouts po ON po.id = pel.payout_id
        WHERE pel.payroll_entry_id = pe.id AND po.voided_at IS NULL
      ), 0)
      INTO v_apply_amount
      FROM public.payroll_entries pe
      WHERE pe.id = v_entry_id;
    END IF;

    INSERT INTO public.payout_entry_links (payout_id, payroll_entry_id, amount_applied)
    VALUES (v_payout_id, v_entry_id, v_apply_amount);

    -- Compute new paid total for this entry
    SELECT pe.total_owed,
           COALESCE((
             SELECT SUM(pel.amount_applied)
             FROM public.payout_entry_links pel
             JOIN public.payouts po ON po.id = pel.payout_id
             WHERE pel.payroll_entry_id = pe.id AND po.voided_at IS NULL
           ), 0)
      INTO v_total_owed, v_already_paid
    FROM public.payroll_entries pe
    WHERE pe.id = v_entry_id;

    IF v_already_paid + 0.005 >= v_total_owed THEN
      -- Fully paid — lock entry
      UPDATE public.payroll_entries
      SET status = 'cleared',
          cleared_at = COALESCE(p_paid_at, now()),
          manual_payout_id = v_payout_id,
          manually_paid_at = COALESCE(p_paid_at, now()),
          updated_at = now()
      WHERE id = v_entry_id;
    ELSE
      -- Partially paid — keep open but stamp last manual payout
      UPDATE public.payroll_entries
      SET manual_payout_id = v_payout_id,
          manually_paid_at = COALESCE(p_paid_at, now()),
          updated_at = now()
      WHERE id = v_entry_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'amount_paid', p_amount,
    'entry_count', v_count
  );
END;
$$;

-- Replace void RPC: recompute cleared status (entry stays cleared only if other payouts still cover it)
CREATE OR REPLACE FUNCTION public.admin_void_manual_payout(
  p_payout_id uuid,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin text;
  v_entry record;
  v_paid numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  -- Mark payout voided FIRST so SUM excludes it
  UPDATE public.payouts
  SET voided_at = now(),
      voided_by = v_admin,
      void_reason = p_reason,
      updated_at = now()
  WHERE id = p_payout_id;

  -- For each linked entry, recompute paid total and reset status if no longer fully paid
  FOR v_entry IN
    SELECT DISTINCT pe.id, pe.total_owed
    FROM public.payroll_entries pe
    JOIN public.payout_entry_links pel ON pel.payroll_entry_id = pe.id
    WHERE pel.payout_id = p_payout_id
  LOOP
    SELECT COALESCE(SUM(pel.amount_applied), 0)
      INTO v_paid
    FROM public.payout_entry_links pel
    JOIN public.payouts po ON po.id = pel.payout_id
    WHERE pel.payroll_entry_id = v_entry.id
      AND po.voided_at IS NULL;

    IF v_paid + 0.005 >= v_entry.total_owed THEN
      -- Still fully covered by other payouts — keep cleared
      UPDATE public.payroll_entries
      SET updated_at = now()
      WHERE id = v_entry.id;
    ELSE
      -- No longer fully paid — reopen
      UPDATE public.payroll_entries
      SET status = 'pending',
          cleared_at = NULL,
          manual_payout_id = NULL,
          manually_paid_at = NULL,
          updated_at = now()
      WHERE id = v_entry.id;
    END IF;
  END LOOP;
END;
$$;

-- Per-entry payment status helper for the admin UI
CREATE OR REPLACE FUNCTION public.get_psw_entry_payment_status(p_psw_id uuid)
RETURNS TABLE (
  entry_id uuid,
  scheduled_date date,
  task_name text,
  hours_worked numeric,
  hourly_rate numeric,
  total_owed numeric,
  paid_amount numeric,
  remaining_amount numeric,
  status text,
  requires_admin_review boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    pe.id AS entry_id,
    pe.scheduled_date,
    pe.task_name,
    pe.hours_worked,
    pe.hourly_rate,
    pe.total_owed,
    COALESCE((
      SELECT SUM(pel.amount_applied)
      FROM public.payout_entry_links pel
      JOIN public.payouts po ON po.id = pel.payout_id
      WHERE pel.payroll_entry_id = pe.id
        AND po.voided_at IS NULL
    ), 0) AS paid_amount,
    pe.total_owed - COALESCE((
      SELECT SUM(pel.amount_applied)
      FROM public.payout_entry_links pel
      JOIN public.payouts po ON po.id = pel.payout_id
      WHERE pel.payroll_entry_id = pe.id
        AND po.voided_at IS NULL
    ), 0) AS remaining_amount,
    pe.status,
    pe.requires_admin_review
  FROM public.payroll_entries pe
  WHERE pe.psw_id = p_psw_id::text
  ORDER BY pe.scheduled_date ASC;
$$;

-- Updated summary: now includes total_earned (approved earnings)
DROP FUNCTION IF EXISTS public.get_psw_payout_summary(uuid);

CREATE OR REPLACE FUNCTION public.get_psw_payout_summary(p_psw_id uuid)
RETURNS TABLE (
  total_earned numeric,
  total_paid numeric,
  outstanding_balance numeric,
  last_payout_at timestamptz,
  payout_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE((
      SELECT SUM(total_owed) FROM public.payroll_entries
      WHERE psw_id = p_psw_id::text
        AND requires_admin_review = false
    ), 0) AS total_earned,
    COALESCE((
      SELECT SUM(amount_paid) FROM public.payouts
      WHERE psw_id = p_psw_id AND voided_at IS NULL
    ), 0) AS total_paid,
    COALESCE((
      SELECT SUM(pe.total_owed - COALESCE((
        SELECT SUM(pel.amount_applied)
        FROM public.payout_entry_links pel
        JOIN public.payouts po ON po.id = pel.payout_id
        WHERE pel.payroll_entry_id = pe.id AND po.voided_at IS NULL
      ), 0))
      FROM public.payroll_entries pe
      WHERE pe.psw_id = p_psw_id::text
        AND pe.requires_admin_review = false
        AND pe.status <> 'cleared'
    ), 0) AS outstanding_balance,
    (SELECT MAX(paid_at) FROM public.payouts WHERE psw_id = p_psw_id AND voided_at IS NULL) AS last_payout_at,
    (SELECT COUNT(*)::int FROM public.payouts WHERE psw_id = p_psw_id AND voided_at IS NULL) AS payout_count;
$$;