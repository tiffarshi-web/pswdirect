
CREATE OR REPLACE FUNCTION public.cancel_pending_notifications_for_booking(_booking_id uuid, _reason text DEFAULT 'booking_changed', _template_keys text[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_count integer := 0;
BEGIN
  SELECT booking_code INTO v_code FROM public.bookings WHERE id = _booking_id;

  UPDATE public.notification_queue q
  SET status = 'cancelled',
      processed_at = now(),
      error = left(coalesce(_reason, 'booking_changed'), 300)
  WHERE q.status = 'pending'
    AND (_template_keys IS NULL OR q.template_key = ANY(_template_keys))
    AND (
      q.payload->>'booking_id' = _booking_id::text
      OR (v_code IS NOT NULL AND (q.payload->>'booking_id' = v_code OR q.payload->>'booking_code' = v_code))
      OR q.dedupe_key LIKE '%' || _booking_id::text
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_pending_notifications_for_booking(uuid, text, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_pending_notifications_for_booking(uuid, text, text[]) TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_obsolete_booking_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Order cancelled: nothing queued for it should still go out.
  IF NEW.status = 'cancelled' AND COALESCE(OLD.status, '') <> 'cancelled' THEN
    PERFORM public.cancel_pending_notifications_for_booking(NEW.id, 'order_cancelled');
    RETURN NEW;
  END IF;

  -- Address problem resolved: the office alert is obsolete.
  IF COALESCE(NULLIF(btrim(NEW.geocode_status), ''), '') = 'success'
     AND COALESCE(NULLIF(btrim(OLD.geocode_status), ''), '') <> 'success' THEN
    PERFORM public.cancel_pending_notifications_for_booking(NEW.id, 'address_resolved', ARRAY['admin-geocode-flag']);
  END IF;

  -- Caregiver changed or the visit was moved to another day: stale visit
  -- alerts must not reach the client or the previous caregiver.
  IF COALESCE(NEW.psw_assigned, '') IS DISTINCT FROM COALESCE(OLD.psw_assigned, '')
     OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date THEN
    PERFORM public.cancel_pending_notifications_for_booking(NEW.id, 'visit_details_changed', ARRAY['psw-arrived']);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_obsolete_booking_notifications ON public.bookings;
CREATE TRIGGER trg_cancel_obsolete_booking_notifications
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.cancel_obsolete_booking_notifications();
