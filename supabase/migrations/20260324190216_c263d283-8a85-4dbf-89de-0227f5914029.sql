
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_taxable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hst_amount numeric DEFAULT 0;
