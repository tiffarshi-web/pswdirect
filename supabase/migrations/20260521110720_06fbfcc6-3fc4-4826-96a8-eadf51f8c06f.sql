UPDATE public.bookings
SET status = 'claimed'
WHERE booking_code IN ('CDT-000104','CDT-000105') AND status = 'completed';

UPDATE public.bookings
SET
  status = 'pending',
  psw_assigned = NULL,
  psw_first_name = NULL,
  claimed_at = NULL,
  checked_in_at = NULL,
  signed_out_at = NULL,
  check_in_lat = NULL,
  check_in_lng = NULL,
  check_in_accuracy_m = NULL,
  check_in_distance_m = NULL,
  check_in_outside_radius = false,
  sign_out_lat = NULL,
  sign_out_lng = NULL,
  sign_out_accuracy_m = NULL,
  sign_out_distance_m = NULL,
  sign_out_outside_radius = false,
  original_checked_in_at = NULL,
  original_signed_out_at = NULL,
  manual_check_in = false,
  manual_check_out = false,
  manual_override_at = NULL,
  manual_override_by = NULL,
  manual_override_reason = NULL,
  verification_status = NULL,
  gps_check_in_failed = false,
  gps_check_in_failure_reason = NULL,
  final_billable_hours = NULL,
  suggested_billable_hours = NULL,
  overtime_minutes = NULL,
  flagged_for_overtime = false,
  psw_assigned_email_sent_at = NULL,
  psw_assigned_email_sent_for = NULL
WHERE booking_code IN ('CDT-000104','CDT-000105');