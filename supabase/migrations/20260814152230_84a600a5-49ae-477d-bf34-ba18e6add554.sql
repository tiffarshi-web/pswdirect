CREATE OR REPLACE FUNCTION public.psw_available_jobs(p_psw_id uuid, p_radius_km numeric DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  booking_code text,
  status text,
  client_name text,
  patient_address text,
  patient_postal_code text,
  scheduled_date date,
  start_time time,
  end_time time,
  service_type text[],
  preferred_languages text[],
  preferred_gender text,
  pickup_postal_code text,
  is_transport_booking boolean,
  is_asap boolean,
  created_at timestamptz,
  special_notes text,
  care_conditions text[],
  care_conditions_other text,
  is_recurring boolean,
  service_latitude numeric,
  service_longitude numeric,
  payment_status text,
  stripe_payment_intent_id text,
  psw_assigned text,
  distance_km numeric,
  radius_km numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_email text;
  v_is_admin boolean := false;
  v_psw_email text;
BEGIN
  v_caller_email := lower(btrim(COALESCE(auth.jwt() ->> 'email', '')));
  IF auth.uid() IS NOT NULL THEN
    SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO v_is_admin;
  END IF;

  SELECT lower(btrim(COALESCE(p.email, ''))) INTO v_psw_email
  FROM public.psw_profiles p WHERE p.id = p_psw_id;

  IF NOT v_is_admin AND (v_caller_email = '' OR v_psw_email IS DISTINCT FROM v_caller_email) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT b.id,
         b.booking_code,
         b.status,
         NULL::text AS client_name,
         NULL::text AS patient_address,
         b.patient_postal_code,
         b.scheduled_date,
         b.start_time,
         b.end_time,
         b.service_type,
         b.preferred_languages,
         b.preferred_gender,
         b.pickup_postal_code,
         b.is_transport_booking,
         b.is_asap,
         b.created_at,
         public.redact_pii_text(b.special_notes) AS special_notes,
         b.care_conditions,
         b.care_conditions_other,
         b.is_recurring,
         b.service_latitude,
         b.service_longitude,
         b.payment_status,
         b.stripe_payment_intent_id,
         b.psw_assigned,
         e.distance_km,
         e.radius_km
  FROM public.psw_eligible_booking_ids(p_psw_id, p_radius_km) e
  JOIN public.bookings b ON b.id = e.booking_id
  ORDER BY b.scheduled_date ASC, b.start_time ASC;
END;
$function$;

REVOKE ALL ON FUNCTION public.psw_available_jobs(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.psw_available_jobs(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.psw_available_jobs(uuid, numeric) TO service_role;