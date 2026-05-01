
-- 1. Create enum
DO $$ BEGIN
  CREATE TYPE public.cancellation_refund_decision_enum AS ENUM ('refunded','retained_per_policy','pending_review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_refund_decision public.cancellation_refund_decision_enum,
  ADD COLUMN IF NOT EXISTS cancellation_refund_decision_note text,
  ADD COLUMN IF NOT EXISTS cancellation_refund_decision_by text,
  ADD COLUMN IF NOT EXISTS cancellation_refund_decision_at timestamptz;

-- 3. Backfill existing cancelled+paid bookings as pending_review
UPDATE public.bookings
SET cancellation_refund_decision = 'pending_review'
WHERE status = 'cancelled'
  AND payment_status = 'paid'
  AND cancellation_refund_decision IS NULL;

-- Also mark already-refunded ones explicitly
UPDATE public.bookings
SET cancellation_refund_decision = 'refunded',
    cancellation_refund_decision_at = COALESCE(refunded_at, now())
WHERE status = 'cancelled'
  AND payment_status = 'paid'
  AND was_refunded = true
  AND cancellation_refund_decision IS NULL;

-- 4. Trigger: enforce decision on cancel of paid booking
CREATE OR REPLACE FUNCTION public.enforce_cancellation_refund_decision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND NEW.payment_status = 'paid' THEN
    IF NEW.cancellation_refund_decision IS NULL THEN
      -- Auto-set to pending_review rather than blocking, so existing flows don't break,
      -- but admins are forced to resolve via UI.
      NEW.cancellation_refund_decision := 'pending_review';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_cancellation_refund_decision ON public.bookings;
CREATE TRIGGER trg_enforce_cancellation_refund_decision
BEFORE INSERT OR UPDATE OF status, payment_status, cancellation_refund_decision ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_cancellation_refund_decision();

-- 5. Admin RPC to record a decision
CREATE OR REPLACE FUNCTION public.admin_set_cancellation_refund_decision(
  p_booking_id uuid,
  p_decision public.cancellation_refund_decision_enum,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_admin text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  UPDATE public.bookings
  SET cancellation_refund_decision = p_decision,
      cancellation_refund_decision_note = COALESCE(p_note, cancellation_refund_decision_note),
      cancellation_refund_decision_by = v_admin,
      cancellation_refund_decision_at = now(),
      was_refunded = CASE WHEN p_decision = 'refunded' THEN true ELSE was_refunded END,
      refunded_at = CASE WHEN p_decision = 'refunded' AND refunded_at IS NULL THEN now() ELSE refunded_at END,
      updated_at = now()
  WHERE id = p_booking_id;
END;
$$;

-- 6. Helpful index for admin queue
CREATE INDEX IF NOT EXISTS idx_bookings_pending_refund_review
  ON public.bookings (cancellation_refund_decision)
  WHERE status = 'cancelled' AND payment_status = 'paid';
