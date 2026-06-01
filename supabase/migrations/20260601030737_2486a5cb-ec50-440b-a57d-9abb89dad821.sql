-- Allow payouts to be recorded for an external payee (no psw_profile yet)
ALTER TABLE public.payouts
  ALTER COLUMN psw_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS external_payee_name text;

-- Either a caregiver OR an external payee name must be present
ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_payee_present_chk;
ALTER TABLE public.payouts
  ADD CONSTRAINT payouts_payee_present_chk
  CHECK (psw_id IS NOT NULL OR (external_payee_name IS NOT NULL AND length(btrim(external_payee_name)) > 0));

-- RPC to record an external payee payout (no entry allocations)
CREATE OR REPLACE FUNCTION public.admin_record_external_payout(
  p_payee_name text,
  p_amount numeric,
  p_paid_at timestamp with time zone,
  p_method payout_method,
  p_reference text DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin text;
  v_payout_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_payee_name IS NULL OR length(btrim(p_payee_name)) = 0 THEN
    RAISE EXCEPTION 'Payee name required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  INSERT INTO public.payouts (
    psw_id, external_payee_name, amount_paid, paid_at,
    payment_method, reference_number, note, created_by_admin
  ) VALUES (
    NULL, btrim(p_payee_name), p_amount, p_paid_at,
    p_method, p_reference, p_note, v_admin
  ) RETURNING id INTO v_payout_id;

  RETURN v_payout_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_record_external_payout(text, numeric, timestamp with time zone, payout_method, text, text) TO authenticated;