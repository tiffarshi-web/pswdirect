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
      UPDATE public.payroll_entries SET manually_paid_at = now() WHERE id = v_entry;
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