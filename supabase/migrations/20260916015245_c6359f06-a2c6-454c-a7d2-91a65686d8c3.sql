CREATE OR REPLACE FUNCTION public.payroll_entry_is_paid(e public.payroll_entries)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT e.status IN ('cleared','payout_ready')
      OR e.cleared_at IS NOT NULL
      OR e.manually_paid_at IS NOT NULL
      OR e.manual_payout_id IS NOT NULL
      OR e.earning_status = 'paid_manually';
$$;

CREATE OR REPLACE FUNCTION public.enforce_payroll_amount_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND public.payroll_entry_is_paid(OLD) THEN
    IF NEW.gross_cents IS DISTINCT FROM OLD.gross_cents
       OR NEW.total_owed IS DISTINCT FROM OLD.total_owed
       OR NEW.rate_cents IS DISTINCT FROM OLD.rate_cents
       OR NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate
       OR NEW.payable_minutes IS DISTINCT FROM OLD.payable_minutes
       OR NEW.payable_hours_override IS DISTINCT FROM OLD.payable_hours_override THEN
      RAISE EXCEPTION 'paid_entry_immutable';
    END IF;
  END IF;

  IF NEW.rate_cents IS NOT NULL AND NEW.rate_cents > 0 THEN
    NEW.hourly_rate := round(NEW.rate_cents / 100.0, 2);
  END IF;

  IF NEW.gross_cents IS NOT NULL THEN
    NEW.total_owed := round(NEW.gross_cents / 100.0, 2);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_payable_hours(
  p_entry_id uuid, p_override_hours numeric, p_note text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry public.payroll_entries%ROWTYPE;
  v_admin text;
  v_final numeric;
  v_minutes int;
  v_rate_cents int;
  v_gross int;
  v_needs_billing boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF p_note IS NULL OR btrim(p_note) = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  SELECT * INTO v_entry FROM public.payroll_entries WHERE id = p_entry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'entry_not_found'; END IF;
  IF public.payroll_entry_is_paid(v_entry) THEN
    RAISE EXCEPTION 'paid_entry_immutable';
  END IF;

  v_rate_cents := COALESCE(v_entry.rate_cents, round(v_entry.hourly_rate * 100)::int);
  IF v_rate_cents IS NULL OR v_rate_cents <= 0 THEN
    RAISE EXCEPTION 'rate_pending_verification';
  END IF;

  v_final   := COALESCE(p_override_hours, COALESCE(v_entry.booked_hours, 0));
  v_minutes := round(GREATEST(v_final, 0) * 60)::int;
  v_gross   := round(v_minutes * v_rate_cents / 60.0)::int;
  v_needs_billing := (v_final - COALESCE(v_entry.booked_hours, 0)) > 0.05;

  UPDATE public.provider_earning_snapshots
  SET superseded_at = now()
  WHERE payroll_entry_id = p_entry_id AND superseded_at IS NULL;

  INSERT INTO public.provider_earning_snapshots (
    booking_id, payroll_entry_id, provider_id, provider_type, province,
    requested_minutes, rate_cents, gross_cents, rule_version, reason, created_by
  )
  VALUES (
    v_entry.booking_id, p_entry_id, v_entry.psw_id,
    COALESCE(v_entry.provider_type, 'psw'), COALESCE(v_entry.province, 'ON'),
    v_minutes, v_rate_cents, v_gross, 'phase8-payable-correction-v1',
    btrim(p_note), v_admin
  );

  UPDATE public.payroll_entries
  SET payable_hours_override = p_override_hours,
      hours_worked = v_final,
      payable_minutes = v_minutes,
      gross_cents = v_gross,
      total_owed = round(v_gross / 100.0, 2),
      requires_admin_review = false,
      reviewed_by_admin = v_admin,
      reviewed_at = now(),
      payroll_review_note = btrim(p_note),
      billing_adjustment_required = v_needs_billing,
      billing_adjustment_handled_at = CASE WHEN v_needs_billing THEN NULL ELSE billing_adjustment_handled_at END,
      billing_adjustment_handled_by = CASE WHEN v_needs_billing THEN NULL ELSE billing_adjustment_handled_by END,
      updated_at = now()
  WHERE id = p_entry_id;
END;
$$;

-- Self-test T11 now uses the real paid markers
CREATE OR REPLACE FUNCTION public.phase8_earnings_selftest()
RETURNS TABLE(test_name text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pass boolean;
  v_detail text;
  v_num numeric;
  v_int int;
  v_booking uuid;
  v_entry uuid;
BEGIN
  v_num := public.resolve_psw_pay_rate(ARRAY['Doctor Escort']);
  RETURN QUERY SELECT 'doctor_escort_uses_approved_rate',
    (v_num = public.resolve_provider_pay_rate('ON','psw') AND v_num <> 27), 'rate=' || COALESCE(v_num::text,'NULL');

  v_num := public.resolve_psw_pay_rate(ARRAY['Hospital Discharge']);
  RETURN QUERY SELECT 'hospital_discharge_uses_approved_rate',
    (v_num = public.resolve_provider_pay_rate('ON','psw') AND v_num <> 27), 'rate=' || COALESCE(v_num::text,'NULL');

  v_num := public.resolve_provider_pay_rate('ON','psw');
  RETURN QUERY SELECT 'ontario_psw_rate_is_21', (v_num = 21), 'rate=' || COALESCE(v_num::text,'NULL');

  RETURN QUERY SELECT 'nurses_and_alberta_pending',
    (public.resolve_provider_pay_rate('ON','rpn') IS NULL
     AND public.resolve_provider_pay_rate('ON','rn') IS NULL
     AND public.resolve_provider_pay_rate('AB','hca') IS NULL
     AND public.resolve_provider_pay_rate('AB','lpn') IS NULL
     AND public.resolve_provider_pay_rate('AB','rn') IS NULL), 'all null';

  RETURN QUERY SELECT 'legacy_psw_pay_cents_overload_removed',
    NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname='public' AND p.proname='psw_pay_cents'
                  AND pg_get_function_identity_arguments(p.oid)='numeric, numeric'),
    'checked pg_proc';

  RETURN QUERY SELECT 'no_rate_no_amount',
    (public.psw_pay_cents(60, NULL) IS NULL AND public.psw_pay_cents(0, 21) IS NULL
     AND public.psw_pay_cents(60, 0) IS NULL), 'null-safe';

  RETURN QUERY SELECT 'rounding_partial_hours',
    (public.psw_pay_cents(30,21)=1050 AND public.psw_pay_cents(45,21)=1575
     AND public.psw_pay_cents(25,21)=875 AND public.psw_pay_cents(7,21)=245
     AND public.psw_pay_cents(1,21)=35 AND public.psw_pay_cents(1440,21)=50400),
    '30/45/25/7/1/1440 minute cases';

  v_pass := false; v_detail := '';
  BEGIN
    UPDATE public.provider_earning_rates SET is_active=false WHERE province='ON' AND provider_type='psw';
    v_pass := public.resolve_psw_pay_rate(ARRAY['Doctor Escort']) IS NULL;
    v_detail := 'resolver returned NULL when no active rate';
    RAISE EXCEPTION 'selftest_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'selftest_rollback' THEN v_pass := false; v_detail := SQLERRM; END IF;
  END;
  RETURN QUERY SELECT 'missing_rate_fails_closed', v_pass, v_detail;

  v_pass := false; v_detail := '';
  SELECT id INTO v_booking FROM public.bookings ORDER BY created_at DESC LIMIT 1;
  IF v_booking IS NOT NULL THEN
    BEGIN
      UPDATE public.bookings SET psw_pay_rate = 27 WHERE id = v_booking;
      SELECT psw_pay_rate INTO v_num FROM public.bookings WHERE id = v_booking;
      v_pass := (v_num = 21);
      v_detail := 'trigger produced ' || COALESCE(v_num::text,'NULL');
      RAISE EXCEPTION 'selftest_rollback';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'selftest_rollback' THEN v_pass := false; v_detail := SQLERRM; END IF;
    END;
  ELSE
    v_detail := 'no bookings available';
  END IF;
  RETURN QUERY SELECT 'booking_trigger_rejects_27', v_pass, v_detail;

  v_pass := false; v_detail := '';
  SELECT id INTO v_entry FROM public.payroll_entries WHERE status = 'pending' LIMIT 1;
  IF v_entry IS NOT NULL THEN
    BEGIN
      UPDATE public.payroll_entries SET total_owed = 999.99 WHERE id = v_entry;
      SELECT gross_cents, round(total_owed*100)::int INTO v_int, v_num
      FROM public.payroll_entries WHERE id = v_entry;
      v_pass := (v_int = v_num::int);
      v_detail := 'gross_cents=' || v_int || ' total_owed_cents=' || v_num;
      RAISE EXCEPTION 'selftest_rollback';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'selftest_rollback' THEN v_pass := false; v_detail := SQLERRM; END IF;
    END;
  END IF;
  RETURN QUERY SELECT 'dollars_cents_cannot_diverge', v_pass, v_detail;

  v_pass := false; v_detail := '';
  IF v_entry IS NOT NULL THEN
    BEGIN
      UPDATE public.payroll_entries
      SET manually_paid_at = now(), earning_status = 'paid_manually'
      WHERE id = v_entry;
      BEGIN
        UPDATE public.payroll_entries SET gross_cents = 1 WHERE id = v_entry;
        v_pass := false; v_detail := 'paid entry was modified';
      EXCEPTION WHEN OTHERS THEN
        v_pass := (SQLERRM LIKE '%paid_entry_immutable%');
        v_detail := SQLERRM;
      END;
      RAISE EXCEPTION 'selftest_rollback';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'selftest_rollback' THEN v_detail := SQLERRM; END IF;
    END;
  END IF;
  RETURN QUERY SELECT 'paid_entries_immutable', v_pass, v_detail;

  v_pass := false; v_detail := '';
  BEGIN
    PERFORM public.admin_set_payable_hours(v_entry, 2, NULL);
    v_detail := 'accepted without reason';
  EXCEPTION WHEN OTHERS THEN
    v_pass := (SQLERRM LIKE '%reason_required%' OR SQLERRM LIKE '%not_authorized%');
    v_detail := SQLERRM;
  END;
  RETURN QUERY SELECT 'payable_hours_requires_reason', v_pass, v_detail;

  v_pass := false; v_detail := '';
  BEGIN
    PERFORM public.admin_set_psw_pay_rate(v_booking, 27, 'selftest');
    v_detail := 'accepted arbitrary rate';
  EXCEPTION WHEN OTHERS THEN
    v_pass := (SQLERRM LIKE '%rate_not_approved%' OR SQLERRM LIKE '%not_authorized%');
    v_detail := SQLERRM;
  END;
  RETURN QUERY SELECT 'arbitrary_rate_override_rejected', v_pass, v_detail;

  RETURN QUERY SELECT 'rate_table_admin_only',
    NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='provider_earning_rates'
        AND cmd IN ('SELECT','ALL') AND COALESCE(qual,'') = 'true'
    ), 'no open select policy';

  RETURN QUERY SELECT 'alberta_remains_disabled',
    EXISTS (SELECT 1 FROM public.provinces WHERE code='AB'
            AND bookings_enabled=false AND payments_enabled=false AND recruitment_enabled=false),
    'AB switches off';
  RETURN QUERY SELECT 'alberta_checklist_incomplete_14',
    ((SELECT count(*) FROM public.province_activation_checklist WHERE province_code='AB')=14
     AND NOT EXISTS (SELECT 1 FROM public.province_activation_checklist
                     WHERE province_code='AB' AND is_complete=true)),
    '14 incomplete items';
END;
$$;

REVOKE ALL ON FUNCTION public.phase8_earnings_selftest() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.phase8_earnings_selftest() TO authenticated, service_role;