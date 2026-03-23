
-- 1. Create invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  invoice_number text NOT NULL,
  booking_code text NOT NULL,
  client_email text NOT NULL,
  client_name text,
  invoice_type text NOT NULL DEFAULT 'client_invoice',
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  surge_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  status text NOT NULL DEFAULT 'generated',
  stripe_payment_intent_id text,
  html_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate invoices per booking+type
CREATE UNIQUE INDEX invoices_booking_type_uniq ON public.invoices (booking_id, invoice_type);

-- Index for lookups
CREATE INDEX invoices_booking_code_idx ON public.invoices (booking_code);
CREATE INDEX invoices_client_email_idx ON public.invoices (client_email);

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (client_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Service can insert invoices" ON public.invoices
  FOR INSERT TO anon
  WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Update get_nearby_psws to filter expired police checks (issued_date + 1 year)
CREATE OR REPLACE FUNCTION public.get_nearby_psws(p_lat numeric, p_lng numeric, p_radius_km numeric DEFAULT 50)
 RETURNS TABLE(id uuid, first_name text, last_name text, home_city text, home_lat numeric, home_lng numeric, languages text[], gender text, years_experience text, profile_photo_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT p.id, p.first_name, p.last_name, p.home_city, p.home_lat, p.home_lng,
         p.languages, p.gender, p.years_experience, p.profile_photo_url
  FROM public.psw_profiles p
  WHERE p.vetting_status = 'approved'
    AND p.home_lat IS NOT NULL
    AND p.home_lng IS NOT NULL
    -- VSC/Police check expiry: must have a valid (non-expired) police check
    -- Expired = police_check_date + 1 year < now()
    AND (
      p.police_check_date IS NULL  -- Allow if not yet set (legacy data)
      OR (p.police_check_date + INTERVAL '1 year') >= CURRENT_DATE
    )
    AND (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(p.home_lat)) *
        cos(radians(p.home_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(p.home_lat))
      )
    ) <= p_radius_km;
$$;

-- 3. Update payroll trigger to skip refunded/cancelled bookings
CREATE OR REPLACE FUNCTION public.handle_booking_payroll_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Only create payroll for completed, non-refunded, non-cancelled bookings
  IF NEW.status = 'completed' 
     AND NEW.psw_assigned IS NOT NULL 
     AND NEW.psw_assigned <> '' 
     AND COALESCE(NEW.was_refunded, false) = false
  THEN
    PERFORM public.upsert_payroll_entry_for_booking(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Update upsert_payroll_entry to also check refund status
CREATE OR REPLACE FUNCTION public.upsert_payroll_entry_for_booking(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  -- SKIP refunded or cancelled bookings
  IF b.status IS DISTINCT FROM 'completed' 
     OR b.psw_assigned IS NULL 
     OR b.psw_assigned = '' 
     OR COALESCE(b.was_refunded, false) = true
     OR b.status = 'cancelled'
  THEN
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

-- 5. Recreate the trigger (it may not exist as trigger yet per db-triggers showing none)
DROP TRIGGER IF EXISTS trg_sync_booking_to_payroll ON public.bookings;
CREATE TRIGGER trg_sync_booking_to_payroll
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_payroll_sync();
