
-- Explicit grants (RLS still enforced for authenticated; service_role bypasses RLS but grants make it explicit)
GRANT SELECT ON public.push_delivery_logs TO authenticated;
GRANT ALL ON public.push_delivery_logs TO service_role;
REVOKE ALL ON public.push_delivery_logs FROM anon;

-- Ensure service_role can INSERT even if RLS is somehow forced later
DROP POLICY IF EXISTS "Service role can insert push delivery logs" ON public.push_delivery_logs;
CREATE POLICY "Service role can insert push delivery logs"
  ON public.push_delivery_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 60-day retention cleanup
CREATE OR REPLACE FUNCTION public.cleanup_push_delivery_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.push_delivery_logs
   WHERE created_at < now() - INTERVAL '60 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_push_delivery_logs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_push_delivery_logs() TO service_role;

-- Schedule daily at 03:15 UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-push-delivery-logs') THEN
    PERFORM cron.unschedule('cleanup-push-delivery-logs');
  END IF;
  PERFORM cron.schedule(
    'cleanup-push-delivery-logs',
    '15 3 * * *',
    $cron$ SELECT public.cleanup_push_delivery_logs(); $cron$
  );
END $$;
