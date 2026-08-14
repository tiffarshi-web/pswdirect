CREATE OR REPLACE FUNCTION public.rebroadcast_on_reactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'pending'
     AND COALESCE(OLD.status,'') IS DISTINCT FROM NEW.status
     AND COALESCE(OLD.status,'') IN ('cancelled','canceled','expired','unserved','auto_cancelled')
     AND COALESCE(NULLIF(NEW.psw_assigned,''), NULL) IS NULL
  THEN
    -- clear prior dispatch so notify-psws does not treat this as a duplicate
    DELETE FROM public.dispatch_logs WHERE booking_code = NEW.booking_code;

    PERFORM public._invoke_edge_function(
      'notify-psws',
      jsonb_build_object(
        'booking_id', NEW.id,
        'booking_code', NEW.booking_code,
        'city', '',
        'service_type', to_jsonb(NEW.service_type),
        'scheduled_date', NEW.scheduled_date,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'hours', NEW.hours,
        'is_asap', COALESCE(NEW.is_asap,false),
        'patient_postal_code', COALESCE(NEW.patient_postal_code, NEW.client_postal_code),
        'patient_address', COALESCE(NEW.patient_address, NEW.client_address),
        'preferred_gender', NEW.preferred_gender,
        'preferred_languages', to_jsonb(NEW.preferred_languages),
        'is_transport_booking', COALESCE(NEW.is_transport_booking,false)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rebroadcast_on_reactivation ON public.bookings;
CREATE TRIGGER trg_rebroadcast_on_reactivation
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.rebroadcast_on_reactivation();