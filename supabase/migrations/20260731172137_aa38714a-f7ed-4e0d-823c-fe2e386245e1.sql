CREATE OR REPLACE FUNCTION public.is_qa_psw()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT COALESCE(p.is_test, false)
    FROM public.psw_profiles p
    WHERE lower(btrim(p.email)) = lower(btrim(COALESCE(auth.jwt() ->> 'email', '')))
    ORDER BY p.created_at ASC
    LIMIT 1
  ), false)
$$;

GRANT EXECUTE ON FUNCTION public.is_qa_psw() TO authenticated, service_role;

CREATE OR REPLACE VIEW public.psw_safe_booking_view
WITH (security_invoker = on) AS
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
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.checked_in_at ELSE NULL::timestamptz END AS checked_in_at,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.claimed_at ELSE NULL::timestamptz END AS claimed_at,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.signed_out_at ELSE NULL::timestamptz END AS signed_out_at,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.manual_check_in ELSE NULL::boolean END AS manual_check_in,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.manual_check_out ELSE NULL::boolean END AS manual_check_out,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.manual_override_reason ELSE NULL::text END AS manual_override_reason,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet ELSE NULL::jsonb END AS care_sheet,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_status ELSE NULL::text END AS care_sheet_status,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_submitted_at ELSE NULL::timestamptz END AS care_sheet_submitted_at,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_last_saved_at ELSE NULL::timestamptz END AS care_sheet_last_saved_at,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_psw_name ELSE NULL::text END AS care_sheet_psw_name,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_flagged ELSE NULL::boolean END AS care_sheet_flagged,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_flag_reason ELSE NULL::text[] END AS care_sheet_flag_reason,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.client_name ELSE NULL::text END AS client_name,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.client_first_name ELSE NULL::text END AS client_first_name,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.client_address ELSE NULL::text END AS client_address,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_name ELSE NULL::text END AS patient_name,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_first_name ELSE NULL::text END AS patient_first_name,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_last_name ELSE NULL::text END AS patient_last_name,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_address ELSE NULL::text END AS patient_address,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_relationship ELSE NULL::text END AS patient_relationship,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.pickup_address ELSE NULL::text END AS pickup_address,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.dropoff_address ELSE NULL::text END AS dropoff_address,
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
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.dropoff_postal_code ELSE NULL::text END AS dropoff_postal_code
FROM bookings b
CROSS JOIN ctx
WHERE (
    ctx.is_admin
    OR (b.psw_assigned IS NOT NULL AND b.psw_assigned = ctx.my_psw_id)
    OR (
      ctx.approved
      AND b.status = 'pending'::text
      AND b.psw_assigned IS NULL
      AND (COALESCE(b.status, ''::text) <> ALL (ARRAY['cancelled'::text, 'archived'::text]))
    )
  )
  AND (
    ctx.is_admin
    OR (
      CASE
        WHEN ctx.is_qa THEN (
          COALESCE(b.is_test_data, false) = true
          AND b.test_target_psw_id IS NOT NULL
          AND ctx.my_psw_id IS NOT NULL
          AND b.test_target_psw_id::text = ctx.my_psw_id
        )
        ELSE COALESCE(b.is_test_data, false) = false
      END
    )
  );

GRANT SELECT ON public.psw_safe_booking_view TO authenticated;

CREATE OR REPLACE FUNCTION public.count_available_jobs_for_psw(p_psw_id uuid, p_radius_km numeric DEFAULT 75)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH psw AS (
    SELECT id, home_lat, home_lng, vetting_status, lifecycle_status, COALESCE(is_test, false) AS is_test
    FROM public.psw_profiles WHERE id = p_psw_id
  )
  SELECT COUNT(*)::int
  FROM public.bookings b, psw
  WHERE psw.vetting_status = 'approved'
    AND COALESCE(psw.lifecycle_status, 'active') = 'active'
    AND b.status = 'pending'
    AND (b.psw_assigned IS NULL OR b.psw_assigned = '')
    AND (
      b.stripe_payment_intent_id IS NULL
      OR COALESCE(b.payment_status, '') = 'paid'
    )
    AND COALESCE(b.recovered_from_payment_intent, false) = false
    AND (
      CASE
        WHEN psw.is_test THEN (
          COALESCE(b.is_test_data, false) = true
          AND b.test_target_psw_id IS NOT NULL
          AND b.test_target_psw_id = psw.id
        )
        ELSE COALESCE(b.is_test_data, false) = false
      END
    )
    AND (
      psw.home_lat IS NULL OR psw.home_lng IS NULL
      OR b.service_latitude IS NULL OR b.service_longitude IS NULL
      OR (
        6371 * acos(
          cos(radians(psw.home_lat)) * cos(radians(b.service_latitude)) *
          cos(radians(b.service_longitude) - radians(psw.home_lng)) +
          sin(radians(psw.home_lat)) * sin(radians(b.service_latitude))
        )
      ) <= p_radius_km
    );
$function$;