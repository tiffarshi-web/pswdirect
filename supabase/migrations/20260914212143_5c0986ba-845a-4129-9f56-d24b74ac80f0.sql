CREATE OR REPLACE FUNCTION public.upsert_payroll_entry_for_booking(p_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
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
  v_rate_cents integer;
  v_gross_cents integer;
  v_payable_minutes integer;
  v_scheduled_minutes integer;
  v_entry_id uuid;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Valid completed visit only. No earning for test data, refunds, cancellations,
  -- unassigned visits, missing attendance or an unsubmitted care sheet.
  IF b.status IS DISTINCT FROM 'completed'
     OR b.psw_assigned IS NULL OR b.psw_assigned = ''
     OR COALESCE(b.was_refunded, false) = true
     OR COALESCE(b.is_test_data, false) = true
     OR b.checked_in_at IS NULL
     OR b.signed_out_at IS NULL
     OR COALESCE(b.care_sheet_status, '') NOT IN ('submitted','sent','delivered','completed') THEN
    RETURN;
  END IF;

  -- Never overwrite an office decision.
  SELECT id, earning_status, payable_hours_override, requires_admin_review,
         reviewed_by_admin, reviewed_at, payroll_review_note, compensation_snapshot
    INTO v_existing
  FROM public.payroll_entries WHERE shift_id = b.id::text;

  IF v_existing.id IS NOT NULL AND v_existing.earning_status IN (
       'approved_for_manual_payment','paid_manually','disputed','voided') THEN
    RETURN;
  END IF;

  v_booked_hours := GREATEST(COALESCE(b.hours, 0), 0);

  SELECT adjusted_clock_in::timestamptz, adjusted_clock_out::timestamptz
  INTO v_adj
  FROM public.shift_time_adjustments
  WHERE booking_id = p_booking_id
  ORDER BY adjusted_at DESC LIMIT 1;

  v_effective_in := COALESCE(v_adj.adjusted_clock_in, b.checked_in_at);
  v_effective_out := COALESCE(v_adj.adjusted_clock_out, b.signed_out_at);

  IF v_effective_in IS NOT NULL AND v_effective_out IS NOT NULL AND v_effective_out > v_effective_in THEN
    v_clocked_hours := ROUND((EXTRACT(EPOCH FROM (v_effective_out - v_effective_in)) / 3600.0)::numeric, 2);
    v_variance := ROUND((v_clocked_hours - v_booked_hours)::numeric, 2);
    IF ABS(v_variance) > v_tolerance THEN v_requires_review := true; END IF;
  END IF;

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

  -- Provider rate is NEVER derived from the client price.
  IF b.psw_pay_rate IS NOT NULL AND b.psw_pay_rate > 0 THEN
    v_hourly_rate := b.psw_pay_rate;
  ELSE
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
      ELSE v_standard END;
    UPDATE public.bookings SET psw_pay_rate = v_hourly_rate WHERE id = b.id;
  END IF;

  v_final_hours := COALESCE(v_existing.payable_hours_override, v_booked_hours);
  v_rate_cents := ROUND(v_hourly_rate * 100)::int;
  v_payable_minutes := ROUND(v_final_hours * 60)::int;
  v_scheduled_minutes := ROUND(v_booked_hours * 60)::int;
  v_gross_cents := ROUND((v_payable_minutes * v_rate_cents) / 60.0)::int;
  v_total_owed := ROUND((v_gross_cents::numeric) / 100.0, 2);

  IF v_existing.reviewed_at IS NOT NULL OR v_existing.payable_hours_override IS NOT NULL THEN
    v_requires_review := false;
  END IF;

  INSERT INTO public.payroll_entries (
    shift_id, booking_id, psw_id, psw_name, task_name, scheduled_date,
    hours_worked, hourly_rate, surcharge_applied, total_owed,
    status, completed_at, earned_date,
    booked_hours, clocked_hours, variance_hours,
    payable_hours_override, requires_admin_review,
    reviewed_by_admin, reviewed_at, payroll_review_note,
    provider_type, province, currency,
    scheduled_minutes, payable_minutes, rate_cents, gross_cents,
    earning_rule_version, compensation_snapshot
  ) VALUES (
    b.id::text, b.id, b.psw_assigned, COALESCE(NULLIF(b.psw_first_name,''),'Unknown PSW'),
    CASE WHEN COALESCE(array_length(b.service_type,1),0) > 0
         THEN v_task_label || ': ' || array_to_string(b.service_type,', ')
         ELSE v_task_label END,
    b.scheduled_date,
    ROUND(v_final_hours::numeric, 2), v_hourly_rate, 0, v_total_owed,
    'pending', COALESCE(b.signed_out_at, b.updated_at), b.scheduled_date,
    ROUND(v_booked_hours::numeric, 2), v_clocked_hours, v_variance,
    v_existing.payable_hours_override, v_requires_review,
    v_existing.reviewed_by_admin, v_existing.reviewed_at, v_existing.payroll_review_note,
    'psw', COALESCE(b.service_province, 'ON'), 'CAD',
    v_scheduled_minutes, v_payable_minutes, v_rate_cents, v_gross_cents,
    'phase5-v1',
    jsonb_build_object(
      'provider_id', b.psw_assigned,
      'provider_type', 'psw',
      'booking_id', b.id,
      'visit_id', b.id::text,
      'service', v_task_label,
      'province', COALESCE(b.service_province, 'ON'),
      'currency', 'CAD',
      'scheduled_minutes', v_scheduled_minutes,
      'payable_minutes', v_payable_minutes,
      'rate_cents', v_rate_cents,
      'flat_rate_cents', 0,
      'premium_cents', 0,
      'adjustments_cents', 0,
      'gross_cents', v_gross_cents,
      'earning_rule_version', 'phase5-v1',
      'created_at', now()
    )
  )
  ON CONFLICT (shift_id) DO UPDATE SET
    booking_id = EXCLUDED.booking_id,
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
    rate_cents = EXCLUDED.rate_cents,
    gross_cents = EXCLUDED.gross_cents,
    payable_minutes = EXCLUDED.payable_minutes,
    scheduled_minutes = EXCLUDED.scheduled_minutes,
    province = COALESCE(public.payroll_entries.province, EXCLUDED.province),
    provider_type = COALESCE(public.payroll_entries.provider_type, EXCLUDED.provider_type),
    updated_at = now()
  RETURNING id INTO v_entry_id;
END;
$function$;