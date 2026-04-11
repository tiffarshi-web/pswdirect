-- Add PSW cancellation tracking to bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS psw_cancel_reason text,
ADD COLUMN IF NOT EXISTS psw_cancelled_at timestamp with time zone;

-- Add cancellation count to psw_profiles
ALTER TABLE public.psw_profiles
ADD COLUMN IF NOT EXISTS cancel_count integer NOT NULL DEFAULT 0;