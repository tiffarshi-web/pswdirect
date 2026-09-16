
REVOKE ALL ON TABLE public.provider_earning_rates FROM anon;
REVOKE ALL ON TABLE public.payroll_entries FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_earning_rates TO authenticated;
GRANT ALL ON public.payroll_entries TO service_role;
GRANT ALL ON public.provider_earning_rates TO service_role;

CREATE OR REPLACE FUNCTION public.phase9_earnings_selftest()
RETURNS TABLE(test_name text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_num numeric;
  v_int integer;
  v_txt text;
  v_ok boolean;
  v_id uuid;
  v_key text;
BEGIN
  IF NOT (COALESCE(public.is_admin(), false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_num := public.resolve_provider_pay_rate('ON', 'psw');
  RETURN QUERY SELECT 'ontario_psw_rate_is_21', v_num = 21, COALESCE(v_num::text, 'NULL');

  v_num := public.resolve_psw_pay_rate(ARRAY['Doctor Visit: Doctor Escort']);
  RETURN QUERY SELECT 'doctor_escort_never_27', v_num = 21, COALESCE(v_num::text, 'NULL');
  v_num := public.resolve_psw_pay_rate(ARRAY['Hospital Visit: Hospital Discharge']);
  RETURN QUERY SELECT 'hospital_discharge_never_27', v_num = 21, COALESCE(v_num::text, 'NULL');

  RETURN QUERY SELECT 'rpn_pending_verification', public.provider_rate_cents('ON','rpn') IS NULL, 'rpn';
  RETURN QUERY SELECT 'alberta_hca_pending_verification', public.provider_rate_cents('AB','hca') IS NULL, 'hca';

  RETURN QUERY SELECT 'exact_calculation_60min', public.psw_pay_cents(60, 21) = 2100, '60min';
  RETURN QUERY SELECT 'partial_hour_rounding_90min', public.psw_pay_cents(90, 21) = 3150, '90min';
  RETURN QUERY SELECT 'partial_hour_rounding_25min', public.psw_pay_cents(25, 21) = 875, '25min';
  RETURN QUERY SELECT 'zero_minutes_no_amount', public.psw_pay_cents(0, 21) IS NULL, 'zero';

  -- Fail closed: no rate supplied means no amount, and no argument defaults exist
  RETURN QUERY SELECT 'missing_rate_fails_closed', public.psw_pay_cents(60, NULL) IS NULL, 'null rate';
  SELECT COUNT(*) INTO v_int
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'psw_pay_cents' AND p.pronargdefaults > 0;
  RETURN QUERY SELECT 'no_default_rate_overload', v_int = 0, v_int::text;

  SELECT COUNT(*) INTO v_int
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname NOT LIKE '%selftest%'
    AND (pg_get_functiondef(p.oid) ILIKE '%doctorVisit%'
      OR pg_get_functiondef(p.oid) ILIKE '%hospitalVisit%'
      OR pg_get_functiondef(p.oid) ILIKE '%2700%');
  RETURN QUERY SELECT 'no_live_27_fallback', v_int = 0, v_int::text;

  -- Authorization boundaries
  RETURN QUERY SELECT 'rate_table_not_public',
    NOT has_table_privilege('anon', 'public.provider_earning_rates', 'SELECT')
    AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                    AND tablename='provider_earning_rates' AND 'anon' = ANY(roles)),
    'provider_earning_rates';

  RETURN QUERY SELECT 'payroll_not_client_writable',
    NOT has_table_privilege('anon', 'public.payroll_entries', 'UPDATE')
    AND NOT has_table_privilege('anon', 'public.payroll_entries', 'INSERT')
    AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                    AND tablename='payroll_entries' AND 'anon' = ANY(roles)),
    'payroll_entries';

  RETURN QUERY SELECT 'caregiver_write_policies_admin_only',
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                AND tablename='payroll_entries' AND cmd IN ('INSERT','UPDATE','DELETE')
                AND COALESCE(qual,'') || COALESCE(with_check,'') NOT ILIKE '%admin%'),
    'payroll_entries';

  SELECT COUNT(*) INTO v_int FROM public.payroll_entries
  WHERE (gross_cents IS NOT NULL AND total_owed IS DISTINCT FROM ROUND(gross_cents / 100.0, 2))
     OR (rate_cents IS NOT NULL AND hourly_rate IS DISTINCT FROM ROUND(rate_cents / 100.0, 2));
  RETURN QUERY SELECT 'cents_dollars_consistent', v_int = 0, v_int::text;

  SELECT COUNT(*) INTO v_int FROM public.payroll_entries
  WHERE province = 'ON' AND provider_type = 'psw' AND rate_cents IS DISTINCT FROM 2100;
  RETURN QUERY SELECT 'no_live_payable_entry_at_27', v_int = 0, v_int::text;

  SELECT COUNT(*) INTO v_int FROM public.payroll_entries
  WHERE (compensation_snapshot ->> 'rate_cents') = '2700';
  RETURN QUERY SELECT 'superseded_originals_preserved', v_int >= 5, v_int::text;

  -- Real persistence test: paid entries cannot be mutated; dollars follow cents
  v_key := gen_random_uuid()::text;
  BEGIN
    INSERT INTO public.payroll_entries
      (shift_id, psw_id, psw_name, task_name, scheduled_date, hours_worked, hourly_rate,
       total_owed, status, province, provider_type, scheduled_minutes, payable_minutes,
       rate_cents, gross_cents)
    VALUES (v_key, gen_random_uuid()::text, 'Phase9 Selftest', 'Standard Home Care', CURRENT_DATE,
            1, 1, 1, 'pending', 'ON', 'psw', 60, 60, 2100, 2100)
    RETURNING id INTO v_id;

    SELECT (hourly_rate = 21 AND total_owed = 21) INTO v_ok
    FROM public.payroll_entries WHERE id = v_id;
    RETURN QUERY SELECT 'dollars_derived_from_cents', COALESCE(v_ok, false), 'insert';

    UPDATE public.payroll_entries SET manually_paid_at = now() WHERE id = v_id;
    BEGIN
      UPDATE public.payroll_entries SET gross_cents = 9999 WHERE id = v_id;
      v_ok := false; v_txt := 'paid entry was mutated';
    EXCEPTION WHEN OTHERS THEN
      v_ok := true; v_txt := SQLERRM;
    END;
    DELETE FROM public.payroll_entries WHERE id = v_id;
  EXCEPTION WHEN OTHERS THEN
    v_ok := false; v_txt := 'setup failed: ' || SQLERRM;
  END;
  RETURN QUERY SELECT 'paid_entry_immutable', v_ok, v_txt;

  SELECT COALESCE(SUM(entry_count), 0) INTO v_int
  FROM public.phase9_earnings_reconciliation(false)
  WHERE classification = 'applied_corrections';
  RETURN QUERY SELECT 'reconciliation_dry_run_no_changes', v_int = 0, v_int::text;

  SELECT COALESCE(SUM(entry_count), 0) INTO v_int
  FROM public.phase9_earnings_reconciliation(false)
  WHERE classification = 'correctable';
  RETURN QUERY SELECT 'no_correctable_entries_remaining', v_int = 0, v_int::text;

  SELECT COUNT(*) INTO v_int FROM public.provinces
  WHERE code = 'AB' AND (COALESCE(bookings_enabled,false) OR COALESCE(payments_enabled,false)
                         OR COALESCE(recruitment_enabled,false));
  RETURN QUERY SELECT 'alberta_disabled', v_int = 0, v_int::text;

  RETURN QUERY SELECT 'automatic_payouts_disabled',
    COALESCE(public.automatic_provider_payouts_enabled(), false) = false, 'flag';
END;
$function$;

REVOKE ALL ON FUNCTION public.phase9_earnings_selftest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.phase9_earnings_selftest() TO service_role;
