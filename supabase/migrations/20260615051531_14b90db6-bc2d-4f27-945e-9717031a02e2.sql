
-- Phase 1: payment_failure_logs table for tracking declined cards
CREATE TABLE IF NOT EXISTS public.payment_failure_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NULL,
  booking_code text NULL,
  client_name text NULL,
  client_email text NULL,
  client_phone text NULL,
  service_type text NULL,
  amount numeric(10,2) NULL,
  currency text NOT NULL DEFAULT 'cad',
  payment_intent_id text NULL,
  charge_id text NULL,
  decline_code text NULL,
  failure_code text NULL,
  error_message text NULL,
  stripe_event_id text UNIQUE NULL,
  source_event_type text NULL,
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_failure_logs TO authenticated;
GRANT ALL ON public.payment_failure_logs TO service_role;

ALTER TABLE public.payment_failure_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment failure logs"
  ON public.payment_failure_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_payment_failure_logs_pi ON public.payment_failure_logs(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_failure_logs_booking ON public.payment_failure_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_failure_logs_created ON public.payment_failure_logs(created_at DESC);

-- Close stale Sandra Moore unreconciled row (CDT-000171 confirmed paid)
UPDATE public.unreconciled_payments
SET status = 'resolved',
    resolved_at = now(),
    resolution_note = COALESCE(resolution_note, '') || E'\n[auto] Phase 1 cleanup: CDT-000171 confirmed paid; original failure (stripe_setup_intent_id column) was from a removed trigger and no longer exists.',
    resolved_booking_id = (SELECT id FROM public.bookings WHERE booking_code = 'CDT-000171' LIMIT 1),
    updated_at = now()
WHERE stripe_payment_intent_id = 'pi_3TfTcZAuxNvhE8nt1JtqYMy4'
  AND status = 'open';
