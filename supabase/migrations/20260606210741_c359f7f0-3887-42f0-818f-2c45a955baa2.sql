
-- 1) BOOKINGS: prevent clients from modifying sensitive columns via trigger
CREATE OR REPLACE FUNCTION public.prevent_client_sensitive_booking_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_user boolean := false;
  is_assigned_psw boolean := false;
BEGIN
  -- Service role bypasses RLS entirely and won't hit this check meaningfully,
  -- but we still allow admins and the assigned PSW to update anything.
  BEGIN
    is_admin_user := public.is_admin();
  EXCEPTION WHEN OTHERS THEN
    is_admin_user := false;
  END;

  IF is_admin_user THEN
    RETURN NEW;
  END IF;

  -- Allow the assigned PSW (matched by JWT email) to update all fields
  IF NEW.psw_assigned IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.psw_profiles p
    WHERE p.id::text = NEW.psw_assigned
      AND p.email = (auth.jwt() ->> 'email')
  ) THEN
    RETURN NEW;
  END IF;

  -- Otherwise treat as client update: block changes to sensitive columns
  IF NEW.total IS DISTINCT FROM OLD.total
     OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate
     OR NEW.surge_amount IS DISTINCT FROM OLD.surge_amount
     OR NEW.hst_amount IS DISTINCT FROM OLD.hst_amount
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.psw_assigned IS DISTINCT FROM OLD.psw_assigned
     OR NEW.psw_first_name IS DISTINCT FROM OLD.psw_first_name
     OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_setup_intent_id IS DISTINCT FROM OLD.stripe_setup_intent_id
     OR NEW.stripe_payment_method_id IS DISTINCT FROM OLD.stripe_payment_method_id
     OR NEW.payment_link_token IS DISTINCT FROM OLD.payment_link_token
     OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.client_email IS DISTINCT FROM OLD.client_email
     OR NEW.care_sheet IS DISTINCT FROM OLD.care_sheet
     OR NEW.care_sheet_status IS DISTINCT FROM OLD.care_sheet_status
     OR NEW.actual_start_time IS DISTINCT FROM OLD.actual_start_time
     OR NEW.actual_end_time IS DISTINCT FROM OLD.actual_end_time
     OR NEW.check_in_time IS DISTINCT FROM OLD.check_in_time
     OR NEW.check_out_time IS DISTINCT FROM OLD.check_out_time
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
  THEN
    RAISE EXCEPTION 'Clients cannot modify financial, status, assignment, or verification fields on bookings'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_client_sensitive_booking_updates ON public.bookings;
CREATE TRIGGER trg_prevent_client_sensitive_booking_updates
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_sensitive_booking_updates();


-- 2) PRICING_SETTINGS: remove public exposure of psw_hourly_rate
DROP POLICY IF EXISTS "Anyone can read pricing settings" ON public.pricing_settings;

CREATE OR REPLACE VIEW public.pricing_settings_public
WITH (security_invoker = true)
AS
SELECT id, task_name, client_hourly_rate, surcharge_flat, is_active, created_at, updated_at
FROM public.pricing_settings;

GRANT SELECT ON public.pricing_settings_public TO anon, authenticated;

-- Allow PSWs and authenticated users to read the public-safe columns directly
-- via a policy that filters out nothing (psw_hourly_rate still requires admin policy).
-- Since column-level RLS isn't supported here, we keep the table restricted to admins
-- and expose the safe view above for everyone else.


-- 3) UNSERVED_ORDERS: tighten public insert + remove token-based update
DROP POLICY IF EXISTS "Anyone can insert unserved orders" ON public.unserved_orders;
CREATE POLICY "Anyone can insert unserved orders (constrained)"
ON public.unserved_orders
FOR INSERT
TO public
WITH CHECK (
  -- Block fields that should only ever be set server-side
  payment_link_token IS NULL
  AND full_client_payload IS NULL
  AND assigned_psw_id IS NULL
  AND admin_notes IS NULL
  AND decline_reason IS NULL
  AND resolved_at IS NULL
  AND resolved_by IS NULL
  AND resolved_action IS NULL
  AND payment_intent_id IS NULL
  -- Constrain reason and status to known safe values
  AND reason IN (
    'NO_PSW_IN_RADIUS','NO_PSW_AVAILABLE','RADIUS_ALERT',
    'TIMEOUT','DISPATCH_FAILED','CLIENT_CANCELLED','OTHER'
  )
  AND (status IS NULL OR status = 'PENDING')
);

DROP POLICY IF EXISTS "Anyone can update paid status via token" ON public.unserved_orders;
