-- Add PSW vehicle columns to bookings table for transport identification
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS psw_vehicle_photo_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS psw_license_plate TEXT;