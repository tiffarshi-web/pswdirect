
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS geocode_status text,
  ADD COLUMN IF NOT EXISTS geocode_error_code text,
  ADD COLUMN IF NOT EXISTS geocode_error_message text,
  ADD COLUMN IF NOT EXISTS geocode_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS geocode_last_attempt_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS geocode_confidence numeric,
  ADD COLUMN IF NOT EXISTS geocode_raw_address text;

CREATE INDEX IF NOT EXISTS idx_bookings_geocode_status
  ON public.bookings (geocode_status)
  WHERE geocode_status IS NOT NULL AND geocode_status <> 'success';
