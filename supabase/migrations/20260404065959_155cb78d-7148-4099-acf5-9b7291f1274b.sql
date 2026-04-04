-- Add persistent geocode fields to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_latitude numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS service_longitude numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS geocode_source text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS geocode_updated_at timestamptz DEFAULT NULL;