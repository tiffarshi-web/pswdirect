ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS care_conditions text[] DEFAULT '{}';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS care_conditions_other text;