CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'received',
  error_message TEXT,
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON public.stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_received ON public.stripe_webhook_events(received_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read stripe webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Admins read stripe webhook events"
ON public.stripe_webhook_events
FOR SELECT
TO authenticated
USING (public.is_admin());