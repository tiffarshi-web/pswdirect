
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS psw_assignment_version integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bump_psw_assignment_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.psw_assigned IS NOT NULL AND NEW.psw_assigned <> '' THEN
      NEW.psw_assignment_version := 1;
    END IF;
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.psw_assigned,'') <> COALESCE(OLD.psw_assigned,'')
     AND NEW.psw_assigned IS NOT NULL AND NEW.psw_assigned <> '' THEN
    NEW.psw_assignment_version := COALESCE(OLD.psw_assignment_version, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_psw_assignment_version_ins ON public.bookings;
CREATE TRIGGER trg_bump_psw_assignment_version_ins
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bump_psw_assignment_version();

DROP TRIGGER IF EXISTS trg_bump_psw_assignment_version_upd ON public.bookings;
CREATE TRIGGER trg_bump_psw_assignment_version_upd
BEFORE UPDATE OF psw_assigned ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bump_psw_assignment_version();

CREATE TABLE IF NOT EXISTS public.psw_assignment_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  booking_code text,
  psw_id text NOT NULL,
  psw_display_name text,
  assignment_version integer NOT NULL DEFAULT 1,
  template_key text NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider_message_id text,
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, psw_id, assignment_version)
);

GRANT SELECT ON public.psw_assignment_email_log TO authenticated;
GRANT ALL ON public.psw_assignment_email_log TO service_role;

ALTER TABLE public.psw_assignment_email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view assignment email log" ON public.psw_assignment_email_log;
CREATE POLICY "Admins can view assignment email log"
ON public.psw_assignment_email_log
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.touch_psw_assignment_email_log()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_psw_assignment_email_log ON public.psw_assignment_email_log;
CREATE TRIGGER trg_touch_psw_assignment_email_log
BEFORE UPDATE ON public.psw_assignment_email_log
FOR EACH ROW EXECUTE FUNCTION public.touch_psw_assignment_email_log();

CREATE INDEX IF NOT EXISTS idx_psw_assignment_email_log_booking
  ON public.psw_assignment_email_log (booking_id, created_at DESC);

-- Assignment trigger: use the reliable internal handshake invoker
CREATE OR REPLACE FUNCTION public.notify_client_on_psw_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.psw_assigned IS NULL OR NEW.psw_assigned = '' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.psw_assigned, '') = COALESCE(NEW.psw_assigned_email_sent_for, '') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.psw_assigned IS NOT NULL AND OLD.psw_assigned <> ''
     AND OLD.psw_assigned <> NEW.psw_assigned THEN
    -- true reassignment: handled by notify_client_on_psw_reassigned
    RETURN NEW;
  END IF;

  IF NEW.status IN ('cancelled', 'completed') THEN
    RETURN NEW;
  END IF;

  PERFORM public._invoke_edge_function(
    'send-psw-assignment-email',
    jsonb_build_object(
      'booking_id', NEW.id,
      'assignment_version', COALESCE(NEW.psw_assignment_version, 1)
    )
  );

  NEW.psw_assigned_email_sent_for := NEW.psw_assigned;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_client_on_psw_reassigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.psw_assigned IS NULL OR OLD.psw_assigned = '' THEN
    RETURN NEW;
  END IF;
  IF NEW.psw_assigned IS NULL OR NEW.psw_assigned = '' THEN
    RETURN NEW;
  END IF;
  IF NEW.psw_assigned = OLD.psw_assigned THEN
    RETURN NEW;
  END IF;
  IF NEW.status IN ('cancelled', 'completed') THEN
    RETURN NEW;
  END IF;
  IF NEW.client_email IS NULL OR NEW.client_email = '' THEN
    RETURN NEW;
  END IF;

  PERFORM public._invoke_edge_function(
    'send-psw-reassigned-email',
    jsonb_build_object(
      'booking_id', NEW.id,
      'previous_psw_id', OLD.psw_assigned,
      'new_psw_id', NEW.psw_assigned,
      'assignment_version', COALESCE(NEW.psw_assignment_version, COALESCE(OLD.psw_assignment_version,0) + 1)
    )
  );

  NEW.psw_reassigned_email_sent_at := now();
  NEW.psw_assigned_email_sent_for := NEW.psw_assigned;
  RETURN NEW;
END;
$$;

-- Retry job for failed assignment emails
CREATE OR REPLACE FUNCTION public.retry_failed_assignment_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT l.id, l.booking_id, l.assignment_version, l.template_key
    FROM public.psw_assignment_email_log l
    WHERE l.status = 'failed'
      AND l.attempts < 5
      AND l.created_at > now() - interval '3 days'
    ORDER BY l.updated_at ASC
    LIMIT 20
  LOOP
    PERFORM public._invoke_edge_function(
      CASE WHEN r.template_key = 'psw_reassigned'
           THEN 'send-psw-reassigned-email'
           ELSE 'send-psw-assignment-email' END,
      jsonb_build_object('booking_id', r.booking_id, 'assignment_version', r.assignment_version, 'retry', true)
    );
  END LOOP;
END;
$$;

SELECT cron.unschedule('retry-failed-assignment-emails')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retry-failed-assignment-emails');

SELECT cron.schedule(
  'retry-failed-assignment-emails',
  '*/15 * * * *',
  $$SELECT public.retry_failed_assignment_emails();$$
);
