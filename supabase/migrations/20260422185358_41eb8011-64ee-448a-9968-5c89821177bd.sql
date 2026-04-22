
-- Trigger: notify client (in-app) when PSW assignment email timestamp is stamped.
-- Fires on both INSERT and UPDATE of bookings, AFTER the row is committed.
-- Dedup key: (booking_id, psw_assigned) recorded as type='psw_assigned' notification.

CREATE OR REPLACE FUNCTION public.notify_client_push_on_psw_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_time text;
  v_hr int;
  v_period text;
  v_hr12 int;
  v_min text;
BEGIN
  -- Must have an assignment email timestamp
  IF NEW.psw_assigned_email_sent_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- For UPDATEs, only fire if the timestamp just changed
  IF TG_OP = 'UPDATE'
     AND OLD.psw_assigned_email_sent_at IS NOT DISTINCT FROM NEW.psw_assigned_email_sent_at THEN
    RETURN NEW;
  END IF;

  -- Need both client email and a PSW
  IF NEW.client_email IS NULL OR NEW.client_email = '' THEN
    RETURN NEW;
  END IF;
  IF NEW.psw_assigned IS NULL OR NEW.psw_assigned = '' THEN
    RETURN NEW;
  END IF;

  -- Skip cancelled / completed
  IF NEW.status IN ('cancelled', 'completed') THEN
    RETURN NEW;
  END IF;

  -- Dedup: if a psw_assigned notification for this booking + this PSW already exists, skip.
  IF EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE user_email = NEW.client_email
      AND type = 'psw_assigned'
      AND body LIKE '%' || NEW.booking_code || '%'
      AND created_at > NEW.created_at
      -- and it was for this same PSW (encoded into title via PSW first name + booking_code dedup)
  ) AND EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_email = NEW.client_email
      AND n.type = 'psw_assigned'
      AND n.body LIKE '%' || NEW.booking_code || '%'
      AND n.body LIKE '%' || COALESCE(NEW.psw_assigned, '') || '%'
  ) THEN
    RETURN NEW;
  END IF;

  -- Format start_time as h:mm AM/PM
  v_hr := EXTRACT(HOUR FROM NEW.start_time)::int;
  v_min := lpad(EXTRACT(MINUTE FROM NEW.start_time)::int::text, 2, '0');
  v_period := CASE WHEN v_hr >= 12 THEN 'PM' ELSE 'AM' END;
  v_hr12 := CASE WHEN (v_hr % 12) = 0 THEN 12 ELSE v_hr % 12 END;
  v_time := v_hr12::text || ':' || v_min || ' ' || v_period;

  INSERT INTO public.notifications (user_email, title, body, type)
  VALUES (
    NEW.client_email,
    '✅ Your PSW is confirmed',
    'Your PSW is confirmed and will arrive at ' || v_time || '. (Booking ' || NEW.booking_code || ', PSW ' || NEW.psw_assigned || ')',
    'psw_assigned'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_push_on_psw_assigned_ins ON public.bookings;
DROP TRIGGER IF EXISTS trg_notify_client_push_on_psw_assigned_upd ON public.bookings;

CREATE TRIGGER trg_notify_client_push_on_psw_assigned_ins
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_push_on_psw_assigned();

CREATE TRIGGER trg_notify_client_push_on_psw_assigned_upd
AFTER UPDATE OF psw_assigned_email_sent_at ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_push_on_psw_assigned();
