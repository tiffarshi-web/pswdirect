-- ============================================================================
-- PAYROLL CORRECTION: Booked-hours default + admin override + flag-for-review
-- Disable Urban Bonus everywhere; backfill all entries; remove Ololade bad row
-- ============================================================================

-- 1) Schema additions on payroll_entries
ALTER TABLE public.payroll_entries
  ADD COLUMN IF NOT EXISTS booked_hours numeric,
  ADD COLUMN IF NOT EXISTS clocked_hours numeric,
  ADD COLUMN IF NOT EXISTS payable_hours_override numeric,
  ADD COLUMN IF NOT EXISTS variance_hours numeric,
  ADD COLUMN IF NOT EXISTS requires_admin_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by_admin text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 2) Disable Urban Bonus in pricing_configs (zero out, cannot accidentally reactivate)
UPDATE public.pricing_configs SET psw_urban_bonus = 0 WHERE psw_urban_bonus <> 0;

-- 3) Rewrite payroll upsert: booked_hours is the default; clocked is reference; override wins.
CREATE OR REPLACE FUNCTION public.upsert_payroll_entry_for_booking(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  b public.bookings%ROWTYPE;
  v_rates jsonb;
  v_standard numeric := 20;
  v_hospital numeric := 28;
  v_doctor numeric := 26;
  v_hourly_rate numeric;
  v_booked_hours numeric;
  v_clocked_hours numeric := NULL;
  v_variance numeric := NULL;
  v_final_hours numeric;
  v_total_owed numeric;
  v_task_label text := 'Standard Home Care';
  v_effective_in timestamptz;
  v_effective_out timestamptz;
  v_adj record;
  v_existing record;
  v_tolerance numeric := 0.05;
  v_requires_review boolean := false;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF b.status IS DISTINCT FROM 'completed'
     OR b.psw_assigned IS NULL OR b.psw_assigned = ''
     OR COALESCE(b.was_refunded, false) = true
     OR b.status = 'cancelled' THEN
    RETURN;
  END IF;

  -- Booked hours = client-ordered hours (source of truth for payroll)
  v_booked_hours := GREATEST(COALESCE(b.hours, 0), 0);

  -- Clocked hours = reference only (use adjusted times if present, else raw)
  SELECT adjusted_clock_in::timestamptz, adjusted_clock_out::timestamptz
  INTO v_adj
  FROM public.shift_time_adjustments
  WHERE booking_id = p_booking_id
  ORDER BY adjusted_at DESC LIMIT 1;

  v_effective_in := COALESCE(v_adj.adjusted_clock_in, b.checked_in_at);
  v_effective_out := COALESCE(v_adj.adjusted_clock_out, b.signed_out_at);

  IF v_effective_in IS NOT NULL AND v_effective_out IS NOT NULL AND v_effective_out > v_effective_in THEN
    v_clocked_hours := EXTRACT(EPOCH FROM (v_effective_out - v_effective_in)) / 3600.0;
    v_clocked_hours := ROUND(v_clocked_hours::numeric, 2);
    v_variance := ROUND((v_clocked_hours - v_booked_hours)::numeric, 2);
    IF ABS(v_variance) > v_tolerance THEN
      v_requires_review := true;
    END IF;
  END IF;

  -- Pay rates from app_settings
  SELECT setting_value::jsonb INTO v_rates
  FROM public.app_settings WHERE setting_key = 'staff_pay_rates' LIMIT 1;
  IF v_rates IS NOT NULL THEN
    v_standard := COALESCE((v_rates ->> 'standardHomeCare')::numeric, v_standard);
    v_hospital := COALESCE((v_rates ->> 'hospitalVisit')::numeric, v_hospital);
    v_doctor   := COALESCE((v_rates ->> 'doctorVisit')::numeric, v_doctor);
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(b.service_type, ARRAY[]::text[])) s
    WHERE lower(s) LIKE '%hospital%' OR lower(s) LIKE '%discharge%'
       OR lower(s) LIKE '%pick-up%' OR lower(s) LIKE '%pickup%'
  ) THEN
    v_task_label := 'Hospital Visit'; v_hourly_rate := v_hospital;
  ELSIF EXISTS (
    SELECT 1 FROM unnest(COALESCE(b.service_type, ARRAY[]::text[])) s
    WHERE lower(s) LIKE '%doctor%' OR lower(s) LIKE '%appointment%' OR lower(s) LIKE '%escort%'
  ) THEN
    v_task_label := 'Doctor Visit'; v_hourly_rate := v_doctor;
  ELSE
    v_hourly_rate := v_standard;
  END IF;

  -- Preserve any existing admin override on re-upsert
  SELECT payable_hours_override, requires_admin_review, reviewed_by_admin, reviewed_at, payroll_review_note
  INTO v_existing
  FROM public.payroll_entries WHERE shift_id = b.id::text;

  -- Final payable hours: override if present, else booked
  v_final_hours := COALESCE(v_existing.payable_hours_override, v_booked_hours);
  v_total_owed := ROUND((v_final_hours * v_hourly_rate)::numeric, 2);

  -- If admin already reviewed, don't re-flag
  IF v_existing.reviewed_at IS NOT NULL OR v_existing.payable_hours_override IS NOT NULL THEN
    v_requires_review := false;
  END IF;

  INSERT INTO public.payroll_entries (
    shift_id, psw_id, psw_name, task_name, scheduled_date,
    hours_worked, hourly_rate, surcharge_applied, total_owed,
    status, completed_at, earned_date,
    booked_hours, clocked_hours, variance_hours,
    payable_hours_override, requires_admin_review,
    reviewed_by_admin, reviewed_at, payroll_review_note
  ) VALUES (
    b.id::text, b.psw_assigned, COALESCE(NULLIF(b.psw_first_name,''),'Unknown PSW'),
    CASE WHEN COALESCE(array_length(b.service_type,1),0) > 0
         THEN v_task_label || ': ' || array_to_string(b.service_type,', ')
         ELSE v_task_label END,
    b.scheduled_date,
    ROUND(v_final_hours::numeric, 2), v_hourly_rate, 0, v_total_owed,
    'pending', COALESCE(b.signed_out_at, b.updated_at), b.scheduled_date,
    ROUND(v_booked_hours::numeric, 2), v_clocked_hours, v_variance,
    v_existing.payable_hours_override, v_requires_review,
    v_existing.reviewed_by_admin, v_existing.reviewed_at, v_existing.payroll_review_note
  )
  ON CONFLICT (shift_id) DO UPDATE SET
    psw_id = EXCLUDED.psw_id,
    psw_name = EXCLUDED.psw_name,
    task_name = EXCLUDED.task_name,
    scheduled_date = EXCLUDED.scheduled_date,
    hours_worked = EXCLUDED.hours_worked,
    hourly_rate = EXCLUDED.hourly_rate,
    surcharge_applied = 0,
    total_owed = EXCLUDED.total_owed,
    completed_at = EXCLUDED.completed_at,
    earned_date = EXCLUDED.earned_date,
    booked_hours = EXCLUDED.booked_hours,
    clocked_hours = EXCLUDED.clocked_hours,
    variance_hours = EXCLUDED.variance_hours,
    requires_admin_review = EXCLUDED.requires_admin_review,
    updated_at = now();
END;
$function$;

-- 4) Admin RPC to set/clear payable hours override (final source of truth)
CREATE OR REPLACE FUNCTION public.admin_set_payable_hours(
  p_entry_id uuid,
  p_override_hours numeric,
  p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rate numeric;
  v_booked numeric;
  v_admin text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  SELECT hourly_rate, booked_hours INTO v_rate, v_booked
  FROM public.payroll_entries WHERE id = p_entry_id;

  IF v_rate IS NULL THEN RETURN; END IF;

  UPDATE public.payroll_entries
  SET payable_hours_override = p_override_hours,
      hours_worked = COALESCE(p_override_hours, COALESCE(v_booked, hours_worked)),
      total_owed = ROUND((COALESCE(p_override_hours, COALESCE(v_booked, hours_worked)) * v_rate)::numeric, 2),
      requires_admin_review = false,
      reviewed_by_admin = v_admin,
      reviewed_at = now(),
      payroll_review_note = COALESCE(p_note, payroll_review_note),
      updated_at = now()
  WHERE id = p_entry_id;
END;
$$;

-- 5) Admin RPC: approve booked hours as-is (clear flag without changing hours)
CREATE OR REPLACE FUNCTION public.admin_approve_booked_hours(
  p_entry_id uuid,
  p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  UPDATE public.payroll_entries
  SET requires_admin_review = false,
      reviewed_by_admin = v_admin,
      reviewed_at = now(),
      payroll_review_note = COALESCE(p_note, payroll_review_note),
      updated_at = now()
  WHERE id = p_entry_id;
END;
$$;

-- 6) BACKFILL: rewrite all payroll_entries from bookings using new rules.
--    Preserves any existing payable_hours_override.
DO $$
DECLARE r record; v_clocked numeric; v_var numeric; v_final numeric; v_eff_in timestamptz; v_eff_out timestamptz;
BEGIN
  FOR r IN
    SELECT pe.id as entry_id, pe.shift_id, pe.hourly_rate, pe.payable_hours_override,
           b.hours as booked, b.checked_in_at, b.signed_out_at,
           sta.adjusted_clock_in, sta.adjusted_clock_out
    FROM public.payroll_entries pe
    LEFT JOIN public.bookings b ON b.id::text = pe.shift_id
    LEFT JOIN LATERAL (
      SELECT adjusted_clock_in, adjusted_clock_out
      FROM public.shift_time_adjustments
      WHERE booking_id::text = pe.shift_id
      ORDER BY adjusted_at DESC LIMIT 1
    ) sta ON true
  LOOP
    v_eff_in := COALESCE(r.adjusted_clock_in, r.checked_in_at);
    v_eff_out := COALESCE(r.adjusted_clock_out, r.signed_out_at);
    v_clocked := NULL; v_var := NULL;
    IF v_eff_in IS NOT NULL AND v_eff_out IS NOT NULL AND v_eff_out > v_eff_in THEN
      v_clocked := ROUND((EXTRACT(EPOCH FROM (v_eff_out - v_eff_in)) / 3600.0)::numeric, 2);
      v_var := ROUND((v_clocked - COALESCE(r.booked, 0))::numeric, 2);
    END IF;
    v_final := COALESCE(r.payable_hours_override, r.booked, 0);

    UPDATE public.payroll_entries
    SET booked_hours = ROUND(COALESCE(r.booked, 0)::numeric, 2),
        clocked_hours = v_clocked,
        variance_hours = v_var,
        hours_worked = ROUND(v_final::numeric, 2),
        total_owed = ROUND((v_final * COALESCE(r.hourly_rate, 0))::numeric, 2),
        surcharge_applied = 0,
        requires_admin_review = CASE
          WHEN r.payable_hours_override IS NOT NULL THEN false
          WHEN v_var IS NOT NULL AND ABS(v_var) > 0.05 THEN true
          ELSE false END,
        updated_at = now()
    WHERE id = r.entry_id;
  END LOOP;
END $$;

-- 7) FIX OLOLADE: remove bad payroll row + unassign her from booking CDT-000016
DELETE FROM public.payroll_entries
WHERE shift_id = 'cccd3ae2-2da7-4092-938c-c942f1eae97c' AND psw_name ILIKE '%ololade%';

UPDATE public.bookings
SET psw_assigned = NULL, psw_first_name = NULL,
    claimed_at = NULL, checked_in_at = NULL, signed_out_at = NULL,
    status = CASE WHEN status = 'completed' THEN 'cancelled' ELSE status END,
    cancellation_reason = COALESCE(cancellation_reason, 'admin_correction'),
    cancellation_note = COALESCE(cancellation_note, 'Auto-corrected: Ololade incorrectly linked, unassigned during payroll cleanup'),
    updated_at = now()
WHERE id = 'cccd3ae2-2da7-4092-938c-c942f1eae97c';