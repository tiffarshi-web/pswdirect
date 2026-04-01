
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS insurance_group_number text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_date_of_birth date;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS insurance_group_number text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_date_of_birth date;
