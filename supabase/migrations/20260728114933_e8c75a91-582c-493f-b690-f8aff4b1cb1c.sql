ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS facility_name text,
  ADD COLUMN IF NOT EXISTS facility_unit text,
  ADD COLUMN IF NOT EXISTS pickup_instructions text,
  ADD COLUMN IF NOT EXISTS appointment_time time without time zone,
  ADD COLUMN IF NOT EXISTS dropoff_postal_code text,
  ADD COLUMN IF NOT EXISTS is_round_trip boolean;

COMMENT ON COLUMN public.bookings.facility_name IS 'Canonical hospital / doctor / clinic name for transport bookings.';
COMMENT ON COLUMN public.bookings.facility_unit IS 'Department, unit, floor, suite or room within the facility.';
COMMENT ON COLUMN public.bookings.pickup_instructions IS 'Free-text patient pickup instructions (may contain PII - gated to assigned PSW/admin).';
COMMENT ON COLUMN public.bookings.appointment_time IS 'Appointment time when different from the service start time.';
COMMENT ON COLUMN public.bookings.dropoff_postal_code IS 'Postal code of the destination / return address.';
COMMENT ON COLUMN public.bookings.is_round_trip IS 'Doctor escort: caregiver returns the client to the pickup location.';

CREATE OR REPLACE VIEW public.psw_safe_booking_view
WITH (security_invoker = on) AS
 WITH ctx AS (
         SELECT current_psw_profile_id() AS my_psw_id,
            is_approved_psw() AS approved,
            is_admin() AS is_admin
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
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.check_in_lat
            ELSE NULL::numeric
        END AS check_in_lat,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.check_in_lng
            ELSE NULL::numeric
        END AS check_in_lng,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.checked_in_at
            ELSE NULL::timestamp with time zone
        END AS checked_in_at,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.claimed_at
            ELSE NULL::timestamp with time zone
        END AS claimed_at,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.signed_out_at
            ELSE NULL::timestamp with time zone
        END AS signed_out_at,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.manual_check_in
            ELSE NULL::boolean
        END AS manual_check_in,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.manual_check_out
            ELSE NULL::boolean
        END AS manual_check_out,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.manual_override_reason
            ELSE NULL::text
        END AS manual_override_reason,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet
            ELSE NULL::jsonb
        END AS care_sheet,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_status
            ELSE NULL::text
        END AS care_sheet_status,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_submitted_at
            ELSE NULL::timestamp with time zone
        END AS care_sheet_submitted_at,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_last_saved_at
            ELSE NULL::timestamp with time zone
        END AS care_sheet_last_saved_at,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_psw_name
            ELSE NULL::text
        END AS care_sheet_psw_name,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_flagged
            ELSE NULL::boolean
        END AS care_sheet_flagged,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_flag_reason
            ELSE NULL::text[]
        END AS care_sheet_flag_reason,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.client_name
            ELSE NULL::text
        END AS client_name,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.client_first_name
            ELSE NULL::text
        END AS client_first_name,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.client_address
            ELSE NULL::text
        END AS client_address,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_name
            ELSE NULL::text
        END AS patient_name,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_first_name
            ELSE NULL::text
        END AS patient_first_name,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_last_name
            ELSE NULL::text
        END AS patient_last_name,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_address
            ELSE NULL::text
        END AS patient_address,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_relationship
            ELSE NULL::text
        END AS patient_relationship,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.pickup_address
            ELSE NULL::text
        END AS pickup_address,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.dropoff_address
            ELSE NULL::text
        END AS dropoff_address,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.special_notes
            WHEN ctx.approved AND b.psw_assigned IS NULL THEN redact_pii_text(b.special_notes)
            ELSE NULL::text
        END AS special_notes,
    b.facility_name,
    b.appointment_time,
    b.is_round_trip,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.facility_unit
            ELSE NULL::text
        END AS facility_unit,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.pickup_instructions
            ELSE NULL::text
        END AS pickup_instructions,
        CASE
            WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.dropoff_postal_code
            ELSE NULL::text
        END AS dropoff_postal_code
   FROM bookings b
     CROSS JOIN ctx
  WHERE ctx.is_admin OR b.psw_assigned IS NOT NULL AND b.psw_assigned = ctx.my_psw_id OR ctx.approved AND b.status = 'pending'::text AND b.psw_assigned IS NULL AND (COALESCE(b.status, ''::text) <> ALL (ARRAY['cancelled'::text, 'archived'::text]));

GRANT SELECT ON public.psw_safe_booking_view TO authenticated;
GRANT ALL ON public.psw_safe_booking_view TO service_role;