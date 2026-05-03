
ALTER TABLE public.unserved_orders
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS source_table text,
  ADD COLUMN IF NOT EXISTS source_event_id text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS tasks text[],
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS booking_code text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by text,
  ADD COLUMN IF NOT EXISTS resolved_action text,
  ADD COLUMN IF NOT EXISTS audit_log jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_unserved_orders_severity ON public.unserved_orders(severity);
CREATE INDEX IF NOT EXISTS idx_unserved_orders_reason ON public.unserved_orders(reason);

-- Map reason -> severity (used by trigger if severity not explicitly provided)
CREATE OR REPLACE FUNCTION public.unserved_severity_from_reason(p_reason text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE upper(COALESCE(p_reason, ''))
    WHEN 'PAID_BUT_NO_ORDER' THEN 'critical'
    WHEN 'PAYMENT_WEBHOOK_REQUIRES_REVIEW' THEN 'critical'
    WHEN 'WEBHOOK_FAILED' THEN 'high'
    WHEN 'DISPATCH_NOT_TRIGGERED' THEN 'high'
    WHEN 'GEOCODE_FAILED' THEN 'medium'
    WHEN 'SCHEDULE_EXPIRED' THEN 'medium'
    WHEN 'NO_PSW_FOUND' THEN 'medium'
    WHEN 'NO_PSW_IN_RADIUS' THEN 'medium'
    ELSE 'medium'
  END;
$$;

-- Trigger: set severity, then notify all admins
CREATE OR REPLACE FUNCTION public.notify_admins_on_unserved_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email text;
  v_title text;
  v_body text;
  v_sev text;
BEGIN
  IF NEW.severity IS NULL OR NEW.severity = 'medium' THEN
    NEW.severity := public.unserved_severity_from_reason(NEW.reason);
  END IF;
  v_sev := upper(NEW.severity);

  v_title := CASE v_sev
    WHEN 'CRITICAL' THEN '🚨 Critical: payment recovery needed'
    WHEN 'HIGH' THEN '⚠️ Action needed: unserved request'
    ELSE '📋 New unserved request'
  END;
  v_body := 'Action needed: New unserved request or payment recovery issue requires review. Reason: '
            || COALESCE(NEW.reason, '—')
            || COALESCE(' · Client: ' || NULLIF(NEW.client_name, ''), '')
            || COALESCE(' · City: ' || NULLIF(NEW.city, ''), '');

  -- Notify every admin (role-based + invited admins)
  FOR v_admin_email IN
    SELECT DISTINCT email FROM (
      SELECT lower(email) AS email FROM public.admin_invitations
        WHERE status = 'accepted' AND accepted_at IS NOT NULL AND expires_at > now()
      UNION
      SELECT lower(au.email) FROM auth.users au
        JOIN public.user_roles ur ON ur.user_id = au.id
        WHERE ur.role = 'admin' AND au.email IS NOT NULL
    ) e WHERE email IS NOT NULL AND email <> ''
  LOOP
    INSERT INTO public.notifications (user_email, title, body, type)
    VALUES (v_admin_email, v_title, v_body, 'unserved_alert');
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_unserved_insert ON public.unserved_orders;
CREATE TRIGGER trg_notify_admins_on_unserved_insert
BEFORE INSERT ON public.unserved_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_unserved_insert();

-- Append admin action to audit log + optionally resolve
CREATE OR REPLACE FUNCTION public.admin_log_unserved_action(
  p_id uuid,
  p_action text,
  p_note text DEFAULT NULL,
  p_resolve boolean DEFAULT false,
  p_new_status text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin text;
  v_entry jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  v_entry := jsonb_build_object(
    'at', to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'by', v_admin,
    'action', p_action,
    'note', p_note
  );

  UPDATE public.unserved_orders
  SET audit_log = COALESCE(audit_log, '[]'::jsonb) || v_entry,
      status = COALESCE(p_new_status, status),
      resolved_at = CASE WHEN p_resolve THEN now() ELSE resolved_at END,
      resolved_by = CASE WHEN p_resolve THEN v_admin ELSE resolved_by END,
      resolved_action = CASE WHEN p_resolve THEN p_action ELSE resolved_action END
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_log_unserved_action(uuid, text, text, boolean, text) TO authenticated;
