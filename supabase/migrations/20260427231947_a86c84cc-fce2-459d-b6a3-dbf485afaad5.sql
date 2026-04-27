DROP VIEW IF EXISTS public.psw_safe_booking_view;

CREATE VIEW public.psw_safe_booking_view
WITH (security_invoker = false) AS
SELECT
  b.id,
  b.booking_code,
  b.status,
  b.payment_status,
  b.stripe_payment_intent_id,
  b.is_asap,
  b.psw_assigned,
  b.psw_first_name,
  b.special_notes,
  b.is_transport_booking,
  b.pickup_address,
  b.pickup_postal_code,
  b.dropoff_address,
  b.preferred_languages,
  b.preferred_gender,
  b.check_in_lat,
  b.check_in_lng,
  b.checked_in_at,
  b.claimed_at,
  b.signed_out_at,
  b.manual_check_in,
  b.manual_check_out,
  b.manual_override_reason,
  b.psw_license_plate,
  b.psw_vehicle_photo_url,
  b.psw_photo_url,
  b.care_sheet,
  b.care_sheet_status,
  b.care_sheet_submitted_at,
  b.care_sheet_last_saved_at,
  b.care_sheet_psw_name,
  b.care_sheet_flagged,
  b.care_sheet_flag_reason,
  b.care_conditions,
  b.care_conditions_other,
  b.client_name,
  b.client_first_name,
  b.client_address,
  b.client_postal_code,
  b.patient_name,
  b.patient_first_name,
  b.patient_last_name,
  b.patient_address,
  b.patient_postal_code,
  b.patient_relationship,
  b.service_type,
  b.scheduled_date,
  b.start_time,
  b.end_time,
  b.hours,
  b.hourly_rate,
  b.psw_pay_rate,
  b.service_latitude,
  b.service_longitude,
  b.geocode_source,
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
  b.cancellation_reason
FROM public.bookings b
WHERE
  b.psw_assigned IN (
    SELECT p.id::text FROM public.psw_profiles p
    WHERE p.email = (auth.jwt() ->> 'email')
  )
  OR (
    b.status = 'pending'
    AND b.psw_assigned IS NULL
    AND EXISTS (
      SELECT 1 FROM public.psw_profiles p
      WHERE p.email = (auth.jwt() ->> 'email')
        AND p.vetting_status = 'approved'
    )
  );

REVOKE ALL ON public.psw_safe_booking_view FROM PUBLIC;
GRANT SELECT ON public.psw_safe_booking_view TO authenticated;

COMMENT ON VIEW public.psw_safe_booking_view IS
  'Hard column-level PII lockdown for PSWs. Excludes client_email, client_phone, payment, insurance, and billing columns. PSWs MUST query this view instead of the bookings table.';
