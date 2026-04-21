
-- ============================================================================
-- Payment Recovery Infrastructure
-- ============================================================================

-- Indexes for fast webhook reconciliation
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_pi ON public.bookings(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_status_payment ON public.bookings(status, payment_status);

-- Unreconciled payments table — captures Stripe payments without matching bookings
CREATE TABLE IF NOT EXISTS public.unreconciled_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id text NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_payment_method_id text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'cad',
  customer_email text,
  customer_name text,
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL DEFAULT 'no_booking_metadata',
  status text NOT NULL DEFAULT 'open', -- open | resolved | refunded | ignored
  resolved_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  resolved_by text,
  resolved_at timestamptz,
  resolution_note text,
  stripe_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unreconciled_payments_status ON public.unreconciled_payments(status);
CREATE INDEX IF NOT EXISTS idx_unreconciled_payments_created ON public.unreconciled_payments(created_at DESC);

-- Trigger to keep updated_at fresh
CREATE TRIGGER trg_unreconciled_payments_updated_at
  BEFORE UPDATE ON public.unreconciled_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.unreconciled_payments ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
CREATE POLICY "Admins can read unreconciled payments"
  ON public.unreconciled_payments FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update unreconciled payments"
  ON public.unreconciled_payments FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete unreconciled payments"
  ON public.unreconciled_payments FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Service role + anon (webhook runs unauthenticated with service role) can insert
CREATE POLICY "Service can insert unreconciled payments"
  ON public.unreconciled_payments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admin RPC: resolve an unreconciled payment by linking it to a booking
CREATE OR REPLACE FUNCTION public.admin_resolve_unreconciled_payment(
  p_unreconciled_id uuid,
  p_booking_id uuid,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin text;
  v_pi text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  SELECT stripe_payment_intent_id INTO v_pi FROM public.unreconciled_payments WHERE id = p_unreconciled_id;
  IF v_pi IS NULL THEN RAISE EXCEPTION 'Unreconciled payment not found'; END IF;

  -- Link the booking to the payment
  UPDATE public.bookings
  SET stripe_payment_intent_id = v_pi,
      payment_status = 'paid',
      updated_at = now()
  WHERE id = p_booking_id;

  -- Mark the unreconciled record resolved
  UPDATE public.unreconciled_payments
  SET status = 'resolved',
      resolved_booking_id = p_booking_id,
      resolved_by = v_admin,
      resolved_at = now(),
      resolution_note = p_note,
      updated_at = now()
  WHERE id = p_unreconciled_id;
END;
$$;

-- Admin RPC: dismiss/ignore (e.g. duplicate or already-handled payment)
CREATE OR REPLACE FUNCTION public.admin_dismiss_unreconciled_payment(
  p_unreconciled_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_admin text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_status NOT IN ('ignored','refunded') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  UPDATE public.unreconciled_payments
  SET status = p_status,
      resolved_by = v_admin,
      resolved_at = now(),
      resolution_note = p_note,
      updated_at = now()
  WHERE id = p_unreconciled_id;
END;
$$;
