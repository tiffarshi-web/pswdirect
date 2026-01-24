-- Add PSW photo URL column to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS psw_photo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.psw_photo_url IS 'URL of assigned PSW profile photo for client visibility';