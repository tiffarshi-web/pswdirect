ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_link_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_link_sent_by text,
  ADD COLUMN IF NOT EXISTS payment_link_send_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_url text;