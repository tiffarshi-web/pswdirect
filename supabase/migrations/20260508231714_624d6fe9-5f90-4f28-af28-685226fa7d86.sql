
CREATE OR REPLACE FUNCTION public.enrich_unserved_order_from_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b public.bookings%ROWTYPE;
  v_addr text;
  v_postal text;
BEGIN
  IF NEW.booking_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = NEW.booking_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_addr := COALESCE(NULLIF(b.patient_address,''), NULLIF(b.client_address,''),
    NULLIF(trim(concat_ws(' ', NULLIF(b.street_number,''), NULLIF(b.street_name,''))),''));
  v_postal := COALESCE(NULLIF(b.patient_postal_code,''), NULLIF(b.client_postal_code,''));

  IF NEW.client_name IS NULL OR NEW.client_name = '' THEN
    NEW.client_name := NULLIF(trim(coalesce(b.client_name,
      concat_ws(' ', NULLIF(b.client_first_name,''), NULLIF(b.client_last_name,'')))), '');
  END IF;

  IF NEW.client_phone IS NULL OR NEW.client_phone = '' THEN
    NEW.client_phone := NULLIF(b.client_phone, '');
  END IF;

  IF NEW.client_email IS NULL OR NEW.client_email = '' THEN
    NEW.client_email := NULLIF(b.client_email, '');
  END IF;

  IF NEW.address IS NULL OR NEW.address = '' THEN
    NEW.address := v_addr;
  END IF;

  IF NEW.postal_code_raw IS NULL OR NEW.postal_code_raw = '' THEN
    NEW.postal_code_raw := v_postal;
  END IF;

  IF (NEW.postal_fsa IS NULL OR NEW.postal_fsa = '') AND COALESCE(v_postal,'') <> '' THEN
    NEW.postal_fsa := upper(substring(regexp_replace(v_postal, '[^A-Za-z0-9]', '', 'g') from 1 for 3));
  END IF;

  IF NEW.service_type IS NULL OR NEW.service_type = '' THEN
    IF COALESCE(array_length(b.service_type, 1), 0) > 0 THEN
      NEW.service_type := array_to_string(b.service_type, ', ');
    END IF;
  END IF;

  IF NEW.requested_start_time IS NULL AND b.scheduled_date IS NOT NULL AND b.start_time IS NOT NULL THEN
    NEW.requested_start_time := (b.scheduled_date::text || 'T' || b.start_time::text)::timestamptz;
  END IF;

  IF NEW.lat IS NULL THEN NEW.lat := b.service_latitude; END IF;
  IF NEW.lng IS NULL THEN NEW.lng := b.service_longitude; END IF;

  IF NEW.booking_code IS NULL OR NEW.booking_code = '' THEN
    NEW.booking_code := b.booking_code;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enrich_unserved_order ON public.unserved_orders;
CREATE TRIGGER trg_enrich_unserved_order
BEFORE INSERT OR UPDATE ON public.unserved_orders
FOR EACH ROW
EXECUTE FUNCTION public.enrich_unserved_order_from_booking();

-- Backfill existing rows
UPDATE public.unserved_orders u
SET
  client_name = COALESCE(NULLIF(u.client_name,''),
    NULLIF(trim(coalesce(b.client_name,
      concat_ws(' ', NULLIF(b.client_first_name,''), NULLIF(b.client_last_name,'')))), '')),
  client_phone = COALESCE(NULLIF(u.client_phone,''), NULLIF(b.client_phone,'')),
  client_email = COALESCE(NULLIF(u.client_email,''), NULLIF(b.client_email,'')),
  postal_code_raw = COALESCE(NULLIF(u.postal_code_raw,''),
    NULLIF(b.patient_postal_code,''), NULLIF(b.client_postal_code,'')),
  postal_fsa = COALESCE(NULLIF(u.postal_fsa,''),
    CASE WHEN COALESCE(b.patient_postal_code, b.client_postal_code,'') <> ''
      THEN upper(substring(regexp_replace(COALESCE(b.patient_postal_code, b.client_postal_code),'[^A-Za-z0-9]','','g') from 1 for 3))
      ELSE NULL END),
  address = COALESCE(NULLIF(u.address,''),
    NULLIF(b.patient_address,''), NULLIF(b.client_address,'')),
  service_type = COALESCE(NULLIF(u.service_type,''),
    CASE WHEN COALESCE(array_length(b.service_type,1),0) > 0
      THEN array_to_string(b.service_type, ', ') ELSE NULL END),
  requested_start_time = COALESCE(u.requested_start_time,
    CASE WHEN b.scheduled_date IS NOT NULL AND b.start_time IS NOT NULL
      THEN (b.scheduled_date::text || 'T' || b.start_time::text)::timestamptz
      ELSE NULL END),
  lat = COALESCE(u.lat, b.service_latitude),
  lng = COALESCE(u.lng, b.service_longitude),
  booking_code = COALESCE(NULLIF(u.booking_code,''), b.booking_code)
FROM public.bookings b
WHERE u.booking_id = b.id
  AND (
    COALESCE(u.client_name,'') = '' OR
    COALESCE(u.client_phone,'') = '' OR
    COALESCE(u.client_email,'') = '' OR
    COALESCE(u.postal_code_raw,'') = '' OR
    COALESCE(u.address,'') = '' OR
    COALESCE(u.service_type,'') = '' OR
    u.requested_start_time IS NULL OR
    u.lat IS NULL OR u.lng IS NULL OR
    COALESCE(u.booking_code,'') = ''
  );
