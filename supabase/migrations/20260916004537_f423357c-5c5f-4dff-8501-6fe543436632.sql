-- ============================================================
-- Phase 8: Provider earnings rule (additive, reversible)
-- ============================================================

-- 1. Approved provider rates ---------------------------------
CREATE TABLE IF NOT EXISTS public.provider_earning_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province text NOT NULL,
  provider_type text NOT NULL,
  rate_cents integer,
  currency text NOT NULL DEFAULT 'CAD',
  is_active boolean NOT NULL DEFAULT false,
  rule_version text NOT NULL DEFAULT 'phase8-v1',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_earning_rates_rate_positive CHECK (rate_cents IS NULL OR rate_cents > 0),
  CONSTRAINT provider_earning_rates_active_needs_rate CHECK (is_active = false OR rate_cents IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_earning_rates_unique
  ON public.provider_earning_rates (province, provider_type);

GRANT SELECT ON public.provider_earning_rates TO authenticated;
GRANT ALL ON public.provider_earning_rates TO service_role;

ALTER TABLE public.provider_earning_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read provider rates" ON public.provider_earning_rates;
CREATE POLICY "authenticated can read provider rates"
  ON public.provider_earning_rates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admins manage provider rates" ON public.provider_earning_rates;
CREATE POLICY "admins manage provider rates"
  ON public.provider_earning_rates FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS provider_earning_rates_updated_at ON public.provider_earning_rates;
CREATE TRIGGER provider_earning_rates_updated_at
  BEFORE UPDATE ON public.provider_earning_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ontario PSW is the only approved rate. Everything else is a placeholder
-- with NO rate so an amount can never be invented.
INSERT INTO public.provider_earning_rates (province, provider_type, rate_cents, is_active, notes)
VALUES
  ('ON','psw', 2100, true,  'Ontario PSW: $21.00 per client-requested hour.'),
  ('ON','rpn', NULL, false, 'Requires approval before activation. No rate configured.'),
  ('ON','rn',  NULL, false, 'Requires approval before activation. No rate configured.'),
  ('AB','hca', NULL, false, 'Requires Alberta legal and operational approval before activation.'),
  ('AB','lpn', NULL, false, 'Requires Alberta legal and operational approval before activation.'),
  ('AB','rn',  NULL, false, 'Requires Alberta legal and operational approval before activation.')
ON CONFLICT (province, provider_type) DO NOTHING;

-- 2. Rate lookup ---------------------------------------------
CREATE OR REPLACE FUNCTION public.provider_rate_cents(p_province text, p_provider_type text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.rate_cents
  FROM public.provider_earning_rates r
  WHERE r.province = COALESCE(NULLIF(p_province,''), 'ON')
    AND r.provider_type = lower(COALESCE(NULLIF(p_provider_type,''), 'psw'))
    AND r.is_active = true
    AND r.rate_cents > 0
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.provider_rate_cents(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_rate_cents(text, text) TO authenticated, service_role;

-- 3. Immutable earning snapshots -----------------------------
CREATE TABLE IF NOT EXISTS public.provider_earning_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  payroll_entry_id uuid,
  provider_id text,
  provider_type text NOT NULL DEFAULT 'psw',
  province text NOT NULL DEFAULT 'ON',
  requested_start time,
  requested_end time,
  requested_minutes integer,
  rate_cents integer,
  gross_cents integer,
  currency text NOT NULL DEFAULT 'CAD',
  rule_version text NOT NULL DEFAULT 'phase8-v1',
  reason text,
  superseded_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_earning_snapshots_booking_idx
  ON public.provider_earning_snapshots (booking_id, created_at DESC);

GRANT SELECT ON public.provider_earning_snapshots TO authenticated;
GRANT ALL ON public.provider_earning_snapshots TO service_role;

ALTER TABLE public.provider_earning_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read earning snapshots" ON public.provider_earning_snapshots;
CREATE POLICY "admins read earning snapshots"
  ON public.provider_earning_snapshots FOR SELECT TO authenticated
  USING (public.is_admin() OR provider_id = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.block_earning_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Provider earning snapshots are immutable and cannot be deleted';
  END IF;
  -- Only the supersede marker may ever change.
  IF NEW.booking_id IS DISTINCT FROM OLD.booking_id
     OR NEW.provider_id IS DISTINCT FROM OLD.provider_id
     OR NEW.requested_minutes IS DISTINCT FROM OLD.requested_minutes
     OR NEW.rate_cents IS DISTINCT FROM OLD.rate_cents
     OR NEW.gross_cents IS DISTINCT FROM OLD.gross_cents
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Provider earning snapshots are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS provider_earning_snapshots_immutable ON public.provider_earning_snapshots;
CREATE TRIGGER provider_earning_snapshots_immutable
  BEFORE UPDATE OR DELETE ON public.provider_earning_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.block_earning_snapshot_mutation();

-- 4. Review fields on payroll entries ------------------------
ALTER TABLE public.payroll_entries
  ADD COLUMN IF NOT EXISTS earning_review_reason text,
  ADD COLUMN IF NOT EXISTS expected_gross_cents integer,
  ADD COLUMN IF NOT EXISTS payment_discrepancy_cents integer,
  ADD COLUMN IF NOT EXISTS rate_source text;
