CREATE OR REPLACE VIEW public.psw_safe_booking_view AS
 WITH ctx AS (
         SELECT current_psw_profile_id() AS my_psw_id,
            is_approved_psw() AS approved,
            is_admin() AS is_admin,
            is_qa_psw() AS is_qa
        )
 SELECT b.id,
    b.booking_code,
    b.status,
    b.payment_status,
    b.stripe_payment_intent_id,
    b.is_asap,
    b.psw_assigned,
    b.psw_first_name,
    b.psw_photo_url,
    b.psw_vehicle_photo_url,
    b.psw_license_plate,
    b.preferred_languages,
    b.preferred_gender,
    b.is_transport_booking,
    b.service_type,
    b.scheduled_date,
    b.start_time,
    b.end_time,
    b.hours,
    b.care_conditions,
    b.care_conditions_other,
    b.is_recurring,
    b.parent_schedule_id,
    b.flagged_for_overtime,
    b.overtime_minutes,
    b.suggested_billable_hours,
    b.final_billable_hours,
    b.psw_cancel_reason,
    b.psw_cancelled_at,
    b.created_at,
    b.updated_at,
    b.cancelled_at,
    b.cancellation_reason,
    b.patient_postal_code,
    b.client_postal_code,
    b.pickup_postal_code,
    b.service_latitude,
    b.service_longitude,
    b.geocode_source,
    b.is_test_data,
    b.test_target_psw_id,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.check_in_lat ELSE NULL::numeric END AS check_in_lat,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.check_in_lng ELSE NULL::numeric END AS check_in_lng,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.checked_in_at ELSE NULL::timestamp with time zone END AS checked_in_at,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.claimed_at ELSE NULL::timestamp with time zone END AS claimed_at,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.signed_out_at ELSE NULL::timestamp with time zone END AS signed_out_at,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.manual_check_in ELSE NULL::boolean END AS manual_check_in,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.manual_check_out ELSE NULL::boolean END AS manual_check_out,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.manual_override_reason ELSE NULL::text END AS manual_override_reason,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet ELSE NULL::jsonb END AS care_sheet,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_status ELSE NULL::text END AS care_sheet_status,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_submitted_at ELSE NULL::timestamp with time zone END AS care_sheet_submitted_at,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_last_saved_at ELSE NULL::timestamp with time zone END AS care_sheet_last_saved_at,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_psw_name ELSE NULL::text END AS care_sheet_psw_name,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_flagged ELSE NULL::boolean END AS care_sheet_flagged,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_flag_reason ELSE NULL::text[] END AS care_sheet_flag_reason,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.client_name ELSE NULL::text END AS client_name,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.client_first_name ELSE NULL::text END AS client_first_name,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.client_address ELSE NULL::text END AS client_address,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_name ELSE NULL::text END AS patient_name,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_first_name ELSE NULL::text END AS patient_first_name,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_last_name ELSE NULL::text END AS patient_last_name,
        -- Street address is now visible BEFORE acceptance so caregivers know where the job is.
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id OR ctx.approved THEN b.patient_address ELSE NULL::text END AS patient_address,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_relationship ELSE NULL::text END AS patient_relationship,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id OR ctx.approved THEN b.pickup_address ELSE NULL::text END AS pickup_address,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id OR ctx.approved THEN b.dropoff_address ELSE NULL::text END AS dropoff_address,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.special_notes
            WHEN ctx.approved AND b.psw_assigned IS NULL THEN redact_pii_text(b.special_notes)
            ELSE NULL::text
        END AS special_notes,
    b.facility_name,
    b.appointment_time,
    b.is_round_trip,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.facility_unit ELSE NULL::text END AS facility_unit,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.pickup_instructions ELSE NULL::text END AS pickup_instructions,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.dropoff_postal_code ELSE NULL::text END AS dropoff_postal_code,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.unit_number ELSE NULL::text END AS unit_number,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.buzzer_code ELSE NULL::text END AS buzzer_code,
        CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.entry_point ELSE NULL::text END AS entry_point
   FROM bookings b
     CROSS JOIN ctx
  WHERE (ctx.is_admin OR b.psw_assigned IS NOT NULL AND b.psw_assigned = ctx.my_psw_id OR ctx.approved AND b.status = 'pending'::text AND b.psw_assigned IS NULL AND (COALESCE(b.status, ''::text) <> ALL (ARRAY['cancelled'::text, 'archived'::text]))) AND (ctx.is_admin OR
        CASE
            WHEN ctx.is_qa THEN COALESCE(b.is_test_data, false) = true AND b.test_target_psw_id IS NOT NULL AND ctx.my_psw_id IS NOT NULL AND b.test_target_psw_id::text = ctx.my_psw_id
            ELSE COALESCE(b.is_test_data, false) = false
        END);

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
         b.patient_address,
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