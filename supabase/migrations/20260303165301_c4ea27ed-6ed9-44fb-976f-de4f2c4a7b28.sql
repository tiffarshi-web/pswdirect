
-- Add manual fulfillment columns to unserved_orders
ALTER TABLE public.unserved_orders
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS pending_expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  ADD COLUMN IF NOT EXISTS assigned_psw_id UUID NULL,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS payment_link_token TEXT NULL,
  ADD COLUMN IF NOT EXISTS client_email TEXT NULL,
  ADD COLUMN IF NOT EXISTS full_client_payload JSONB NULL,
  ADD COLUMN IF NOT EXISTS booking_id UUID NULL;

-- Index on payment_link_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_unserved_orders_payment_link_token ON public.unserved_orders(payment_link_token) WHERE payment_link_token IS NOT NULL;

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS idx_unserved_orders_status ON public.unserved_orders(status);

-- Allow public SELECT on unserved_orders by payment_link_token (for pay page)
CREATE POLICY "Anyone can read by payment_link_token"
ON public.unserved_orders
FOR SELECT
USING (payment_link_token IS NOT NULL AND payment_link_token != '');

-- Allow public UPDATE for payment completion (status transition from PAYMENT_SENT to PAID)
CREATE POLICY "Anyone can update paid status via token"
ON public.unserved_orders
FOR UPDATE
USING (payment_link_token IS NOT NULL AND payment_link_token != '' AND status = 'PAYMENT_SENT')
WITH CHECK (status IN ('PAID', 'RESOLVED'));

-- Allow admins to update unserved orders
CREATE POLICY "Admins can update unserved orders"
ON public.unserved_orders
FOR UPDATE
USING (is_admin() OR has_role(auth.uid(), 'admin'::app_role));
