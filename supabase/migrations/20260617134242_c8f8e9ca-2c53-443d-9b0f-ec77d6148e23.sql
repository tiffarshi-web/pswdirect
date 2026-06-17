-- Re-hide internal compensation field psw_pay_rate from non-admin SELECTs on bookings.
-- A later migration (20260529) accidentally restored a table-wide SELECT grant
-- which re-exposed psw_pay_rate to clients and PSWs. Restore per-column grants.

REVOKE SELECT ON public.bookings FROM anon;
REVOKE SELECT ON public.bookings FROM authenticated;

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

-- service_role retains full access (used by edge functions for payroll/admin work)
GRANT ALL ON public.bookings TO service_role;