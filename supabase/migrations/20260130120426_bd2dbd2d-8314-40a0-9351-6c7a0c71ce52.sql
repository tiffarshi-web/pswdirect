-- Add manual override tracking columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS manual_check_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_check_out BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_override_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS manual_override_by TEXT,
ADD COLUMN IF NOT EXISTS manual_override_reason TEXT;