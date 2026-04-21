
-- 1. Add psw_pay_rate column to bookings (snapshot at creation time)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS psw_pay_rate numeric;

-- 2. Backfill existing bookings from their payroll_entries (most accurate historical truth)
UPDATE public.bookings b
SET psw_pay_rate = pe.hourly_rate
FROM public.payroll_entries pe
WHERE pe.shift_id = b.id::text
  AND b.psw_pay_rate IS NULL
  AND pe.hourly_rate IS NOT NULL;

-- 3. For any bookings without payroll_entries, infer from current global rates by service type
--    (fallback only — these are bookings that never completed)
DO $$
DECLARE
  v_rates jsonb;
  v_standard numeric := 21;
  v_hospital numeric := 27;
  v_doctor numeric := 27;
BEGIN
  SELECT setting_value::jsonb INTO v_rates
  FROM public.app_settings WHERE setting_key = 'staff_pay_rates' LIMIT 1;
  IF v_rates IS NOT NULL THEN
    v_standard := COALESCE((v_rates ->> 'standardHomeCare')::numeric, v_standard);
    v_hospital := COALESCE((v_rates ->> 'hospitalVisit')::numeric, v_hospital);
    v_doctor   := COALESCE((v_rates ->> 'doctorVisit')::numeric, v_doctor);
  END IF;

  UPDATE public.bookings
  SET psw_pay_rate = CASE
    WHEN EXISTS (
      SELECT 1 FROM unnest(COALESCE(service_type, ARRAY[]::text[])) s
      WHERE lower(s) LIKE '%hospital%' OR lower(s) LIKE '%discharge%'
         OR lower(s) LIKE '%pick-up%' OR lower(s) LIKE '%pickup%'
    ) THEN v_hospital
    WHEN EXISTS (
      SELECT 1 FROM unnest(COALESCE(service_type, ARRAY[]::text[])) s
      WHERE lower(s) LIKE '%doctor%' OR lower(s) LIKE '%appointment%' OR lower(s) LIKE '%escort%'
    ) THEN v_doctor
    ELSE v_standard
  END
  WHERE psw_pay_rate IS NULL;
END $$;

-- 4. Rewrite payroll upsert function: read snapshot from booking, NOT global settings
CREATE OR REPLACE FUNCTION public.upsert_payroll_entry_for_booking(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  b public.bookings%ROWTYPE;
  v_rates jsonb;
  v_standard numeric := 21;
  v_hospital numeric := 27;
  v_doctor numeric := 27;
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

  v_booked_hours := GREATEST(COALESCE(b.hours, 0), 0);

  -- Adjusted clock times (reference only)
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

  -- =========================================================================
  -- RATE LOOKUP — SNAPSHOT FIRST, GLOBAL ONLY AS FALLBACK
  -- 1. If booking has psw_pay_rate stored, USE IT (source of truth, locked)
  -- 2. Otherwise, fall back to current global rates (legacy bookings only)
  -- =========================================================================
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(b.service_type, ARRAY[]::text[])) s
    WHERE lower(s) LIKE '%hospital%' OR lower(s) LIKE '%discharge%'
       OR lower(s) LIKE '%pick-up%' OR lower(s) LIKE '%pickup%'
  ) THEN
    v_task_label := 'Hospital Visit';
  ELSIF EXISTS (
    SELECT 1 FROM unnest(COALESCE(b.service_type, ARRAY[]::text[])) s
    WHERE lower(s) LIKE '%doctor%' OR lower(s) LIKE '%appointment%' OR lower(s) LIKE '%escort%'
  ) THEN
    v_task_label := 'Doctor Visit';
  END IF;

  IF b.psw_pay_rate IS NOT NULL AND b.psw_pay_rate > 0 THEN
    -- Use the locked-in snapshot from the booking
    v_hourly_rate := b.psw_pay_rate;
  ELSE
    -- Legacy fallback: read global rates
    SELECT setting_value::jsonb INTO v_rates
    FROM public.app_settings WHERE setting_key = 'staff_pay_rates' LIMIT 1;
    IF v_rates IS NOT NULL THEN
      v_standard := COALESCE((v_rates ->> 'standardHomeCare')::numeric, v_standard);
      v_hospital := COALESCE((v_rates ->> 'hospitalVisit')::numeric, v_hospital);
      v_doctor   := COALESCE((v_rates ->> 'doctorVisit')::numeric, v_doctor);
    END IF;

    v_hourly_rate := CASE v_task_label
      WHEN 'Hospital Visit' THEN v_hospital
      WHEN 'Doctor Visit'   THEN v_doctor
      ELSE v_standard
    END;

    -- Lock the snapshot back onto the booking so it never recalculates again
    UPDATE public.bookings SET psw_pay_rate = v_hourly_rate WHERE id = b.id;
  END IF;

  -- Preserve existing admin override if present
  SELECT payable_hours_override, requires_admin_review, reviewed_by_admin, reviewed_at, payroll_review_note
  INTO v_existing
  FROM public.payroll_entries WHERE shift_id = b.id::text;

  v_final_hours := COALESCE(v_existing.payable_hours_override, v_booked_hours);
  v_total_owed := ROUND((v_final_hours * v_hourly_rate)::numeric, 2);

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
