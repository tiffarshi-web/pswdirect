CREATE OR REPLACE FUNCTION public.guard_client_booking_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_is_client boolean;
  v_is_assigned_psw boolean;
BEGIN
  IF v_uid IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  v_is_client := COALESCE(OLD.user_id = v_uid, false)
              OR (v_email <> '' AND lower(btrim(coalesce(OLD.client_email, ''))) = v_email);

  v_is_assigned_psw := EXISTS (
    SELECT 1 FROM public.psw_profiles p
    WHERE lower(btrim(coalesce(p.email, ''))) = v_email
      AND p.id::text = OLD.psw_assigned
  );

  IF NOT v_is_client OR v_is_assigned_psw THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.psw_assigned IS DISTINCT FROM OLD.psw_assigned
     OR NEW.psw_first_name IS DISTINCT FROM OLD.psw_first_name
     OR NEW.total IS DISTINCT FROM OLD.total
     OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.hst_amount IS DISTINCT FROM OLD.hst_amount
     OR NEW.hours IS DISTINCT FROM OLD.hours
     OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
     OR NEW.start_time IS DISTINCT FROM OLD.start_time
     OR NEW.end_time IS DISTINCT FROM OLD.end_time
     OR NEW.refund_amount IS DISTINCT FROM OLD.refund_amount
     OR NEW.refunded_at IS DISTINCT FROM OLD.refunded_at
     OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
     OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.checked_in_at IS DISTINCT FROM OLD.checked_in_at
     OR NEW.signed_out_at IS DISTINCT FROM OLD.signed_out_at
     OR NEW.psw_pay_rate IS DISTINCT FROM OLD.psw_pay_rate
     OR NEW.final_billable_hours IS DISTINCT FROM OLD.final_billable_hours
     OR NEW.adjustment_amount IS DISTINCT FROM OLD.adjustment_amount
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.client_email IS DISTINCT FROM OLD.client_email
     OR NEW.booking_code IS DISTINCT FROM OLD.booking_code
  THEN
    RAISE EXCEPTION 'Clients cannot modify protected booking fields'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;