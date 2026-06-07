CREATE OR REPLACE FUNCTION public.prevent_client_sensitive_booking_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_user boolean;
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
    OR NEW.signed_out_at IS DISTINCT FROM OLD.signed_out_at;

  IF sensitive_changed THEN
    RAISE EXCEPTION 'Permission denied: clients may not modify operational/financial booking fields';
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.bookings
SET
  billing_note = COALESCE(billing_note || ' | ', '') || '[archived_from:' || status || '@' || to_char(now(),'YYYY-MM-DD') || ']',
  status = 'archived',
  updated_at = now()
WHERE status IN ('completed', 'cancelled');