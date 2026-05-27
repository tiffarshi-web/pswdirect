CREATE OR REPLACE FUNCTION public.admin_record_manual_payout(
  p_psw_id uuid,
  p_amount numeric,
  p_paid_at timestamp with time zone,
  p_method payout_method,
  p_entry_ids uuid[],
  p_entry_amounts numeric[] DEFAULT NULL::numeric[],
  p_reference text DEFAULT NULL::text,
  p_note text DEFAULT NULL::text,
  p_allow_surplus boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  v_count := COALESCE(array_length(p_entry_ids, 1), 0);

  -- Without override, at least one entry must be provided (legacy behavior)
  IF v_count = 0 AND NOT p_allow_surplus THEN
    RAISE EXCEPTION 'At least one earnings entry must be selected (or enable override for an advance payment)';
  END IF;

  IF v_count > 0 AND p_entry_amounts IS NOT NULL
     AND array_length(p_entry_amounts, 1) <> v_count THEN
    RAISE EXCEPTION 'Per-entry amounts array must match entry count';
  END IF;

  -- Validate every entry: belongs to PSW, approved, and has remaining balance
  IF v_count > 0 THEN
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

      IF p_entry_amounts IS NOT NULL THEN
        v_apply_amount := p_entry_amounts[v_idx];
        IF v_apply_amount IS NULL OR v_apply_amount <= 0 THEN
          RAISE EXCEPTION 'Per-entry amount must be greater than zero (entry %)', v_entry_id;
        END IF;
      ELSE
        v_apply_amount := v_remaining;
      END IF;

      -- Per-entry allocation can never exceed that entry's remaining balance
      -- (surplus is tracked on the payout row, not on entries)
      IF v_apply_amount > v_remaining + 0.005 THEN
        RAISE EXCEPTION 'Per-entry allocation $% exceeds remaining $% for entry %',
          v_apply_amount, v_remaining, v_entry_id;
      END IF;

      v_alloc_total := v_alloc_total + v_apply_amount;
    END LOOP;
  END IF;

  -- Total amount vs allocated amount
  IF NOT p_allow_surplus THEN
    -- Strict: total must match allocations (legacy behavior, prevents overpayment)
    IF abs(v_alloc_total - p_amount) > 0.01 THEN
      RAISE EXCEPTION 'Allocation total $% does not match payout amount $% (enable override for advance payments)',
        v_alloc_total, p_amount;
    END IF;
  ELSE
    -- Override: payout amount must be >= allocations (surplus = advance credit)
    IF p_amount + 0.005 < v_alloc_total THEN
      RAISE EXCEPTION 'Payout amount $% is less than the sum of per-entry allocations $%',
        p_amount, v_alloc_total;
    END IF;
  END IF;

  -- Insert the payout record (full amount, including any surplus)
  INSERT INTO public.payouts (
    psw_id, amount_paid, paid_at, payment_method, reference_number, note, created_by_admin
  ) VALUES (
    p_psw_id, p_amount, COALESCE(p_paid_at, now()), p_method, p_reference, p_note, v_admin
  ) RETURNING id INTO v_payout_id;

  -- Insert links + recompute paid/cleared status per entry
  IF v_count > 0 THEN
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
        UPDATE public.payroll_entries
        SET status = 'cleared',
            cleared_at = COALESCE(p_paid_at, now()),
            manual_payout_id = v_payout_id,
            manually_paid_at = COALESCE(p_paid_at, now()),
            updated_at = now()
        WHERE id = v_entry_id;
      ELSE
        UPDATE public.payroll_entries
        SET manual_payout_id = v_payout_id,
            manually_paid_at = COALESCE(p_paid_at, now()),
            updated_at = now()
        WHERE id = v_entry_id;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'amount_paid', p_amount,
    'allocated_to_entries', v_alloc_total,
    'surplus_advance', GREATEST(p_amount - v_alloc_total, 0),
    'entry_count', v_count
  );
END;
$function$;