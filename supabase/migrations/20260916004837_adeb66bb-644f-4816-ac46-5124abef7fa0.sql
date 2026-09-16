CREATE OR REPLACE FUNCTION public.upsert_payroll_entry_for_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b public.bookings%ROWTYPE;
  v_province text;
  v_provider_type text;
  v_rate_cents integer;
  v_hourly_rate numeric;
  v_booked_hours numeric;
  v_clocked_hours numeric := NULL;
  v_variance numeric := NULL;
  v_total_owed numeric := 0;
  v_task_label text := 'Standard Home Care';
  v_effective_in timestamptz;
  v_effective_out timestamptz;
  v_adj record;
  v_existing record;
  v_tolerance numeric := 0.05;
  v_requires_review boolean := false;
  v_review_reason text := NULL;
  v_gross_cents integer := NULL;
  v_payable_minutes integer;
  v_scheduled_minutes integer;
  v_final_minutes integer;
  v_entry_id uuid;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF b.status IS DISTINCT FROM 'completed'
     OR b.psw_assigned IS NULL OR b.psw_assigned = ''
     OR COALESCE(b.was_refunded, false) = true
     OR COALESCE(b.is_test_data, false) = true
     OR b.checked_in_at IS NULL
     OR b.signed_out_at IS NULL
     OR COALESCE(b.care_sheet_status, '') NOT IN ('submitted','sent','delivered','completed') THEN
    RETURN;
  END IF;

  SELECT id, earning_status, payable_hours_override, requires_admin_review,
         reviewed_by_admin, reviewed_at, payroll_review_note, compensation_snapshot
    INTO v_existing
  FROM public.payroll_entries WHERE shift_id = b.id::text;

  IF v_existing.id IS NOT NULL AND v_existing.earning_status IN (
       'approved_for_manual_payment','paid_manually','disputed','voided') THEN
    RETURN;
  END IF;

  v_booked_hours := GREATEST(COALESCE(b.hours, 0), 0);
  v_scheduled_minutes := ROUND(v_booked_hours * 60)::int;

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
    IF v_variance < -v_tolerance THEN
      v_requires_review := true;
      v_review_reason := 'early_sign_out_requires_review';
    END IF;
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

  v_province := COALESCE(NULLIF(b.service_province,''), 'ON');
  SELECT lower(COALESCE(NULLIF(p.provider_type,''),'psw')) INTO v_provider_type
  FROM public.psw_profiles p WHERE p.id::text = b.psw_assigned LIMIT 1;
  v_provider_type := COALESCE(v_provider_type, 'psw');

  v_rate_cents := public.provider_rate_cents(v_province, v_provider_type);

  v_final_minutes := COALESCE(ROUND(v_existing.payable_hours_override * 60)::int, v_scheduled_minutes);
  v_payable_minutes := v_final_minutes;

  IF v_scheduled_minutes <= 0 THEN
    v_requires_review := true;
    v_review_reason := 'missing_requested_duration';
  END IF;

  IF v_rate_cents IS NULL THEN
    v_requires_review := true;
    v_review_reason := COALESCE(v_review_reason, 'rate_not_configured');
  END IF;

  IF v_rate_cents IS NOT NULL AND v_payable_minutes > 0 THEN
    v_gross_cents := ROUND((v_payable_minutes * v_rate_cents) / 60.0)::int;
    v_hourly_rate := v_rate_cents / 100.0;
    v_total_owed := ROUND((v_gross_cents::numeric) / 100.0, 2);
  ELSE
    v_gross_cents := NULL;
    v_hourly_rate := 0;
    v_total_owed := 0;
  END IF;

  IF v_existing.reviewed_at IS NOT NULL AND v_review_reason IS NULL THEN
    v_requires_review := false;
  END IF;

  INSERT INTO public.payroll_entries (
    shift_id, booking_id, psw_id, psw_name, task_name, scheduled_date,
    hours_worked, hourly_rate, surcharge_applied, total_owed,
    status, completed_at, earned_date,
    booked_hours, clocked_hours, variance_hours,
    payable_hours_override, requires_admin_review, earning_review_reason,
    expected_gross_cents, rate_source,
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
    ROUND((v_payable_minutes / 60.0)::numeric, 2), v_hourly_rate, 0, v_total_owed,
    'pending', COALESCE(b.signed_out_at, b.updated_at), b.scheduled_date,
    ROUND(v_booked_hours::numeric, 2), v_clocked_hours, v_variance,
    v_existing.payable_hours_override, v_requires_review, v_review_reason,
    v_gross_cents, 'provider_earning_rates',
    v_existing.reviewed_by_admin, v_existing.reviewed_at, v_existing.payroll_review_note,
    v_provider_type, v_province, 'CAD',
    v_scheduled_minutes, v_payable_minutes, v_rate_cents, v_gross_cents,
    'phase8-v1',
    jsonb_build_object(
      'provider_id', b.psw_assigned,
      'provider_type', v_provider_type,
      'booking_id', b.id,
      'visit_id', b.id::text,
      'service', v_task_label,
      'province', v_province,
      'currency', 'CAD',
      'requested_start', b.start_time,
      'requested_end', b.end_time,
      'scheduled_minutes', v_scheduled_minutes,
      'payable_minutes', v_payable_minutes,
      'rate_cents', v_rate_cents,
      'flat_rate_cents', 0,
      'premium_cents', 0,
      'adjustments_cents', 0,
      'gross_cents', v_gross_cents,
      'earning_rule_version', 'phase8-v1',
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
    earning_review_reason = EXCLUDED.earning_review_reason,
    expected_gross_cents = EXCLUDED.expected_gross_cents,
    rate_source = EXCLUDED.rate_source,
    rate_cents = EXCLUDED.rate_cents,
    gross_cents = EXCLUDED.gross_cents,
    payable_minutes = EXCLUDED.payable_minutes,
    scheduled_minutes = EXCLUDED.scheduled_minutes,
    earning_rule_version = EXCLUDED.earning_rule_version,
    -- Original compensation evidence is never rewritten.
    compensation_snapshot = COALESCE(public.payroll_entries.compensation_snapshot, EXCLUDED.compensation_snapshot),
    province = COALESCE(public.payroll_entries.province, EXCLUDED.province),
    provider_type = COALESCE(public.payroll_entries.provider_type, EXCLUDED.provider_type),
    updated_at = now()
  RETURNING id INTO v_entry_id;

  UPDATE public.provider_earning_snapshots
     SET superseded_at = now()
   WHERE booking_id = b.id AND superseded_at IS NULL
     AND (requested_minutes IS DISTINCT FROM v_payable_minutes
          OR rate_cents IS DISTINCT FROM v_rate_cents
          OR gross_cents IS DISTINCT FROM v_gross_cents);

  IF NOT EXISTS (
    SELECT 1 FROM public.provider_earning_snapshots
    WHERE booking_id = b.id AND superseded_at IS NULL
      AND requested_minutes IS NOT DISTINCT FROM v_payable_minutes
      AND rate_cents IS NOT DISTINCT FROM v_rate_cents
      AND gross_cents IS NOT DISTINCT FROM v_gross_cents
  ) THEN
    INSERT INTO public.provider_earning_snapshots (
      booking_id, payroll_entry_id, provider_id, provider_type, province,
      requested_start, requested_end, requested_minutes, rate_cents, gross_cents,
      rule_version, reason, created_by
    ) VALUES (
      b.id, v_entry_id, b.psw_assigned, v_provider_type, v_province,
      b.start_time, b.end_time, v_payable_minutes, v_rate_cents, v_gross_cents,
      'phase8-v1', COALESCE(v_review_reason, 'completed_visit'), 'system'
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_payroll_entry_for_booking(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_payroll_entry_for_booking(uuid) TO service_role;
