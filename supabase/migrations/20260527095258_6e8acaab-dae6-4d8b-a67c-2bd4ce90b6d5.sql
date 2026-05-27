
-- ============================================================
-- 1) BOOKINGS: hide psw_pay_rate from clients via column GRANTs
-- ============================================================

-- Update PSW-safe view to drop psw_pay_rate so column-level revoke doesn't break it.
DROP VIEW IF EXISTS public.psw_safe_booking_view;
CREATE VIEW public.psw_safe_booking_view
WITH (security_invoker = on) AS
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

-- Switch bookings to explicit per-column SELECT for authenticated, excluding psw_pay_rate.
REVOKE SELECT ON public.bookings FROM authenticated;
REVOKE SELECT ON public.bookings FROM anon;

GRANT SELECT (
  id, booking_code, user_id, client_email, client_name, client_phone,
  client_address, client_postal_code, patient_name, patient_address,
  patient_postal_code, patient_relationship, service_type, scheduled_date,
  start_time, end_time, hours, hourly_rate, subtotal, surge_amount, total,
  status, payment_status, is_asap, was_refunded, psw_assigned, psw_first_name,
  special_notes, is_transport_booking, pickup_address, dropoff_address,
  preferred_languages, preferred_gender, created_at, updated_at, care_sheet,
  care_sheet_submitted_at, care_sheet_psw_name, pickup_postal_code,
  stripe_payment_intent_id, stripe_customer_id, refund_amount, refunded_at,
  refund_reason, psw_photo_url, psw_vehicle_photo_url, psw_license_plate,
  manual_check_in, manual_check_out, manual_override_at, manual_override_by,
  manual_override_reason, archived_to_accounting_at, overtime_minutes,
  overtime_payment_intent_id, claimed_at, checked_in_at, check_in_lat,
  check_in_lng, signed_out_at, flagged_for_overtime, care_sheet_status,
  care_sheet_last_saved_at, care_sheet_flagged, care_sheet_flag_reason,
  care_conditions, care_conditions_other, client_first_name, client_last_name,
  patient_first_name, patient_last_name, street_number, street_name,
  stripe_payment_method_id, payer_type, payer_name, payment_terms_days,
  due_date, cc_email, is_taxable, hst_amount, third_party_payer_mode,
  vac_program_of_choice, vac_provider_number, vac_benefit_code,
  vac_service_type, veteran_k_number, vac_authorization_number, vac_status,
  insurance_member_id, insurance_claim_number, insurance_contact_name,
  insurance_contact_email, insurance_contact_phone, insurance_claim_notes,
  parent_schedule_id, is_recurring, insurance_group_number,
  client_date_of_birth, cancelled_at, cancelled_by, cancellation_reason,
  cancellation_note, service_latitude, service_longitude, geocode_source,
  geocode_updated_at, review_request_sent, review_request_sent_at,
  psw_cancel_reason, psw_cancelled_at, final_billable_hours,
  suggested_billable_hours, billing_adjustment_required,
  billing_adjustment_handled_at, billing_adjustment_handled_by, billing_note,
  adjustment_invoice_id, stripe_adjustment_payment_intent_id,
  stripe_adjustment_status, adjustment_status, adjustment_amount,
  adjustment_charged_at, adjustment_charged_by, adjustment_failure_reason,
  psw_assigned_email_sent_for, order_update_email_sent_signature,
  cancellation_email_sent_at, refund_email_sent_at,
  admin_new_order_email_sent_at, booking_confirmation_sent_at,
  payment_success_email_sent_at, psw_assigned_email_sent_at,
  psw_reassigned_email_sent_at, order_updated_email_sent_at,
  order_cancelled_email_sent_at, completion_email_sent_at, invoice_sent_at,
  care_sheet_sent_at, rebook_nudge_sent_at, review_request_email_sent_at,
  cancellation_refund_decision, cancellation_refund_decision_note,
  cancellation_refund_decision_by, cancellation_refund_decision_at,
  payment_recovery_alerted_at, recovered_from_payment_intent, recovery_source,
  payment_link_sent_at, payment_link_sent_by, payment_link_send_count,
  stripe_checkout_session_id, stripe_checkout_url,
  contact_updated_before_payment, contact_updated_at, geocode_status,
  geocode_error_code, geocode_error_message, geocode_attempts,
  geocode_last_attempt_at, geocode_confidence, geocode_raw_address,
  sign_out_lat, sign_out_lng, sign_out_accuracy_m, sign_out_distance_m,
  sign_out_outside_radius, original_checked_in_at, original_signed_out_at,
  gps_check_in_failed, gps_check_in_failure_reason, check_in_outside_radius,
  check_in_distance_m, check_in_accuracy_m, verification_status
) ON public.bookings TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

-- PSW-facing secure helper: returns the assigned PSW's own pay-rate snapshots.
CREATE OR REPLACE FUNCTION public.get_my_assigned_pay_rates()
RETURNS TABLE(booking_id uuid, psw_pay_rate numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.psw_pay_rate
  FROM public.bookings b
  JOIN public.psw_profiles p ON p.id::text = b.psw_assigned
  WHERE p.email = (auth.jwt() ->> 'email')
    AND b.psw_pay_rate IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_my_assigned_pay_rates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_assigned_pay_rates() TO authenticated;


-- ============================================================
-- 2) NOTIFICATION_QUEUE: remove permissive authenticated INSERT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can enqueue notifications" ON public.notification_queue;
-- Edge functions use service_role (bypasses RLS) — no policy needed for authenticated.


-- ============================================================
-- 3) PRICING_CONFIGS: remove anonymous read access
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read pricing configs" ON public.pricing_configs;
DROP POLICY IF EXISTS "Public can read pricing configs" ON public.pricing_configs;
REVOKE SELECT ON public.pricing_configs FROM anon;
REVOKE SELECT ON public.pricing_configs FROM authenticated;
GRANT SELECT ON public.pricing_configs TO service_role;


-- ============================================================
-- 4) UNSERVED_ORDERS: require token, no broad read
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read by valid payment_link_token" ON public.unserved_orders;
DROP POLICY IF EXISTS "Anyone can read by payment_link_token" ON public.unserved_orders;
REVOKE SELECT ON public.unserved_orders FROM anon;

-- Secure lookup: caller must present the exact token; only one row returned.
CREATE OR REPLACE FUNCTION public.get_unserved_order_by_token(_token text)
RETURNS SETOF public.unserved_orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.unserved_orders
  WHERE payment_link_token IS NOT NULL
    AND payment_link_token <> ''
    AND payment_link_token = _token
    AND (pending_expires_at IS NULL OR pending_expires_at > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_unserved_order_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unserved_order_by_token(text) TO anon, authenticated;
