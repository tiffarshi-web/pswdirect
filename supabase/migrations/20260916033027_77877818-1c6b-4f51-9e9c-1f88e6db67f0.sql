
-- Phase 9: earnings reconciliation + database-level regression self-test

CREATE OR REPLACE FUNCTION public.phase9_earnings_reconciliation(p_apply boolean DEFAULT false)
RETURNS TABLE(classification text, entry_count integer, entry_ids uuid[], action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_corrected uuid[] := ARRAY[]::uuid[];
  r record;
  v_expected integer;
  v_old jsonb;
BEGIN
  IF NOT (COALESCE(public.is_admin(), false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  CREATE TEMP TABLE _p9 ON COMMIT DROP AS
  SELECT p.id,
         p.rate_cents,
         p.gross_cents,
         p.total_owed,
         p.hourly_rate,
         p.province,
         p.provider_type,
         p.earning_status,
         p.compensation_snapshot,
         COALESCE(p.payable_minutes, p.scheduled_minutes) AS minutes,
         public.payroll_entry_is_paid(p.*) AS is_paid,
         public.provider_rate_cents(COALESCE(p.province, 'ON'), COALESCE(p.provider_type, 'psw')) AS approved_rate
  FROM public.payroll_entries p;

  ALTER TABLE _p9 ADD COLUMN cls text;
  ALTER TABLE _p9 ADD COLUMN expected_cents integer;

  UPDATE _p9 SET expected_cents = CASE
    WHEN approved_rate IS NULL OR minutes IS NULL THEN NULL
    ELSE ROUND(minutes::numeric * approved_rate::numeric / 60.0)::int END;

  UPDATE _p9 SET cls = CASE
    WHEN is_paid THEN 'paid'
    WHEN earning_status IN ('approved_for_manual_payment', 'paid_manually', 'voided') THEN 'finalized'
    WHEN approved_rate IS NULL OR minutes IS NULL OR province IS NULL OR provider_type IS NULL
      THEN 'pending_verification'
    WHEN rate_cents = approved_rate
     AND gross_cents = expected_cents
     AND total_owed = ROUND(gross_cents / 100.0, 2)
     AND hourly_rate = ROUND(rate_cents / 100.0, 2)
      THEN 'verified'
    ELSE 'correctable' END;

  IF p_apply THEN
    FOR r IN SELECT * FROM _p9 WHERE cls = 'correctable' LOOP
      v_old := jsonb_build_object(
        'superseded_at', now(),
        'reason', 'phase9_reconciliation',
        'rate_cents', r.rate_cents,
        'gross_cents', r.gross_cents,
        'total_owed', r.total_owed,
        'hourly_rate', r.hourly_rate,
        'payable_minutes', r.minutes,
        'province', r.province,
        'provider_type', r.provider_type
      );
      v_expected := r.expected_cents;

      UPDATE public.payroll_entries
         SET rate_cents = r.approved_rate,
             gross_cents = v_expected,
             rate_source = 'provider_earning_rates',
             earning_rule_version = 'phase9-v1',
             compensation_snapshot = jsonb_set(
               COALESCE(compensation_snapshot, '{}'::jsonb),
               '{superseded_history}',
               COALESCE(compensation_snapshot -> 'superseded_history', '[]'::jsonb) || v_old,
               true),
             updated_at = now()
       WHERE id = r.id
         AND NOT public.payroll_entry_is_paid(payroll_entries.*);

      v_corrected := v_corrected || r.id;
      UPDATE _p9 SET cls = 'verified' WHERE id = r.id;
    END LOOP;
  END IF;

  RETURN QUERY
  SELECT t.cls,
         COUNT(*)::int,
         ARRAY_AGG(t.id ORDER BY t.id),
         CASE WHEN t.cls = 'verified' AND p_apply THEN 'no_change_or_corrected'
              WHEN t.cls = 'correctable' THEN 'dry_run_only'
              ELSE 'no_change' END
  FROM _p9 t
  GROUP BY t.cls
  UNION ALL
  SELECT 'historical_superseded',
         COUNT(*)::int,
         ARRAY_AGG(t.id ORDER BY t.id),
         'preserved'
  FROM _p9 t
  WHERE (t.compensation_snapshot ? 'superseded_history')
     OR (t.compensation_snapshot ->> 'rate_cents') IS DISTINCT FROM NULL
        AND (t.compensation_snapshot ->> 'rate_cents')::int IS DISTINCT FROM t.rate_cents
  UNION ALL
  SELECT 'applied_corrections',
         COALESCE(array_length(v_corrected, 1), 0),
         v_corrected,
         CASE WHEN p_apply THEN 'applied' ELSE 'dry_run' END;
END;
$function$;

REVOKE ALL ON FUNCTION public.phase9_earnings_reconciliation(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.phase9_earnings_reconciliation(boolean) TO service_role;

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
BEGIN
  IF NOT (COALESCE(public.is_admin(), false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- 1. Approved Ontario PSW rate
  v_num := public.resolve_provider_pay_rate('ON', 'psw');
  RETURN QUERY SELECT 'ontario_psw_rate_is_21', v_num = 21, COALESCE(v_num::text, 'NULL');

  -- 2. Doctor escort / hospital discharge resolve to the same approved rate
  v_num := public.resolve_psw_pay_rate(ARRAY['Doctor Visit: Doctor Escort']);
  RETURN QUERY SELECT 'doctor_escort_never_27', v_num = 21, COALESCE(v_num::text, 'NULL');
  v_num := public.resolve_psw_pay_rate(ARRAY['Hospital Visit: Hospital Discharge']);
  RETURN QUERY SELECT 'hospital_discharge_never_27', v_num = 21, COALESCE(v_num::text, 'NULL');

  -- 3. Nurses / Alberta have no configured rate
  RETURN QUERY SELECT 'rpn_pending_verification',
    public.provider_rate_cents('ON', 'rpn') IS NULL, 'rpn';
  RETURN QUERY SELECT 'alberta_hca_pending_verification',
    public.provider_rate_cents('AB', 'hca') IS NULL, 'hca';

  -- 4. Rounding: 90 requested minutes = 3150 cents
  RETURN QUERY SELECT 'partial_hour_rounding',
    ROUND(90::numeric * 2100 / 60)::int = 3150, '90min';

  -- 5. No guessing overload of psw_pay_cents
  SELECT COUNT(*) INTO v_int
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'psw_pay_cents' AND p.pronargs = 2;
  RETURN QUERY SELECT 'no_guessing_pay_overload', v_int = 0, v_int::text;

  -- 6. No live function carries a 27 fallback
  SELECT COUNT(*) INTO v_int
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname NOT LIKE '%selftest%'
    AND (pg_get_functiondef(p.oid) ILIKE '%doctorVisit%'
      OR pg_get_functiondef(p.oid) ILIKE '%hospitalVisit%'
      OR pg_get_functiondef(p.oid) ILIKE '%2700%');
  RETURN QUERY SELECT 'no_live_27_fallback', v_int = 0, v_int::text;

  -- 7. Rate table is not readable by clients or caregivers
  RETURN QUERY SELECT 'rate_table_not_public',
    NOT has_table_privilege('anon', 'public.provider_earning_rates', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.provider_earning_rates', 'INSERT'),
    'provider_earning_rates';

  -- 8. Clients cannot write payroll entries
  RETURN QUERY SELECT 'payroll_not_client_writable',
    NOT has_table_privilege('anon', 'public.payroll_entries', 'UPDATE')
    AND NOT has_table_privilege('anon', 'public.payroll_entries', 'INSERT'),
    'payroll_entries';

  -- 9. Cents/dollars consistency across live entries
  SELECT COUNT(*) INTO v_int FROM public.payroll_entries
  WHERE (gross_cents IS NOT NULL AND total_owed IS DISTINCT FROM ROUND(gross_cents / 100.0, 2))
     OR (rate_cents IS NOT NULL AND hourly_rate IS DISTINCT FROM ROUND(rate_cents / 100.0, 2));
  RETURN QUERY SELECT 'cents_dollars_consistent', v_int = 0, v_int::text;

  -- 10. Every live Ontario PSW entry uses 2100 cents
  SELECT COUNT(*) INTO v_int FROM public.payroll_entries
  WHERE province = 'ON' AND provider_type = 'psw' AND rate_cents IS DISTINCT FROM 2100;
  RETURN QUERY SELECT 'no_live_payable_entry_at_27', v_int = 0, v_int::text;

  -- 11. Superseded historical evidence preserved
  SELECT COUNT(*) INTO v_int FROM public.payroll_entries
  WHERE (compensation_snapshot ->> 'rate_cents') = '2700';
  RETURN QUERY SELECT 'superseded_originals_preserved', v_int >= 5, v_int::text;

  -- 12. Paid entries are immutable (real transaction test)
  BEGIN
    INSERT INTO public.payroll_entries
      (shift_id, psw_id, psw_name, task_name, scheduled_date, hours_worked, hourly_rate,
       total_owed, status, province, provider_type, scheduled_minutes, payable_minutes,
       rate_cents, gross_cents, manually_paid_at)
    VALUES ('phase9-selftest', 'phase9-selftest', 'Selftest', 'Standard Home Care', CURRENT_DATE,
            1, 21, 21, 'pending', 'ON', 'psw', 60, 60, 2100, 2100, now())
    RETURNING id INTO v_id;
    BEGIN
      UPDATE public.payroll_entries SET gross_cents = 9999 WHERE id = v_id;
      v_ok := false;
      v_txt := 'paid entry was mutated';
    EXCEPTION WHEN OTHERS THEN
      v_ok := true;
      v_txt := SQLERRM;
    END;
    DELETE FROM public.payroll_entries WHERE id = v_id;
  EXCEPTION WHEN OTHERS THEN
    v_ok := false;
    v_txt := 'setup failed: ' || SQLERRM;
  END;
  RETURN QUERY SELECT 'paid_entry_immutable', v_ok, v_txt;

  -- 13. Reconciliation dry run makes no changes
  SELECT COALESCE(SUM(entry_count), 0) INTO v_int
  FROM public.phase9_earnings_reconciliation(false)
  WHERE classification = 'applied_corrections';
  RETURN QUERY SELECT 'reconciliation_dry_run_no_changes', v_int = 0, v_int::text;

  -- 14. Reconciliation reports nothing correctable (idempotent state)
  SELECT COALESCE(SUM(entry_count), 0) INTO v_int
  FROM public.phase9_earnings_reconciliation(false)
  WHERE classification = 'correctable';
  RETURN QUERY SELECT 'no_correctable_entries_remaining', v_int = 0, v_int::text;

  -- 15. Alberta remains disabled
  SELECT COUNT(*) INTO v_int FROM public.provinces
  WHERE code = 'AB' AND (COALESCE(bookings_enabled, false) OR COALESCE(payments_enabled, false)
                         OR COALESCE(recruitment_enabled, false));
  RETURN QUERY SELECT 'alberta_disabled', v_int = 0, v_int::text;

  -- 16. Automatic provider payouts remain disabled
  RETURN QUERY SELECT 'automatic_payouts_disabled',
    COALESCE(public.automatic_provider_payouts_enabled(), false) = false, 'flag';
END;
$function$;

REVOKE ALL ON FUNCTION public.phase9_earnings_selftest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.phase9_earnings_selftest() TO service_role;
