CREATE OR REPLACE FUNCTION public.prevent_client_sensitive_booking_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  is_assigned_psw boolean;
  sensitive_changed boolean;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  is_assigned_psw := OLD.psw_assigned IS NOT NULL AND OLD.psw_assigned <> '' AND (
       OLD.psw_assigned = auth.uid()::text
    OR EXISTS (
         SELECT 1 FROM public.psw_profiles p
         WHERE v_email <> ''
           AND lower(btrim(coalesce(p.email, ''))) = v_email
           AND p.id::text = OLD.psw_assigned
       )
  );
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
$$;