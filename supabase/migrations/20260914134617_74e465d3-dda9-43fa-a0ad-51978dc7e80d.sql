-- 1. Permanent manual-payout feature flag (default + production value: false)
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('AUTOMATIC_PROVIDER_PAYOUTS_ENABLED', 'false')
ON CONFLICT (setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.automatic_provider_payouts_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT lower(setting_value) = 'true'
       FROM public.app_settings
      WHERE setting_key = 'AUTOMATIC_PROVIDER_PAYOUTS_ENABLED'
      LIMIT 1),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.automatic_provider_payouts_enabled() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.automatic_provider_payouts_enabled() TO authenticated, service_role;

-- 2. Manual payout status model
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_earning_status') THEN
    CREATE TYPE public.provider_earning_status AS ENUM (
      'pending_shift_completion',
      'pending_care_sheet',
      'pending_office_review',
      'approved_for_manual_payment',
      'disputed',
      'paid_manually',
      'voided'
    );
  END IF;
END $$;

ALTER TABLE public.payroll_entries
  ADD COLUMN IF NOT EXISTS earning_status public.provider_earning_status
  NOT NULL DEFAULT 'pending_shift_completion';

-- Backfill from existing state only (no new "paid" records are invented)
UPDATE public.payroll_entries pe
SET earning_status = CASE
  WHEN pe.status = 'cleared' THEN 'paid_manually'::public.provider_earning_status
  WHEN pe.payout_request_id IS NOT NULL THEN 'pending_office_review'::public.provider_earning_status
  WHEN pe.completed_at IS NOT NULL THEN 'pending_office_review'::public.provider_earning_status
  ELSE 'pending_shift_completion'::public.provider_earning_status
END
WHERE pe.earning_status = 'pending_shift_completion';

-- 3. Immutable audit history for provider earnings
CREATE TABLE IF NOT EXISTS public.provider_earning_status_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_entry_id uuid NOT NULL REFERENCES public.payroll_entries(id) ON DELETE CASCADE,
  psw_id text,
  old_status public.provider_earning_status,
  new_status public.provider_earning_status NOT NULL,
  old_legacy_status text,
  new_legacy_status text,
  amount numeric,
  changed_by text,
  changed_by_uid uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.provider_earning_status_audit TO authenticated;
GRANT ALL ON public.provider_earning_status_audit TO service_role;
ALTER TABLE public.provider_earning_status_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read earning audit" ON public.provider_earning_status_audit;
CREATE POLICY "Admins read earning audit"
ON public.provider_earning_status_audit FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "PSWs read own earning audit" ON public.provider_earning_status_audit;
CREATE POLICY "PSWs read own earning audit"
ON public.provider_earning_status_audit FOR SELECT TO authenticated
USING (psw_id IN (
  SELECT p.id::text FROM public.psw_profiles p
  WHERE p.email = (auth.jwt() ->> 'email')
));

CREATE INDEX IF NOT EXISTS idx_provider_earning_audit_entry
  ON public.provider_earning_status_audit(payroll_entry_id, created_at DESC);

-- Immutability: audit rows can never be edited or deleted
CREATE OR REPLACE FUNCTION public.block_earning_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Provider earning audit history is immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_earning_audit_immutable ON public.provider_earning_status_audit;
CREATE TRIGGER trg_earning_audit_immutable
BEFORE UPDATE OR DELETE ON public.provider_earning_status_audit
FOR EACH ROW EXECUTE FUNCTION public.block_earning_audit_mutation();

-- 4. Authorization guard + audit writer on payroll entries
CREATE OR REPLACE FUNCTION public.guard_provider_earning_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_privileged boolean;
  v_actor text;
BEGIN
  v_privileged := public.is_admin()
    OR current_user IN ('service_role', 'postgres', 'supabase_admin');
  v_actor := COALESCE(auth.jwt() ->> 'email', current_user);

  IF NEW.earning_status IS DISTINCT FROM OLD.earning_status THEN
    IF NEW.earning_status IN (
         'approved_for_manual_payment', 'paid_manually', 'disputed', 'voided'
       ) AND NOT v_privileged THEN
      RAISE EXCEPTION 'Only an administrator may set provider earning status to %', NEW.earning_status;
    END IF;

    -- An earning may only be marked paid manually when a real payout exists
    IF NEW.earning_status = 'paid_manually'
       AND NOT EXISTS (
         SELECT 1 FROM public.payout_entry_links l
         JOIN public.payouts p ON p.id = l.payout_id
         WHERE l.payroll_entry_id = NEW.id AND p.voided_at IS NULL
       )
       AND COALESCE(NEW.status, '') <> 'cleared' THEN
      RAISE EXCEPTION 'An earning cannot be marked paid manually without a recorded manual payout';
    END IF;
  END IF;

  IF NEW.earning_status IS DISTINCT FROM OLD.earning_status
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.provider_earning_status_audit (
      payroll_entry_id, psw_id, old_status, new_status,
      old_legacy_status, new_legacy_status, amount, changed_by, changed_by_uid
    ) VALUES (
      NEW.id, NEW.psw_id, OLD.earning_status, NEW.earning_status,
      OLD.status, NEW.status, NEW.total_owed, v_actor, auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_provider_earning_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_provider_earning_status ON public.payroll_entries;
CREATE TRIGGER trg_guard_provider_earning_status
BEFORE UPDATE ON public.payroll_entries
FOR EACH ROW EXECUTE FUNCTION public.guard_provider_earning_status();

-- 5. Remove stale anonymous execute on admin payout functions
REVOKE EXECUTE ON FUNCTION public.admin_approve_payout(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_clear_payout(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_payout(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_payout_ready(uuid) FROM anon;