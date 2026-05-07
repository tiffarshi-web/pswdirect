-- Add address snapshot fields to invoices for accounting/insurance verification
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS client_address text,
  ADD COLUMN IF NOT EXISTS client_city text,
  ADD COLUMN IF NOT EXISTS client_province text,
  ADD COLUMN IF NOT EXISTS client_postal_code text;

-- Backfill existing invoices from booking data (postal code is the priority)
UPDATE public.invoices i
SET
  client_postal_code = COALESCE(i.client_postal_code, b.patient_postal_code, b.client_postal_code),
  client_address = COALESCE(i.client_address, b.patient_address, b.client_address),
  client_phone = COALESCE(i.client_phone, b.client_phone)
FROM public.bookings b
WHERE i.booking_id = b.id
  AND (i.client_postal_code IS NULL OR i.client_address IS NULL OR i.client_phone IS NULL);