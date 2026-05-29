-- 1. Audit log table
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,                  -- 'payout_created' | 'payout_voided' | 'booking_cancelled'
  actor_email text,                       -- admin who performed the action
  booking_id uuid,
  booking_code text,
  psw_id text,
  amount numeric,                         -- payout amount or booking total
  hours numeric,                          -- shift hours (for cancellations)
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX idx_admin_audit_log_booking_code ON public.admin_audit_log(booking_code);
CREATE INDEX idx_admin_audit_log_psw_id ON public.admin_audit_log(psw_id);

GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Inserts come from triggers (security definer functions run as table owner),
-- but we also allow admins to insert manually if ever needed.
CREATE POLICY "Admins can insert audit log"
  ON public.admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- 2. Trigger: payouts INSERT → payout_created
CREATE OR REPLACE FUNCTION public.log_payout_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_audit_log(action, actor_email, psw_id, amount, reason, details)
  VALUES (
    'payout_created',
    NEW.created_by_admin,
    NEW.psw_id::text,
    NEW.amount_paid,
    NEW.note,
    jsonb_build_object(
      'payout_id', NEW.id,
      'payment_method', NEW.payment_method,
      'reference_number', NEW.reference_number,
      'paid_at', NEW.paid_at
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_payout_created ON public.payouts;
CREATE TRIGGER trg_log_payout_created
AFTER INSERT ON public.payouts
FOR EACH ROW
EXECUTE FUNCTION public.log_payout_created();

-- 3. Trigger: payouts UPDATE (voided) → payout_voided
CREATE OR REPLACE FUNCTION public.log_payout_voided()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL THEN
    INSERT INTO public.admin_audit_log(action, actor_email, psw_id, amount, reason, details)
    VALUES (
      'payout_voided',
      NEW.voided_by,
      NEW.psw_id::text,
      NEW.amount_paid,
      NEW.void_reason,
      jsonb_build_object(
        'payout_id', NEW.id,
        'payment_method', NEW.payment_method,
        'original_paid_at', NEW.paid_at,
        'voided_at', NEW.voided_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_payout_voided ON public.payouts;
CREATE TRIGGER trg_log_payout_voided
AFTER UPDATE ON public.payouts
FOR EACH ROW
EXECUTE FUNCTION public.log_payout_voided();

-- 4. Trigger: bookings UPDATE (status → cancelled) → booking_cancelled
CREATE OR REPLACE FUNCTION public.log_booking_cancelled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND COALESCE(OLD.status,'') <> 'cancelled' THEN
    INSERT INTO public.admin_audit_log(action, actor_email, booking_id, booking_code, psw_id, amount, hours, reason, details)
    VALUES (
      'booking_cancelled',
      NEW.cancelled_by,
      NEW.id,
      NEW.booking_code,
      NEW.psw_assigned,
      NEW.total,
      NEW.hours,
      NEW.cancellation_reason,
      jsonb_build_object(
        'cancellation_note', NEW.cancellation_note,
        'refund_decision', NEW.cancellation_refund_decision,
        'was_refunded', NEW.was_refunded,
        'payment_status', NEW.payment_status,
        'client_name', NEW.client_name,
        'scheduled_date', NEW.scheduled_date,
        'cancelled_at', NEW.cancelled_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_booking_cancelled ON public.bookings;
CREATE TRIGGER trg_log_booking_cancelled
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.log_booking_cancelled();