
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payer_type text DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS payer_name text,
  ADD COLUMN IF NOT EXISTS payment_terms_days integer,
  ADD COLUMN IF NOT EXISTS due_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cc_email text;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payer_type text DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS payer_name text,
  ADD COLUMN IF NOT EXISTS payment_terms_days integer,
  ADD COLUMN IF NOT EXISTS due_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;
