
-- Tighten guard for PSW self-updates: revert any change to admin-controlled fields
CREATE OR REPLACE FUNCTION public.guard_psw_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
BEGIN
  v_is_admin := public.is_admin();
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Identity
  NEW.id := OLD.id;
  NEW.email := OLD.email;
  NEW.psw_number := OLD.psw_number;

  -- Vetting / lifecycle
  NEW.vetting_status := OLD.vetting_status;
  NEW.vetting_notes := OLD.vetting_notes;
  NEW.vetting_updated_at := OLD.vetting_updated_at;
  NEW.approved_at := OLD.approved_at;
  NEW.rejected_at := OLD.rejected_at;
  NEW.rejection_reasons := OLD.rejection_reasons;
  NEW.rejection_notes := OLD.rejection_notes;
  NEW.lifecycle_status := OLD.lifecycle_status;
  NEW.archived_at := OLD.archived_at;
  NEW.archived_by := OLD.archived_by;
  NEW.archive_reason := OLD.archive_reason;
  NEW.banned_at := OLD.banned_at;
  NEW.flagged_at := OLD.flagged_at;
  NEW.flag_count := OLD.flag_count;
  NEW.cancel_count := OLD.cancel_count;
  NEW.last_status_change_at := OLD.last_status_change_at;
  NEW.first_job_completed_at := OLD.first_job_completed_at;
  NEW.applied_at := OLD.applied_at;
  NEW.resubmitted_at := OLD.resubmitted_at;
  NEW.expired_due_to_police_check := OLD.expired_due_to_police_check;
  NEW.is_test := OLD.is_test;

  -- Police check: admin-approved via psw_pending_updates only
  NEW.police_check_url := OLD.police_check_url;
  NEW.police_check_name := OLD.police_check_name;
  NEW.police_check_date := OLD.police_check_date;

  -- Government ID review fields
  NEW.gov_id_url := OLD.gov_id_url;
  NEW.gov_id_status := OLD.gov_id_status;
  NEW.gov_id_notes := OLD.gov_id_notes;
  NEW.gov_id_reviewed_at := OLD.gov_id_reviewed_at;
  NEW.gov_id_reviewed_by := OLD.gov_id_reviewed_by;

  -- PSW certificate review fields (URL itself can be updated via pending updates flow, status is admin-only)
  NEW.psw_cert_status := OLD.psw_cert_status;
  NEW.psw_cert_notes := OLD.psw_cert_notes;
  NEW.psw_cert_reviewed_at := OLD.psw_cert_reviewed_at;
  NEW.psw_cert_reviewed_by := OLD.psw_cert_reviewed_by;

  RETURN NEW;
END;
$function$;

-- Tighten client booking update guard: cover psw/care/schedule/recovery fields
CREATE OR REPLACE FUNCTION public.prevent_client_sensitive_booking_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_assigned_psw boolean;
  sensitive_changed boolean;
BEGIN
  -- Admins and service_role always allowed
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  is_assigned_psw := (OLD.psw_assigned IS NOT NULL AND OLD.psw_assigned = auth.uid()::text);
  IF is_assigned_psw THEN
    RETURN NEW;
  END IF;

  sensitive_changed :=
       NEW.total IS DISTINCT FROM OLD.total
    OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
    OR NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
    OR NEW.psw_assigned IS DISTINCT FROM OLD.psw_assigned
    OR NEW.psw_first_name IS DISTINCT FROM OLD.psw_first_name
    OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
    OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
    OR NEW.stripe_payment_method_id IS DISTINCT FROM OLD.stripe_payment_method_id
    OR NEW.payment_link_token IS DISTINCT FROM OLD.payment_link_token
    OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.client_email IS DISTINCT FROM OLD.client_email
    OR NEW.care_sheet IS DISTINCT FROM OLD.care_sheet
    OR NEW.care_sheet_status IS DISTINCT FROM OLD.care_sheet_status
    OR NEW.checked_in_at IS DISTINCT FROM OLD.checked_in_at
    OR NEW.signed_out_at IS DISTINCT FROM OLD.signed_out_at
    OR NEW.care_conditions IS DISTINCT FROM OLD.care_conditions
    OR NEW.parent_schedule_id IS DISTINCT FROM OLD.parent_schedule_id
    OR NEW.recovery_source IS DISTINCT FROM OLD.recovery_source
    OR NEW.geocode_source IS DISTINCT FROM OLD.geocode_source
    OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
    OR NEW.booking_code IS DISTINCT FROM OLD.booking_code
    OR NEW.psw_photo_url IS DISTINCT FROM OLD.psw_photo_url
    OR NEW.psw_vehicle_photo_url IS DISTINCT FROM OLD.psw_vehicle_photo_url
    OR NEW.psw_license_plate IS DISTINCT FROM OLD.psw_license_plate
    OR NEW.refund_amount IS DISTINCT FROM OLD.refund_amount
    OR NEW.refunded_at IS DISTINCT FROM OLD.refunded_at
    OR NEW.refund_reason IS DISTINCT FROM OLD.refund_reason
    OR NEW.was_refunded IS DISTINCT FROM OLD.was_refunded
    OR NEW.archived_to_accounting_at IS DISTINCT FROM OLD.archived_to_accounting_at
    OR NEW.manual_check_in IS DISTINCT FROM OLD.manual_check_in
    OR NEW.manual_check_out IS DISTINCT FROM OLD.manual_check_out
    OR NEW.manual_override_at IS DISTINCT FROM OLD.manual_override_at
    OR NEW.manual_override_by IS DISTINCT FROM OLD.manual_override_by
    OR NEW.manual_override_reason IS DISTINCT FROM OLD.manual_override_reason
    OR NEW.overtime_minutes IS DISTINCT FROM OLD.overtime_minutes
    OR NEW.overtime_payment_intent_id IS DISTINCT FROM OLD.overtime_payment_intent_id;

  IF sensitive_changed THEN
    RAISE EXCEPTION 'Permission denied: clients may not modify operational/financial booking fields';
  END IF;

  RETURN NEW;
END;
$function$;
