ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS contact_updated_before_payment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_updated_at timestamptz;