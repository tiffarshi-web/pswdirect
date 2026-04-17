-- Billing variance tracking on payroll_entries
ALTER TABLE public.payroll_entries
  ADD COLUMN IF NOT EXISTS billing_variance_hours numeric
    GENERATED ALWAYS AS (
      COALESCE(payable_hours_override, COALESCE(booked_hours, hours_worked)) - COALESCE(booked_hours, 0)
    ) STORED,
  ADD COLUMN IF NOT EXISTS billing_adjustment_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_adjustment_handled_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_adjustment_handled_by text;

-- Backfill flag for existing rows where override pushed pay above booked
UPDATE public.payroll_entries
SET billing_adjustment_required = true
WHERE billing_adjustment_handled_at IS NULL
  AND COALESCE(payable_hours_override, COALESCE(booked_hours, hours_worked)) - COALESCE(booked_hours, 0) > 0.05;

-- Update set-payable RPC to flip billing flag when override > booked
CREATE OR REPLACE FUNCTION public.admin_set_payable_hours(p_entry_id uuid, p_override_hours numeric, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rate numeric;
  v_booked numeric;
  v_admin text;
  v_final numeric;
  v_needs_billing boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  SELECT hourly_rate, booked_hours INTO v_rate, v_booked
  FROM public.payroll_entries WHERE id = p_entry_id;

  IF v_rate IS NULL THEN RETURN; END IF;

  v_final := COALESCE(p_override_hours, COALESCE(v_booked, 0));
  v_needs_billing := (v_final - COALESCE(v_booked, 0)) > 0.05;

  UPDATE public.payroll_entries
  SET payable_hours_override = p_override_hours,
      hours_worked = v_final,
      total_owed = ROUND((v_final * v_rate)::numeric, 2),
      requires_admin_review = false,
      reviewed_by_admin = v_admin,
      reviewed_at = now(),
      payroll_review_note = COALESCE(p_note, payroll_review_note),
      billing_adjustment_required = CASE
        WHEN v_needs_billing THEN true
        ELSE false
      END,
      billing_adjustment_handled_at = CASE
        WHEN v_needs_billing THEN NULL
        ELSE billing_adjustment_handled_at
      END,
      billing_adjustment_handled_by = CASE
        WHEN v_needs_billing THEN NULL
        ELSE billing_adjustment_handled_by
      END,
      updated_at = now()
  WHERE id = p_entry_id;
END;
$function$;

-- New RPC: admin marks billing adjustment as handled (tracking only, no Stripe)
CREATE OR REPLACE FUNCTION public.admin_mark_billing_handled(p_entry_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  UPDATE public.payroll_entries
  SET billing_adjustment_required = false,
      billing_adjustment_handled_at = now(),
      billing_adjustment_handled_by = v_admin,
      updated_at = now()
  WHERE id = p_entry_id;
END;
$function$;