-- Add shift lifecycle columns to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_in_lat numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_in_lng numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS signed_out_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS flagged_for_overtime boolean DEFAULT false;