-- Track that the assignment email has been sent for a given PSW assignment.
-- We store the PSW UUID for which the last email was sent. If psw_assigned changes,
-- we re-send (covers reassignment).
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS psw_assigned_email_sent_for text;

-- Trigger function: when psw_assigned transitions to a non-null value
-- (or changes to a different non-null PSW), enqueue an HTTP call to the
-- send-psw-assignment-email edge function via pg_net.
CREATE OR REPLACE FUNCTION public.notify_client_on_psw_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_service_key text;
  v_should_send boolean := false;
BEGIN
  -- Fire when psw_assigned becomes non-empty AND differs from the last one we emailed about
  IF NEW.psw_assigned IS NOT NULL
     AND NEW.psw_assigned <> ''
     AND COALESCE(NEW.psw_assigned, '') <> COALESCE(NEW.psw_assigned_email_sent_for, '')
  THEN
    v_should_send := true;
  END IF;

  IF NOT v_should_send THEN
    RETURN NEW;
  END IF;

  -- Read project URL + service key from vault (set by infra). If unavailable, skip silently.
  BEGIN
    SELECT decrypted_secret INTO v_url
      FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
    SELECT decrypted_secret INTO v_service_key
      FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL;
  END;

  IF v_url IS NULL OR v_service_key IS NULL THEN
    -- Fallback: hardcoded project URL (the service key MUST be in vault for security).
    v_url := 'https://pavibobervhqkfzwkotw.supabase.co';
  END IF;

  -- Fire-and-forget HTTP POST. pg_net is async; failure here will not block the UPDATE.
  IF v_service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_url || '/functions/v1/send-psw-assignment-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object('booking_id', NEW.id)
    );
  END IF;

  -- Mark as sent immediately to prevent duplicates from concurrent updates.
  -- The edge function will only re-send if psw_assigned changes again.
  NEW.psw_assigned_email_sent_for := NEW.psw_assigned;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_on_psw_assignment ON public.bookings;
CREATE TRIGGER trg_notify_client_on_psw_assignment
  BEFORE UPDATE OF psw_assigned ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_psw_assignment();

-- Also handle the case where a brand-new booking is INSERTed with a PSW already attached
-- (rare, but possible for admin manual orders).
DROP TRIGGER IF EXISTS trg_notify_client_on_psw_assignment_ins ON public.bookings;
CREATE TRIGGER trg_notify_client_on_psw_assignment_ins
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  WHEN (NEW.psw_assigned IS NOT NULL AND NEW.psw_assigned <> '')
  EXECUTE FUNCTION public.notify_client_on_psw_assignment();

-- Store the service role key in vault so the trigger can authenticate.
-- Idempotent: insert if missing.
DO $$
DECLARE v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM vault.secrets WHERE name = 'service_role_key' LIMIT 1;
  IF v_existing IS NULL THEN
    PERFORM vault.create_secret(
      current_setting('app.settings.service_role_key', true),
      'service_role_key',
      'Service role key used by DB triggers to call edge functions'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- vault may not be available or app.settings not set; safe to ignore. Admin can set manually.
  NULL;
END $$;