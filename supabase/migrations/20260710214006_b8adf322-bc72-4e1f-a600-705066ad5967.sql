
CREATE TABLE IF NOT EXISTS public.push_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NULL,
  booking_code TEXT NULL,
  source TEXT NULL,
  recipient_email TEXT NOT NULL,
  title TEXT NULL,
  url TEXT NULL,
  http_status INTEGER NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  response_body TEXT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_delivery_logs_booking_code ON public.push_delivery_logs (booking_code);
CREATE INDEX IF NOT EXISTS idx_push_delivery_logs_created_at ON public.push_delivery_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_delivery_logs_recipient ON public.push_delivery_logs (recipient_email);

GRANT SELECT ON public.push_delivery_logs TO authenticated;
GRANT ALL ON public.push_delivery_logs TO service_role;

ALTER TABLE public.push_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view push delivery logs" ON public.push_delivery_logs;
CREATE POLICY "Admins can view push delivery logs"
  ON public.push_delivery_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
