-- =============================================================================
-- Manual Payout Ledger
-- =============================================================================

-- Payment method enum
DO $$ BEGIN
  CREATE TYPE public.payout_method AS ENUM ('e_transfer', 'bank_transfer', 'cash', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payouts table: one row per real-world payment to a caregiver
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psw_id uuid NOT NULL REFERENCES public.psw_profiles(id) ON DELETE CASCADE,
  amount_paid numeric(10,2) NOT NULL CHECK (amount_paid > 0),
  paid_at timestamptz NOT NULL DEFAULT now(),
  payment_method public.payout_method NOT NULL DEFAULT 'e_transfer',
  reference_number text,
  note text,
  created_by_admin text NOT NULL,
  voided_at timestamptz,
  voided_by text,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payouts_psw_id ON public.payouts(psw_id);
CREATE INDEX IF NOT EXISTS idx_payouts_paid_at ON public.payouts(paid_at DESC);

-- Link table: which earnings this payout covers (supports partial via amount_applied)
CREATE TABLE IF NOT EXISTS public.payout_entry_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.payouts(id) ON DELETE CASCADE,
  payroll_entry_id uuid NOT NULL REFERENCES public.payroll_entries(id) ON DELETE RESTRICT,
  amount_applied numeric(10,2) NOT NULL CHECK (amount_applied > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payout_id, payroll_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_payout_entry_links_payout ON public.payout_entry_links(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_entry_links_entry ON public.payout_entry_links(payroll_entry_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_payouts_updated_at ON public.payouts;
CREATE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Track manually-paid earnings on payroll_entries (separate from payout_request flow)
ALTER TABLE public.payroll_entries
  ADD COLUMN IF NOT EXISTS manual_payout_id uuid REFERENCES public.payouts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manually_paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_payroll_entries_manual_payout ON public.payroll_entries(manual_payout_id);

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_entry_links ENABLE ROW LEVEL SECURITY;

-- Admins: full access
DROP POLICY IF EXISTS "Admins manage payouts" ON public.payouts;
CREATE POLICY "Admins manage payouts" ON public.payouts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage payout links" ON public.payout_entry_links;
CREATE POLICY "Admins manage payout links" ON public.payout_entry_links
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PSWs: view their own payouts (read-only)
DROP POLICY IF EXISTS "PSWs view own payouts" ON public.payouts;
CREATE POLICY "PSWs view own payouts" ON public.payouts
  FOR SELECT TO authenticated
  USING (
    psw_id IN (
      SELECT id FROM public.psw_profiles
      WHERE email = (auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "PSWs view own payout links" ON public.payout_entry_links;
CREATE POLICY "PSWs view own payout links" ON public.payout_entry_links
  FOR SELECT TO authenticated
  USING (
    payout_id IN (
      SELECT id FROM public.payouts
      WHERE psw_id IN (
        SELECT id FROM public.psw_profiles
        WHERE email = (auth.jwt() ->> 'email')
      )
    )
  );

-- =============================================================================
-- Admin RPC: record a manual payout
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_record_manual_payout(
  p_psw_id uuid,
  p_amount numeric,
  p_paid_at timestamptz,
  p_method public.payout_method,
  p_entry_ids uuid[],
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
  v_eligible_total numeric := 0;
  v_eligible_count int := 0;
  v_already_paid int := 0;
  v_entry_id uuid;
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

  -- Validate: entries belong to this PSW, are admin-approved, and not already paid
  SELECT COUNT(*) INTO v_already_paid
  FROM public.payroll_entries
  WHERE id = ANY(p_entry_ids)
    AND (status = 'cleared' OR manual_payout_id IS NOT NULL);
  IF v_already_paid > 0 THEN
    RAISE EXCEPTION 'One or more selected earnings are already paid';
  END IF;

  SELECT COALESCE(SUM(total_owed), 0), COUNT(*)
  INTO v_eligible_total, v_eligible_count
  FROM public.payroll_entries
  WHERE id = ANY(p_entry_ids)
    AND psw_id = p_psw_id::text
    AND requires_admin_review = false;

  IF v_eligible_count <> array_length(p_entry_ids, 1) THEN
    RAISE EXCEPTION 'Some entries are invalid: not approved, wrong PSW, or do not exist';
  END IF;

  -- Insert the payout record
  INSERT INTO public.payouts (
    psw_id, amount_paid, paid_at, payment_method, reference_number, note, created_by_admin
  ) VALUES (
    p_psw_id, p_amount, COALESCE(p_paid_at, now()), p_method, p_reference, p_note, v_admin
  ) RETURNING id INTO v_payout_id;

  -- Link earnings & mark them paid
  FOREACH v_entry_id IN ARRAY p_entry_ids LOOP
    SELECT total_owed INTO v_entry FROM public.payroll_entries WHERE id = v_entry_id;
    INSERT INTO public.payout_entry_links (payout_id, payroll_entry_id, amount_applied)
    VALUES (v_payout_id, v_entry_id, v_entry.total_owed);
  END LOOP;

  UPDATE public.payroll_entries
  SET status = 'cleared',
      cleared_at = COALESCE(p_paid_at, now()),
      manual_payout_id = v_payout_id,
      manually_paid_at = COALESCE(p_paid_at, now()),
      updated_at = now()
  WHERE id = ANY(p_entry_ids);

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'amount_paid', p_amount,
    'eligible_total', v_eligible_total,
    'entry_count', v_eligible_count
  );
END;
$$;

-- =============================================================================
-- Admin RPC: void a manual payout (unlocks the earnings)
-- =============================================================================
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
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  -- Unlock earnings
  UPDATE public.payroll_entries
  SET status = 'pending',
      cleared_at = NULL,
      manual_payout_id = NULL,
      manually_paid_at = NULL,
      updated_at = now()
  WHERE manual_payout_id = p_payout_id;

  -- Mark payout voided
  UPDATE public.payouts
  SET voided_at = now(),
      voided_by = v_admin,
      void_reason = p_reason,
      updated_at = now()
  WHERE id = p_payout_id;
END;
$$;

-- =============================================================================
-- Read helper: per-PSW payout summary (admin)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_psw_payout_summary(p_psw_id uuid)
RETURNS TABLE (
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
    COALESCE((SELECT SUM(amount_paid) FROM public.payouts WHERE psw_id = p_psw_id AND voided_at IS NULL), 0) AS total_paid,
    COALESCE((SELECT SUM(total_owed) FROM public.payroll_entries
              WHERE psw_id = p_psw_id::text
                AND status != 'cleared'
                AND requires_admin_review = false), 0) AS outstanding_balance,
    (SELECT MAX(paid_at) FROM public.payouts WHERE psw_id = p_psw_id AND voided_at IS NULL) AS last_payout_at,
    (SELECT COUNT(*)::int FROM public.payouts WHERE psw_id = p_psw_id AND voided_at IS NULL) AS payout_count;
$$;