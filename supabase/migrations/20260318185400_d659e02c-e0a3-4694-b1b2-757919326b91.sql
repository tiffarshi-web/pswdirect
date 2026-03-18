-- Ensure payroll sync is idempotent at the database level
CREATE UNIQUE INDEX IF NOT EXISTS payroll_entries_shift_id_unique_idx
ON public.payroll_entries (shift_id);

-- Create or replace server-side payroll upsert for completed bookings
CREATE OR REPLACE FUNCTION public.upsert_payroll_entry_for_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  SELECT *
  INTO b
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Only completed bookings with an assigned PSW should generate payroll
  IF b.status IS DISTINCT FROM 'completed' OR b.psw_assigned IS NULL OR b.psw_assigned = '' THEN
    RETURN;
  END IF;

  -- Determine hours worked from actual timestamps when available
  v_hours_worked := COALESCE(b.hours, 0);
  IF b.checked_in_at IS NOT NULL AND b.signed_out_at IS NOT NULL AND b.signed_out_at > b.checked_in_at THEN
    v_hours_worked := EXTRACT(EPOCH FROM (b.signed_out_at - b.checked_in_at)) / 3600.0;
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
$$;

-- Backfill helper for all completed bookings
CREATE OR REPLACE FUNCTION public.sync_completed_bookings_to_payroll()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_count integer := 0;
BEGIN
  FOR v_booking IN
    SELECT id
    FROM public.bookings
    WHERE status = 'completed'
      AND psw_assigned IS NOT NULL
      AND psw_assigned <> ''
  LOOP
    PERFORM public.upsert_payroll_entry_for_booking(v_booking.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Trigger payroll generation automatically when bookings are completed or updated after completion
CREATE OR REPLACE FUNCTION public.handle_booking_payroll_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.psw_assigned IS NOT NULL AND NEW.psw_assigned <> '' THEN
    PERFORM public.upsert_payroll_entry_for_booking(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_to_payroll ON public.bookings;
CREATE TRIGGER trg_sync_booking_to_payroll
AFTER INSERT OR UPDATE OF status, psw_assigned, psw_first_name, service_type, scheduled_date, hours, checked_in_at, signed_out_at, surge_amount, updated_at
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_booking_payroll_sync();

-- Allow admins to execute explicit backfill sync from the app
GRANT EXECUTE ON FUNCTION public.sync_completed_bookings_to_payroll() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_payroll_entry_for_booking(uuid) TO authenticated;