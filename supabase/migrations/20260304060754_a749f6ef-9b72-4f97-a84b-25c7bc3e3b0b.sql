
-- Add care sheet status tracking columns to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS care_sheet_status text NOT NULL DEFAULT 'missing',
ADD COLUMN IF NOT EXISTS care_sheet_last_saved_at timestamp with time zone;

-- Backfill existing bookings that have care sheets submitted
UPDATE public.bookings 
SET care_sheet_status = 'submitted' 
WHERE care_sheet IS NOT NULL AND care_sheet_submitted_at IS NOT NULL;
