-- Phase 6: notification hardening
CREATE OR REPLACE FUNCTION public.mask_email(_email text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _email IS NULL OR position('@' in _email) = 0 THEN NULL
    ELSE left(split_part(_email, '@', 1), 2) || '***@' ||
         left(split_part(_email, '@', 2), 1) || '***.' ||
         reverse(split_part(reverse(split_part(_email, '@', 2)), '.', 1))
  END
$$;
REVOKE ALL ON FUNCTION public.mask_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mask_email(text) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  bucket text NOT NULL,
  subject text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, subject, window_start)
);
GRANT ALL ON public.rate_limit_counters TO service_role;
GRANT SELECT ON public.rate_limit_counters TO authenticated;
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read rate limit counters" ON public.rate_limit_counters;
CREATE POLICY "Admins read rate limit counters"
  ON public.rate_limit_counters FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  _bucket text, _subject text, _limit integer, _window_seconds integer
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w timestamptz; c integer;
BEGIN
  IF _subject IS NULL OR btrim(_subject) = '' THEN RETURN false; END IF;
  w := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);
  INSERT INTO public.rate_limit_counters (bucket, subject, window_start, count)
  VALUES (_bucket, lower(_subject), w, 1)
  ON CONFLICT (bucket, subject, window_start)
  DO UPDATE SET count = public.rate_limit_counters.count + 1, updated_at = now()
  RETURNING count INTO c;
  DELETE FROM public.rate_limit_counters WHERE window_start < now() - INTERVAL '2 days';
  RETURN c <= _limit;
END; $$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) TO service_role;

ALTER TABLE public.worker_push_tokens
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_reason text,
  ADD COLUMN IF NOT EXISTS last_refreshed_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.worker_push_tokens DROP CONSTRAINT IF EXISTS worker_push_tokens_platform_check;
ALTER TABLE public.worker_push_tokens
  ADD CONSTRAINT worker_push_tokens_platform_check CHECK (platform IN ('ios','android','web'));
CREATE INDEX IF NOT EXISTS idx_worker_push_tokens_active
  ON public.worker_push_tokens (user_id) WHERE is_active;

CREATE OR REPLACE FUNCTION public.register_worker_push_token(
  _token text, _platform text, _app_version text DEFAULT NULL, _device_model text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); allowed boolean; row_id uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  IF _token IS NULL OR length(btrim(_token)) < 20 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token'); END IF;
  IF _platform NOT IN ('ios','android','web') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_platform'); END IF;
  allowed := public.consume_rate_limit('push_token_register', uid::text, 20, 3600);
  IF NOT allowed THEN RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited'); END IF;
  UPDATE public.worker_push_tokens
     SET is_active = false, revoked_at = now(), revoked_reason = 'reassigned_to_other_user'
   WHERE token = _token AND user_id <> uid AND is_active;
  INSERT INTO public.worker_push_tokens
    (user_id, token, platform, app_version, device_model, last_seen_at, last_refreshed_at, is_active, revoked_at, revoked_reason)
  VALUES (uid, _token, _platform, _app_version, _device_model, now(), now(), true, NULL, NULL)
  ON CONFLICT (token) DO UPDATE SET
    user_id = uid, platform = EXCLUDED.platform, app_version = EXCLUDED.app_version,
    device_model = EXCLUDED.device_model, last_seen_at = now(), last_refreshed_at = now(),
    is_active = true, revoked_at = NULL, revoked_reason = NULL
  RETURNING id INTO row_id;
  RETURN jsonb_build_object('ok', true, 'id', row_id);
END; $$;
REVOKE ALL ON FUNCTION public.register_worker_push_token(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_worker_push_token(text, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.deactivate_worker_push_token(_token text, _reason text DEFAULT 'signed_out')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); n integer;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  UPDATE public.worker_push_tokens
     SET is_active = false, revoked_at = now(), revoked_reason = COALESCE(_reason, 'signed_out')
   WHERE token = _token AND user_id = uid AND is_active;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'deactivated', n);
END; $$;
REVOKE ALL ON FUNCTION public.deactivate_worker_push_token(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deactivate_worker_push_token(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.deactivate_invalid_push_tokens(_tokens text[], _reason text DEFAULT 'token_invalid')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.worker_push_tokens
     SET is_active = false, revoked_at = now(), revoked_reason = COALESCE(_reason, 'token_invalid')
   WHERE token = ANY(_tokens) AND is_active;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.deactivate_invalid_push_tokens(text[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_invalid_push_tokens(text[], text) TO service_role;

CREATE OR REPLACE FUNCTION public.worker_push_tokens_for_emails(_emails text[])
RETURNS TABLE (email text, token text, platform text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(u.email), t.token, t.platform
  FROM public.worker_push_tokens t
  JOIN auth.users u ON u.id = t.user_id
  WHERE t.is_active
    AND lower(u.email) = ANY (SELECT lower(e) FROM unnest(_emails) AS e)
$$;
REVOKE ALL ON FUNCTION public.worker_push_tokens_for_emails(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.worker_push_tokens_for_emails(text[]) TO service_role;

ALTER TABLE public.notification_queue
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email';
CREATE UNIQUE INDEX IF NOT EXISTS uniq_notification_queue_dedupe
  ON public.notification_queue (dedupe_key) WHERE dedupe_key IS NOT NULL;

ALTER TABLE public.push_delivery_logs
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS failure_category text,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS token_suffix text,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_push_delivery_idempotency
  ON public.push_delivery_logs (idempotency_key) WHERE idempotency_key IS NOT NULL;

UPDATE public.push_delivery_logs
   SET status = CASE
         WHEN success THEN 'service_accepted'
         WHEN http_status IN (400,401,403,404,410,422) THEN 'failed_permanent'
         ELSE 'failed_temporary' END
 WHERE status IS NULL;

CREATE OR REPLACE FUNCTION public.admin_notification_dashboard(p_limit integer DEFAULT 100)
RETURNS TABLE (
  event_type text, booking_code text, recipient_masked text, channel text,
  created_at timestamptz, sent_at timestamptz, opened_at timestamptz,
  delivery_status text, failure_category text, retry_count integer,
  platform text, app_version text, still_actionable boolean
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(l.source, 'push'), l.booking_code, public.mask_email(l.recipient_email),
    COALESCE(l.channel, 'push'), l.created_at,
    CASE WHEN l.success THEN l.created_at ELSE NULL END, l.opened_at,
    COALESCE(l.status, CASE WHEN l.success THEN 'service_accepted' ELSE 'failed_temporary' END),
    l.failure_category, l.attempts, l.platform, l.app_version,
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.booking_code = l.booking_code
            AND b.status = 'pending' AND (b.psw_assigned IS NULL OR b.psw_assigned = ''))
  FROM public.push_delivery_logs l
  WHERE public.is_admin()
  UNION ALL
  SELECT q.template_key, q.payload->>'booking_code', public.mask_email(q.to_email),
    COALESCE(q.channel, 'email'), q.created_at, q.processed_at, NULL, q.status,
    CASE WHEN q.status = 'failed_permanent' THEN 'permanent'
         WHEN q.status = 'expired' THEN 'expired'
         WHEN q.error IS NOT NULL THEN 'temporary' END,
    q.attempts, NULL, NULL, q.status IN ('queued','pending','sending')
  FROM public.notification_queue q
  WHERE public.is_admin()
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 500));
$$;
REVOKE ALL ON FUNCTION public.admin_notification_dashboard(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_notification_dashboard(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_notification_channel_gaps()
RETURNS TABLE (psw_number text, first_name text, recipient_masked text, active_devices integer, last_seen_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.psw_number, p.first_name, public.mask_email(p.email),
         COALESCE(d.cnt, 0)::int, d.last_seen
  FROM public.psw_profiles p
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt, max(t.last_seen_at) AS last_seen
    FROM public.worker_push_tokens t
    JOIN auth.users u ON u.id = t.user_id
    WHERE t.is_active AND lower(u.email) = lower(p.email)
  ) d ON true
  WHERE public.is_admin()
    AND p.vetting_status = 'approved'
    AND COALESCE(p.lifecycle_status, 'active') = 'active'
    AND COALESCE(d.cnt, 0) = 0
  ORDER BY p.psw_number NULLS LAST;
$$;
REVOKE ALL ON FUNCTION public.admin_notification_channel_gaps() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_notification_channel_gaps() TO authenticated, service_role;