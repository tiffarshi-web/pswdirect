-- =====================================================================
-- PHASE 5 — Manual provider earnings & payment recording
-- Additive and reversible. No historical amount is modified.
-- =====================================================================

-- 1. Immutable compensation snapshot ----------------------------------
ALTER TABLE public.payroll_entries
  ADD COLUMN IF NOT EXISTS booking_id uuid,
  ADD COLUMN IF NOT EXISTS provider_type text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS scheduled_minutes integer,
  ADD COLUMN IF NOT EXISTS payable_minutes integer,
  ADD COLUMN IF NOT EXISTS rate_cents integer,
  ADD COLUMN IF NOT EXISTS gross_cents integer,
  ADD COLUMN IF NOT EXISTS adjustments_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjustment_reason text,
  ADD COLUMN IF NOT EXISTS earning_rule_version text,
  ADD COLUMN IF NOT EXISTS compensation_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS decision_reason text,
  ADD COLUMN IF NOT EXISTS decided_by text,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz;

UPDATE public.payroll_entries pe
SET booking_id = CASE WHEN pe.shift_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                      THEN pe.shift_id::uuid ELSE NULL END
WHERE pe.booking_id IS NULL;

UPDATE public.payroll_entries pe
SET rate_cents       = COALESCE(pe.rate_cents, ROUND(COALESCE(pe.hourly_rate,0) * 100)::int),
    gross_cents      = COALESCE(pe.gross_cents, ROUND(COALESCE(pe.total_owed,0) * 100)::int),
    payable_minutes  = COALESCE(pe.payable_minutes, ROUND(COALESCE(pe.hours_worked,0) * 60)::int),
    scheduled_minutes= COALESCE(pe.scheduled_minutes, ROUND(COALESCE(pe.booked_hours, pe.hours_worked, 0) * 60)::int),
    provider_type    = COALESCE(pe.provider_type, 'psw'),
    earning_rule_version = COALESCE(pe.earning_rule_version, 'legacy-backfill-v1')
WHERE pe.gross_cents IS NULL OR pe.rate_cents IS NULL OR pe.payable_minutes IS NULL;

UPDATE public.payroll_entries pe
SET province = COALESCE(pe.province, b.service_province, 'ON'),
    compensation_snapshot = COALESCE(pe.compensation_snapshot, jsonb_build_object(
      'provider_id', pe.psw_id,
      'provider_type', COALESCE(pe.provider_type, 'psw'),
      'booking_id', pe.booking_id,
      'visit_id', pe.shift_id,
      'service', pe.task_name,
      'province', COALESCE(b.service_province, 'ON'),
      'currency', 'CAD',
      'scheduled_minutes', pe.scheduled_minutes,
      'payable_minutes', pe.payable_minutes,
      'rate_cents', pe.rate_cents,
      'flat_rate_cents', 0,
      'premium_cents', 0,
      'adjustments_cents', COALESCE(pe.adjustments_cents, 0),
      'gross_cents', pe.gross_cents,
      'earning_rule_version', COALESCE(pe.earning_rule_version, 'legacy-backfill-v1'),
      'created_at', COALESCE(pe.created_at, now())
    ))
FROM public.bookings b
WHERE b.id = pe.booking_id AND pe.compensation_snapshot IS NULL;

UPDATE public.payroll_entries pe
SET province = COALESCE(pe.province, 'ON'),
    compensation_snapshot = jsonb_build_object(
      'provider_id', pe.psw_id,
      'provider_type', COALESCE(pe.provider_type, 'psw'),
      'booking_id', pe.booking_id,
      'visit_id', pe.shift_id,
      'service', pe.task_name,
      'province', 'ON',
      'currency', 'CAD',
      'scheduled_minutes', pe.scheduled_minutes,
      'payable_minutes', pe.payable_minutes,
      'rate_cents', pe.rate_cents,
      'flat_rate_cents', 0,
      'premium_cents', 0,
      'adjustments_cents', COALESCE(pe.adjustments_cents, 0),
      'gross_cents', pe.gross_cents,
      'earning_rule_version', COALESCE(pe.earning_rule_version, 'legacy-backfill-v1'),
      'created_at', COALESCE(pe.created_at, now())
    )
WHERE pe.compensation_snapshot IS NULL;

-- Snapshot immutability -------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_compensation_snapshot_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.compensation_snapshot IS NOT NULL
     AND NEW.compensation_snapshot IS DISTINCT FROM OLD.compensation_snapshot THEN
    RAISE EXCEPTION 'The provider compensation snapshot is immutable and cannot be rewritten';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compensation_snapshot_immutable ON public.payroll_entries;
CREATE TRIGGER trg_compensation_snapshot_immutable
BEFORE UPDATE ON public.payroll_entries
FOR EACH ROW EXECUTE FUNCTION public.guard_compensation_snapshot_immutable();

-- 2. Admin-only internal notes -----------------------------------------
CREATE TABLE IF NOT EXISTS public.earning_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_entry_id uuid NOT NULL REFERENCES public.payroll_entries(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.earning_internal_notes TO authenticated;
GRANT ALL ON public.earning_internal_notes TO service_role;
ALTER TABLE public.earning_internal_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read internal earning notes" ON public.earning_internal_notes;
CREATE POLICY "Admins read internal earning notes" ON public.earning_internal_notes
  FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins add internal earning notes" ON public.earning_internal_notes;
CREATE POLICY "Admins add internal earning notes" ON public.earning_internal_notes
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE INDEX IF NOT EXISTS idx_earning_internal_notes_entry ON public.earning_internal_notes(payroll_entry_id);

-- 3. Payment corrections ledger ----------------------------------------
CREATE TABLE IF NOT EXISTS public.payout_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_payout_id uuid NOT NULL REFERENCES public.payouts(id),
  correction_type text NOT NULL CHECK (correction_type IN ('reversal','amount_correction','reference_correction')),
  original_amount numeric NOT NULL,
  corrected_amount numeric NOT NULL,
  delta_amount numeric NOT NULL,
  reason text NOT NULL,
  external_action_required boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payout_corrections TO authenticated;
GRANT ALL ON public.payout_corrections TO service_role;
ALTER TABLE public.payout_corrections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read payout corrections" ON public.payout_corrections;
CREATE POLICY "Admins read payout corrections" ON public.payout_corrections
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE INDEX IF NOT EXISTS idx_payout_corrections_payout ON public.payout_corrections(original_payout_id);

CREATE OR REPLACE FUNCTION public.block_payout_correction_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Payment correction history is immutable';
END;
$$;
DROP TRIGGER IF EXISTS trg_payout_corrections_immutable ON public.payout_corrections;
CREATE TRIGGER trg_payout_corrections_immutable
BEFORE UPDATE OR DELETE ON public.payout_corrections
FOR EACH ROW EXECUTE FUNCTION public.block_payout_correction_mutation();

-- 4. Status transition rules -------------------------------------------
CREATE OR REPLACE FUNCTION public.is_valid_earning_transition(
  p_old provider_earning_status, p_new provider_earning_status
) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_old IS NULL OR p_old = p_new THEN true
    WHEN p_old = 'pending_shift_completion' THEN p_new IN ('pending_care_sheet','pending_office_review','voided')
    WHEN p_old = 'pending_care_sheet'       THEN p_new IN ('pending_office_review','disputed','voided')
    WHEN p_old = 'pending_office_review'    THEN p_new IN ('approved_for_manual_payment','disputed','voided','pending_care_sheet')
    WHEN p_old = 'approved_for_manual_payment' THEN p_new IN ('paid_manually','disputed','voided','pending_office_review')
    WHEN p_old = 'disputed'                 THEN p_new IN ('pending_office_review','approved_for_manual_payment','voided')
    WHEN p_old = 'paid_manually'            THEN p_new IN ('disputed','pending_office_review')
    WHEN p_old = 'voided'                   THEN p_new IN ('pending_office_review')
    ELSE false
  END;
$$;
REVOKE ALL ON FUNCTION public.is_valid_earning_transition(provider_earning_status, provider_earning_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_valid_earning_transition(provider_earning_status, provider_earning_status) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_provider_earning_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_privileged boolean;
  v_actor text;
BEGIN
  v_privileged := public.is_admin()
    OR current_user IN ('service_role', 'postgres', 'supabase_admin');
  v_actor := COALESCE(auth.jwt() ->> 'email', current_user);

  IF NEW.earning_status IS DISTINCT FROM OLD.earning_status THEN
    IF NOT public.is_valid_earning_transition(OLD.earning_status, NEW.earning_status) THEN
      RAISE EXCEPTION 'Invalid earning status transition % -> %', OLD.earning_status, NEW.earning_status;
    END IF;

    IF NEW.earning_status IN ('approved_for_manual_payment','paid_manually','disputed','voided')
       AND NOT v_privileged THEN
      RAISE EXCEPTION 'Only an administrator may set provider earning status to %', NEW.earning_status;
    END IF;

    IF NEW.earning_status = 'paid_manually'
       AND NOT EXISTS (
         SELECT 1 FROM public.payout_entry_links l
         JOIN public.payouts p ON p.id = l.payout_id
         WHERE l.payroll_entry_id = NEW.id AND p.voided_at IS NULL
       ) THEN
      RAISE EXCEPTION 'An earning cannot be marked paid manually without a recorded manual payout';
    END IF;
  END IF;

  -- Providers may never alter money fields on their own earnings.
  IF NOT v_privileged AND (
       NEW.total_owed IS DISTINCT FROM OLD.total_owed
    OR NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate
    OR NEW.gross_cents IS DISTINCT FROM OLD.gross_cents
    OR NEW.adjustments_cents IS DISTINCT FROM OLD.adjustments_cents
  ) THEN
    RAISE EXCEPTION 'Only an administrator may change a provider earning amount';
  END IF;

  IF NEW.earning_status IS DISTINCT FROM OLD.earning_status
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.provider_earning_status_audit (
      payroll_entry_id, psw_id, old_status, new_status,
      old_legacy_status, new_legacy_status, amount, changed_by, changed_by_uid, note
    ) VALUES (
      NEW.id, NEW.psw_id, OLD.earning_status, NEW.earning_status,
      OLD.status, NEW.status, NEW.total_owed, v_actor, auth.uid(), NEW.decision_reason
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Office decisions ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_earning_status(
  p_entry_id uuid, p_status provider_earning_status, p_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_has_payout boolean;
  v_old provider_earning_status;
  v_admin text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an office administrator may change an earning status';
  END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  SELECT earning_status INTO v_old FROM public.payroll_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Earning entry not found'; END IF;

  IF NOT public.is_valid_earning_transition(v_old, p_status) THEN
    RETURN jsonb_build_object('ok', false, 'message',
      format('Status cannot move from %s to %s.', v_old, p_status));
  END IF;

  IF p_status IN ('disputed','voided') AND COALESCE(btrim(p_note), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'A reason is required to dispute or void an earning.');
  END IF;
  IF v_old = 'voided' AND p_status = 'pending_office_review' AND COALESCE(btrim(p_note), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'A reason is required to reopen a voided earning.');
  END IF;

  IF p_status = 'paid_manually' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.payout_entry_links l
      JOIN public.payouts po ON po.id = l.payout_id
      WHERE l.payroll_entry_id = p_entry_id
        AND po.voided_at IS NULL
        AND po.amount_paid > 0
        AND po.paid_at IS NOT NULL
        AND po.payment_method IS NOT NULL
    ) INTO v_has_payout;
    IF NOT v_has_payout THEN
      RETURN jsonb_build_object('ok', false, 'message',
        'Record the manual payment first (amount, date and method) before marking this earning paid.');
    END IF;
  END IF;

  UPDATE public.payroll_entries
     SET earning_status = p_status,
         decision_reason = COALESCE(NULLIF(btrim(p_note), ''), decision_reason),
         dispute_reason = CASE WHEN p_status = 'disputed'
                               THEN COALESCE(NULLIF(btrim(p_note), ''), dispute_reason)
                               ELSE dispute_reason END,
         decided_by = v_admin,
         decided_at = now(),
         updated_at = now()
   WHERE id = p_entry_id;

  RETURN jsonb_build_object('ok', true, 'entry_id', p_entry_id, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_earning_adjustment(
  p_entry_id uuid, p_amount_cents integer, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_gross integer;
  v_new_adj integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF COALESCE(btrim(p_reason), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'A reason is required for an adjustment.');
  END IF;
  IF p_amount_cents IS NULL OR p_amount_cents = 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Enter an adjustment amount.');
  END IF;

  SELECT gross_cents, COALESCE(adjustments_cents,0) + p_amount_cents
    INTO v_gross, v_new_adj
  FROM public.payroll_entries WHERE id = p_entry_id;
  IF v_gross IS NULL THEN RAISE EXCEPTION 'Earning entry not found'; END IF;

  IF v_gross + v_new_adj < 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'An adjustment cannot make the earning negative.');
  END IF;

  UPDATE public.payroll_entries
     SET adjustments_cents = v_new_adj,
         adjustment_reason = p_reason,
         total_owed = ROUND(((v_gross + v_new_adj)::numeric) / 100.0, 2),
         decided_by = COALESCE(auth.jwt() ->> 'email', 'admin'),
         decided_at = now(),
         updated_at = now()
   WHERE id = p_entry_id;

  INSERT INTO public.earning_internal_notes (payroll_entry_id, note, created_by)
  VALUES (p_entry_id, format('Adjustment %s cents: %s', p_amount_cents, p_reason),
          COALESCE(auth.jwt() ->> 'email', 'admin'));

  RETURN jsonb_build_object('ok', true, 'adjustments_cents', v_new_adj,
                            'final_cents', v_gross + v_new_adj);
END;
$$;

-- 6. Payment batch protection ------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_payout_entry_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status provider_earning_status;
  v_psw text;
  v_payout_psw uuid;
BEGIN
  SELECT earning_status, psw_id INTO v_status, v_psw
  FROM public.payroll_entries WHERE id = NEW.payroll_entry_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Earning not found'; END IF;

  IF v_status IN ('voided','disputed') THEN
    RAISE EXCEPTION 'A % earning cannot be included in a manual payment', v_status;
  END IF;

  IF NEW.amount_applied IS NULL OR NEW.amount_applied <= 0 THEN
    RAISE EXCEPTION 'A payment allocation must be greater than zero';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payout_entry_links l
    WHERE l.payout_id = NEW.payout_id
      AND l.payroll_entry_id = NEW.payroll_entry_id
      AND l.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'This earning is already linked to that payment';
  END IF;

  SELECT psw_id INTO v_payout_psw FROM public.payouts WHERE id = NEW.payout_id;
  IF v_payout_psw IS NOT NULL AND v_psw IS DISTINCT FROM v_payout_psw::text THEN
    RAISE EXCEPTION 'A payment may only include earnings from one provider';
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_payout_entry_link ON public.payout_entry_links;
CREATE TRIGGER trg_guard_payout_entry_link
BEFORE INSERT OR UPDATE ON public.payout_entry_links
FOR EACH ROW EXECUTE FUNCTION public.guard_payout_entry_link();

-- 7. Payment correction RPC --------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_correct_manual_payout(
  p_payout_id uuid,
  p_correction_type text,
  p_corrected_amount numeric,
  p_reason text,
  p_external_action_required boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_original numeric;
  v_admin text;
  v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF COALESCE(btrim(p_reason), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'A reason is required to correct a payment record.');
  END IF;
  IF p_correction_type NOT IN ('reversal','amount_correction','reference_correction') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Unknown correction type.');
  END IF;

  SELECT amount_paid INTO v_original FROM public.payouts WHERE id = p_payout_id;
  IF v_original IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'That payment record does not exist.');
  END IF;
  IF p_corrected_amount IS NULL OR p_corrected_amount < 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'The corrected amount cannot be negative.');
  END IF;

  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  INSERT INTO public.payout_corrections (
    original_payout_id, correction_type, original_amount, corrected_amount,
    delta_amount, reason, external_action_required, created_by
  ) VALUES (
    p_payout_id, p_correction_type, v_original, p_corrected_amount,
    p_corrected_amount - v_original, p_reason, COALESCE(p_external_action_required, false), v_admin
  ) RETURNING id INTO v_id;

  IF p_correction_type = 'reversal' THEN
    PERFORM public.admin_void_manual_payout(p_payout_id, p_reason);
  END IF;

  RETURN jsonb_build_object('ok', true, 'correction_id', v_id,
    'original_amount', v_original, 'corrected_amount', p_corrected_amount,
    'external_action_required', COALESCE(p_external_action_required, false));
END;
$$;

-- 8. Office review queue ------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_earning_review_queue()
RETURNS TABLE (
  entry_id uuid, psw_id text, provider_name text, provider_type text,
  booking_id uuid, booking_code text, service text, service_date date,
  province text, scheduled_minutes integer, recorded_minutes integer,
  location_verified text, care_sheet_status text, incident boolean,
  wrong_day_review boolean, rate_cents integer, gross_cents integer,
  adjustments_cents integer, final_cents integer, earning_status text,
  legacy_status text, submitted_at timestamptz, age_days numeric,
  paid_cents integer
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
  SELECT pe.id, pe.psw_id, pe.psw_name, COALESCE(pe.provider_type,'psw'),
         pe.booking_id,
         b.booking_code,
         pe.task_name, pe.scheduled_date,
         COALESCE(pe.province, b.service_province, 'ON'),
         pe.scheduled_minutes, pe.payable_minutes,
         CASE
           WHEN b.id IS NULL THEN 'unknown'
           WHEN COALESCE(b.check_in_status, '') = 'awaiting_review' THEN 'awaiting_review'
           WHEN b.checked_in_at IS NOT NULL THEN 'verified'
           ELSE 'unknown'
         END,
         COALESCE(b.care_sheet_status, 'unknown'),
         COALESCE(b.care_sheet_flagged, false),
         COALESCE(b.wrong_day_review_required, false),
         pe.rate_cents, pe.gross_cents, COALESCE(pe.adjustments_cents,0),
         COALESCE(pe.gross_cents,0) + COALESCE(pe.adjustments_cents,0),
         pe.earning_status::text, pe.status,
         COALESCE(pe.submitted_for_review_at, pe.completed_at, pe.created_at),
         ROUND(EXTRACT(EPOCH FROM (now() - COALESCE(pe.submitted_for_review_at, pe.completed_at, pe.created_at))) / 86400.0, 1),
         COALESCE((
           SELECT ROUND(SUM(l.amount_applied) * 100)::int
           FROM public.payout_entry_links l
           JOIN public.payouts po ON po.id = l.payout_id
           WHERE l.payroll_entry_id = pe.id AND po.voided_at IS NULL
         ), 0)
  FROM public.payroll_entries pe
  LEFT JOIN public.bookings b ON b.id = pe.booking_id
  ORDER BY COALESCE(pe.submitted_for_review_at, pe.completed_at, pe.created_at) ASC;
END;
$$;

-- 9. Reconciliation -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_manual_payout_reconciliation()
RETURNS TABLE (
  issue_type text, severity text, reference text, detail text, amount numeric
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  RETURN QUERY
  -- paid earning with no payout record
  SELECT 'paid_without_payout', 'high', pe.id::text,
         format('Earning for %s on %s is marked paid with no payment record', pe.psw_name, pe.scheduled_date),
         pe.total_owed
  FROM public.payroll_entries pe
  WHERE pe.earning_status = 'paid_manually'
    AND NOT EXISTS (
      SELECT 1 FROM public.payout_entry_links l JOIN public.payouts po ON po.id = l.payout_id
      WHERE l.payroll_entry_id = pe.id AND po.voided_at IS NULL)

  UNION ALL
  -- payout with no linked earnings
  SELECT 'payout_without_earnings', 'medium', po.id::text,
         format('Payment of %s recorded with no linked earnings', po.amount_paid), po.amount_paid
  FROM public.payouts po
  WHERE po.voided_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.payout_entry_links l WHERE l.payout_id = po.id)

  UNION ALL
  -- amount mismatch
  SELECT 'amount_mismatch', 'high', po.id::text,
         format('Payment %s does not match linked earnings %s', po.amount_paid, agg.linked), po.amount_paid - agg.linked
  FROM public.payouts po
  JOIN (SELECT payout_id, SUM(amount_applied) linked FROM public.payout_entry_links GROUP BY payout_id) agg
    ON agg.payout_id = po.id
  WHERE po.voided_at IS NULL AND ABS(po.amount_paid - agg.linked) > 0.005

  UNION ALL
  -- duplicate linked earning
  SELECT 'duplicate_link', 'high', l.payroll_entry_id::text,
         'This earning is linked more than once to the same payment', SUM(l.amount_applied)
  FROM public.payout_entry_links l
  GROUP BY l.payout_id, l.payroll_entry_id
  HAVING COUNT(*) > 1

  UNION ALL
  -- paid status missing required fields
  SELECT 'incomplete_payment_record', 'high', po.id::text,
         'Payment record is missing an amount, date or method', COALESCE(po.amount_paid, 0)
  FROM public.payouts po
  WHERE po.voided_at IS NULL
    AND (po.amount_paid IS NULL OR po.amount_paid <= 0 OR po.paid_at IS NULL OR po.payment_method IS NULL)

  UNION ALL
  -- voided or disputed earning linked to a payment
  SELECT 'invalid_earning_linked', 'high', pe.id::text,
         format('A %s earning is linked to a payment', pe.earning_status), pe.total_owed
  FROM public.payroll_entries pe
  JOIN public.payout_entry_links l ON l.payroll_entry_id = pe.id
  JOIN public.payouts po ON po.id = l.payout_id AND po.voided_at IS NULL
  WHERE pe.earning_status IN ('voided','disputed')

  UNION ALL
  -- payment recorded against the wrong provider
  SELECT 'provider_mismatch', 'high', po.id::text,
         'A payment includes an earning belonging to a different provider', po.amount_paid
  FROM public.payouts po
  JOIN public.payout_entry_links l ON l.payout_id = po.id
  JOIN public.payroll_entries pe ON pe.id = l.payroll_entry_id
  WHERE po.psw_id IS NOT NULL AND pe.psw_id IS DISTINCT FROM po.psw_id::text

  UNION ALL
  -- correction without an original payment
  SELECT 'orphan_correction', 'medium', c.id::text,
         'A payment correction has no original payment record', c.corrected_amount
  FROM public.payout_corrections c
  WHERE NOT EXISTS (SELECT 1 FROM public.payouts po WHERE po.id = c.original_payout_id);
END;
$$;

-- 10. Provider self-service statement -----------------------------------
CREATE OR REPLACE FUNCTION public.psw_earnings_statement(p_from date, p_to date)
RETURNS TABLE (
  entry_id uuid, service_date date, booking_code text, service text,
  hours numeric, rate_cents integer, gross_cents integer,
  adjustments_cents integer, final_cents integer,
  earning_status text, adjustment_note text,
  paid_at timestamptz, payment_method text, payment_reference text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_psw uuid;
BEGIN
  SELECT id INTO v_psw FROM public.psw_profiles
  WHERE lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''));
  IF v_psw IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  RETURN QUERY
  SELECT pe.id, pe.scheduled_date, b.booking_code, pe.task_name,
         pe.hours_worked, pe.rate_cents, pe.gross_cents,
         COALESCE(pe.adjustments_cents, 0),
         COALESCE(pe.gross_cents,0) + COALESCE(pe.adjustments_cents,0),
         pe.earning_status::text, pe.adjustment_reason,
         po.paid_at, po.payment_method::text, po.reference_number
  FROM public.payroll_entries pe
  LEFT JOIN public.bookings b ON b.id = pe.booking_id
  LEFT JOIN public.payouts po ON po.id = pe.manual_payout_id AND po.voided_at IS NULL
  WHERE pe.psw_id = v_psw::text
    AND pe.scheduled_date BETWEEN p_from AND p_to
  ORDER BY pe.scheduled_date;
END;
$$;

-- 11. Grants ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_earning_review_queue() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_manual_payout_reconciliation() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_correct_manual_payout(uuid, text, numeric, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_add_earning_adjustment(uuid, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.psw_earnings_statement(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_earning_review_queue() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_manual_payout_reconciliation() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_correct_manual_payout(uuid, text, numeric, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_add_earning_adjustment(uuid, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.psw_earnings_statement(date, date) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_payroll_entries_earning_status ON public.payroll_entries(earning_status);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_booking ON public.payroll_entries(booking_id);