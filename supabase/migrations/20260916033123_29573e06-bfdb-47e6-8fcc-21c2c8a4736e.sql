
CREATE OR REPLACE FUNCTION public.phase9_earnings_classified()
RETURNS TABLE(id uuid, cls text, approved_rate integer, expected_cents integer, minutes integer,
              rate_cents integer, gross_cents integer, total_owed numeric, hourly_rate numeric,
              province text, provider_type text, compensation_snapshot jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT p.id,
           p.rate_cents, p.gross_cents, p.total_owed, p.hourly_rate,
           p.province, p.provider_type, p.earning_status, p.compensation_snapshot,
           COALESCE(p.payable_minutes, p.scheduled_minutes) AS minutes,
           public.payroll_entry_is_paid(p.*) AS is_paid,
           public.provider_rate_cents(COALESCE(p.province,'ON'), COALESCE(p.provider_type,'psw')) AS approved_rate
    FROM public.payroll_entries p
  ), calc AS (
    SELECT b.*, CASE WHEN b.approved_rate IS NULL OR b.minutes IS NULL THEN NULL
                     ELSE ROUND(b.minutes::numeric * b.approved_rate::numeric / 60.0)::int END AS expected_cents
    FROM base b
  )
  SELECT c.id,
         CASE
           WHEN c.is_paid THEN 'paid'
           WHEN c.earning_status IN ('approved_for_manual_payment','paid_manually','voided') THEN 'finalized'
           WHEN c.approved_rate IS NULL OR c.minutes IS NULL OR c.province IS NULL OR c.provider_type IS NULL
             THEN 'pending_verification'
           WHEN c.rate_cents = c.approved_rate
            AND c.gross_cents = c.expected_cents
            AND c.total_owed = ROUND(c.gross_cents / 100.0, 2)
            AND c.hourly_rate = ROUND(c.rate_cents / 100.0, 2)
             THEN 'verified'
           ELSE 'correctable' END,
         c.approved_rate, c.expected_cents, c.minutes,
         c.rate_cents, c.gross_cents, c.total_owed, c.hourly_rate,
         c.province, c.provider_type, c.compensation_snapshot
  FROM calc c;
$function$;

REVOKE ALL ON FUNCTION public.phase9_earnings_classified() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.phase9_earnings_classified() TO service_role;

CREATE OR REPLACE FUNCTION public.phase9_earnings_reconciliation(p_apply boolean DEFAULT false)
RETURNS TABLE(classification text, entry_count integer, entry_ids uuid[], action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_corrected uuid[] := ARRAY[]::uuid[];
  r record;
  v_old jsonb;
BEGIN
  IF NOT (COALESCE(public.is_admin(), false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_apply THEN
    FOR r IN SELECT * FROM public.phase9_earnings_classified() WHERE cls = 'correctable' LOOP
      v_old := jsonb_build_object(
        'superseded_at', now(),
        'reason', 'phase9_reconciliation',
        'rate_cents', r.rate_cents,
        'gross_cents', r.gross_cents,
        'total_owed', r.total_owed,
        'hourly_rate', r.hourly_rate,
        'payable_minutes', r.minutes,
        'province', r.province,
        'provider_type', r.provider_type);

      UPDATE public.payroll_entries pe
         SET rate_cents = r.approved_rate,
             gross_cents = r.expected_cents,
             rate_source = 'provider_earning_rates',
             earning_rule_version = 'phase9-v1',
             compensation_snapshot = jsonb_set(
               COALESCE(pe.compensation_snapshot, '{}'::jsonb),
               '{superseded_history}',
               COALESCE(pe.compensation_snapshot -> 'superseded_history', '[]'::jsonb) || v_old,
               true),
             updated_at = now()
       WHERE pe.id = r.id
         AND NOT public.payroll_entry_is_paid(pe.*);

      v_corrected := v_corrected || r.id;
    END LOOP;
  END IF;

  RETURN QUERY
  SELECT t.cls, COUNT(*)::int, ARRAY_AGG(t.id ORDER BY t.id),
         CASE WHEN t.cls = 'correctable' AND NOT p_apply THEN 'dry_run_only' ELSE 'no_change' END
  FROM public.phase9_earnings_classified() t
  GROUP BY t.cls
  UNION ALL
  SELECT 'historical_superseded', COUNT(*)::int, ARRAY_AGG(t.id ORDER BY t.id), 'preserved'
  FROM public.phase9_earnings_classified() t
  WHERE (t.compensation_snapshot ? 'superseded_history')
     OR ((t.compensation_snapshot ->> 'rate_cents') IS NOT NULL
         AND (t.compensation_snapshot ->> 'rate_cents')::int IS DISTINCT FROM t.rate_cents)
  UNION ALL
  SELECT 'applied_corrections', COALESCE(array_length(v_corrected, 1), 0), v_corrected,
         CASE WHEN p_apply THEN 'applied' ELSE 'dry_run' END;
END;
$function$;

REVOKE ALL ON FUNCTION public.phase9_earnings_reconciliation(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.phase9_earnings_reconciliation(boolean) TO service_role;
