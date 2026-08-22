CREATE OR REPLACE FUNCTION public.admin_psw_readiness_summary()
RETURNS TABLE(reason text, psw_count integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH p AS (
    SELECT pp.id,
           pp.vetting_status,
           COALESCE(pp.lifecycle_status, 'active') AS lifecycle_status,
           pp.police_check_date,
           (pp.home_lat IS NOT NULL AND pp.home_lng IS NOT NULL) AS has_coords
    FROM public.psw_profiles pp
    WHERE COALESCE(pp.is_test, false) = false
  ),
  flagged AS (
    SELECT p.id,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN p.vetting_status IS DISTINCT FROM 'approved' THEN 'not_approved' END,
        CASE WHEN p.lifecycle_status <> 'active' THEN 'lifecycle_' || p.lifecycle_status END,
        CASE WHEN p.police_check_date IS NOT NULL
               AND (p.police_check_date + INTERVAL '1 year') < CURRENT_DATE
             THEN 'police_check_expired' END,
        CASE WHEN NOT p.has_coords THEN 'no_home_coordinates' END
      ], NULL) AS reasons
    FROM p
  ),
  expanded AS (
    SELECT 'alert_ready'::text AS reason, count(*)::int AS n
    FROM flagged WHERE COALESCE(array_length(reasons, 1), 0) = 0
    UNION ALL
    SELECT unnest(reasons)::text, 1
    FROM flagged WHERE COALESCE(array_length(reasons, 1), 0) > 0
  )
  SELECT expanded.reason, sum(expanded.n)::int
  FROM expanded
  GROUP BY expanded.reason
  ORDER BY 2 DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_psw_readiness_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_psw_readiness_summary() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_broadcast_health(p_limit integer DEFAULT 25)
RETURNS TABLE(
  booking_code text,
  dispatched_at timestamptz,
  targeted_count integer,
  channels text[],
  push_attempted integer,
  push_succeeded integer,
  push_failed integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT d.booking_code,
         d.created_at,
         COALESCE(array_length(d.matched_psw_emails, 1), 0)::int,
         COALESCE(d.channels_sent, ARRAY[]::text[]),
         COALESCE(pl.attempted, 0)::int,
         COALESCE(pl.succeeded, 0)::int,
         COALESCE(pl.failed, 0)::int
  FROM public.dispatch_logs d
  LEFT JOIN LATERAL (
    SELECT count(*) AS attempted,
           count(*) FILTER (WHERE p.success) AS succeeded,
           count(*) FILTER (WHERE NOT p.success) AS failed
    FROM public.push_delivery_logs p
    WHERE p.booking_code = d.booking_code
      AND p.created_at BETWEEN d.created_at - INTERVAL '5 minutes'
                           AND d.created_at + INTERVAL '15 minutes'
  ) pl ON true
  ORDER BY d.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_broadcast_health(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_health(integer) TO authenticated, service_role;