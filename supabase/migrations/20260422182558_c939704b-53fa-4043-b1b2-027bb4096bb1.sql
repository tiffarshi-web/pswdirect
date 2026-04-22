-- ============================================================================
-- Transactional email triggers: order updated, cancelled, admin alerts
-- All fire backend-only via pg_net to dedicated edge functions.
-- Each uses a "sent_for" / "sent_at" column to prevent duplicates.
-- ============================================================================

-- 1. Tracking columns on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS order_update_email_sent_signature text,
  ADD COLUMN IF NOT EXISTS cancellation_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_new_order_email_sent_at timestamptz;

-- Tracking column on dispatch_logs for admin unserved alert
ALTER TABLE public.dispatch_logs
  ADD COLUMN IF NOT EXISTS admin_unserved_email_sent_at timestamptz;

-- ============================================================================
-- Helper: read project URL + service key from vault, POST to edge function
-- ============================================================================
CREATE OR REPLACE FUNCTION public._invoke_edge_function(p_function_name text, p_body jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
  v_service_key text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_url
      FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
    SELECT decrypted_secret INTO v_service_key
      FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL;
  END;

  IF v_url IS NULL THEN
    v_url := 'https://pavibobervhqkfzwkotw.supabase.co';
  END IF;

  IF v_service_key IS NULL THEN
    -- Cannot call without auth; skip silently to avoid blocking the parent UPDATE
    RAISE NOTICE 'service_role_key not in vault; skipping % invocation', p_function_name;
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/' || p_function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := p_body
  );
END;
$$;

-- ============================================================================
-- 2. ORDER UPDATED trigger (date / time / hours change on existing booking)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_client_on_order_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_signature text;
BEGIN
  -- Only fire if a scheduling field actually changed
  IF NEW.scheduled_date IS NOT DISTINCT FROM OLD.scheduled_date
     AND NEW.start_time IS NOT DISTINCT FROM OLD.start_time
     AND NEW.end_time IS NOT DISTINCT FROM OLD.end_time
     AND NEW.hours IS NOT DISTINCT FROM OLD.hours
  THEN
    RETURN NEW;
  END IF;

  -- Don't notify on cancelled or completed bookings
  IF NEW.status IN ('cancelled', 'completed') THEN
    RETURN NEW;
  END IF;

  -- Build a signature of the new schedule. Skip if we already emailed this exact combo.
  v_signature := COALESCE(NEW.scheduled_date::text,'') || '|' ||
                 COALESCE(NEW.start_time::text,'') || '|' ||
                 COALESCE(NEW.end_time::text,'') || '|' ||
                 COALESCE(NEW.hours::text,'');

  IF NEW.order_update_email_sent_signature IS NOT DISTINCT FROM v_signature THEN
    RETURN NEW;
  END IF;

  PERFORM public._invoke_edge_function(
    'send-order-updated-email',
    jsonb_build_object('booking_id', NEW.id)
  );

  NEW.order_update_email_sent_signature := v_signature;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_on_order_updated ON public.bookings;
CREATE TRIGGER trg_notify_client_on_order_updated
BEFORE UPDATE OF scheduled_date, start_time, end_time, hours ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_on_order_updated();

-- ============================================================================
-- 3. ORDER CANCELLED trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_client_on_order_cancelled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when transitioning to cancelled (not when already cancelled)
  IF NEW.status <> 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Dedup
  IF NEW.cancellation_email_sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public._invoke_edge_function(
    'send-order-cancelled-email',
    jsonb_build_object('booking_id', NEW.id)
  );

  NEW.cancellation_email_sent_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_on_order_cancelled ON public.bookings;
CREATE TRIGGER trg_notify_client_on_order_cancelled
BEFORE UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_on_order_cancelled();

-- ============================================================================
-- 4. ADMIN ALERT — new order created
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_admin_on_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.admin_new_order_email_sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public._invoke_edge_function(
    'send-admin-order-alert',
    jsonb_build_object('booking_id', NEW.id, 'alert_type', 'new_order')
  );

  NEW.admin_new_order_email_sent_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_on_new_order ON public.bookings;
CREATE TRIGGER trg_notify_admin_on_new_order
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_new_order();

-- ============================================================================
-- 5. ADMIN ALERT — order marked unserved (no PSW found)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_admin_on_unserved_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Fire when marked_unserved_at transitions from null to non-null
  IF NEW.marked_unserved_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.marked_unserved_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.admin_unserved_email_sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public._invoke_edge_function(
    'send-admin-order-alert',
    jsonb_build_object('booking_id', NEW.booking_id, 'booking_code', NEW.booking_code, 'alert_type', 'unserved')
  );

  NEW.admin_unserved_email_sent_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_on_unserved_order ON public.dispatch_logs;
CREATE TRIGGER trg_notify_admin_on_unserved_order
BEFORE UPDATE OF marked_unserved_at ON public.dispatch_logs
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_unserved_order();