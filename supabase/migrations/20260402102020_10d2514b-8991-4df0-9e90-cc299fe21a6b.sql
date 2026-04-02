
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
  v_hours_worked numeric;
  v_total_owed numeric;
  v_shift_type text := 'standard';
  v_task_label text := 'Standard Home Care';
  v_effective_in timestamptz;
  v_effective_out timestamptz;
  v_adj record;
BEGIN
  SELECT *
  INTO b
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Only completed bookings with an assigned PSW should generate payroll
  -- SKIP refunded or cancelled bookings
  IF b.status IS DISTINCT FROM 'completed' 
     OR b.psw_assigned IS NULL 
     OR b.psw_assigned = '' 
     OR COALESCE(b.was_refunded, false) = true
     OR b.status = 'cancelled'
  THEN
    RETURN;
  END IF;

  -- Check for adjusted times in shift_time_adjustments (most recent adjustment wins)
  SELECT adjusted_clock_in::timestamptz, adjusted_clock_out::timestamptz
  INTO v_adj
  FROM public.shift_time_adjustments
  WHERE booking_id = p_booking_id
  ORDER BY adjusted_at DESC
  LIMIT 1;

  -- Determine effective clock-in/clock-out
  -- Priority: adjusted times > original times > fallback to booked hours
  v_effective_in := COALESCE(v_adj.adjusted_clock_in, b.checked_in_at);
  v_effective_out := COALESCE(v_adj.adjusted_clock_out, b.signed_out_at);

  -- Determine hours worked from effective timestamps when available
  v_hours_worked := COALESCE(b.hours, 0);
  IF v_effective_in IS NOT NULL AND v_effective_out IS NOT NULL AND v_effective_out > v_effective_in THEN
    v_hours_worked := EXTRACT(EPOCH FROM (v_effective_out - v_effective_in)) / 3600.0;
  END IF;
  v_hours_worked := GREATEST(COALESCE(v_hours_worked, 0), 0);

  -- Load configurable pay rates from app_settings when present
  SELECT setting_value::jsonb
  INTO v_rates
  FROM public.app_settings
  WHERE setting_key = 'staff_pay_rates'
  LIMIT 1;

  IF v_rates IS NOT NULL THEN
    v_standard := COALESCE((v_rates ->> 'standardHomeCare')::numeric, v_standard);
    v_hospital := COALESCE((v_rates ->> 'hospitalVisit')::numeric, v_hospital);
    v_doctor := COALESCE((v_rates ->> 'doctorVisit')::numeric, v_doctor);
  END IF;

  -- Classify shift from booking services
  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(b.service_type, ARRAY[]::text[])) AS service_name
    WHERE lower(service_name) LIKE '%hospital%'
       OR lower(service_name) LIKE '%discharge%'
       OR lower(service_name) LIKE '%pick-up%'
       OR lower(service_name) LIKE '%pickup%'
  ) THEN
    v_shift_type := 'hospital';
    v_task_label := 'Hospital Visit';
    v_hourly_rate := v_hospital;
  ELSIF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(b.service_type, ARRAY[]::text[])) AS service_name
    WHERE lower(service_name) LIKE '%doctor%'
       OR lower(service_name) LIKE '%appointment%'
       OR lower(service_name) LIKE '%escort%'
  ) THEN
    v_shift_type := 'doctor';
    v_task_label := 'Doctor Visit';
    v_hourly_rate := v_doctor;
  ELSE
    v_hourly_rate := v_standard;
  END IF;

  v_total_owed := ROUND((v_hours_worked * v_hourly_rate)::numeric, 2);

  INSERT INTO public.payroll_entries (
    shift_id,
    psw_id,
    psw_name,
    task_name,
    scheduled_date,
    hours_worked,
    hourly_rate,
    surcharge_applied,
    total_owed,
    status,
    completed_at,
    earned_date
  )
  VALUES (
    b.id::text,
    b.psw_assigned,
    COALESCE(NULLIF(b.psw_first_name, ''), 'Unknown PSW'),
    CASE
      WHEN COALESCE(array_length(b.service_type, 1), 0) > 0 THEN v_task_label || ': ' || array_to_string(b.service_type, ', ')
      ELSE v_task_label
    END,
    b.scheduled_date,
    ROUND(v_hours_worked::numeric, 2),
    v_hourly_rate,
    COALESCE(b.surge_amount, 0),
    v_total_owed,
    'pending',
    COALESCE(b.signed_out_at, b.updated_at),
    b.scheduled_date
  )
  ON CONFLICT (shift_id)
  DO UPDATE SET
    psw_id = EXCLUDED.psw_id,
    psw_name = EXCLUDED.psw_name,
    task_name = EXCLUDED.task_name,
    scheduled_date = EXCLUDED.scheduled_date,
    hours_worked = EXCLUDED.hours_worked,
    hourly_rate = EXCLUDED.hourly_rate,
    surcharge_applied = EXCLUDED.surcharge_applied,
    total_owed = EXCLUDED.total_owed,
    completed_at = EXCLUDED.completed_at,
    earned_date = EXCLUDED.earned_date,
    updated_at = now();
END;
$function$;
