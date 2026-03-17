-- Add split name and address fields to bookings (all nullable for backward compat)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS client_first_name text,
  ADD COLUMN IF NOT EXISTS client_last_name text,
  ADD COLUMN IF NOT EXISTS patient_first_name text,
  ADD COLUMN IF NOT EXISTS patient_last_name text,
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS street_name text;

-- Backfill existing records: parse client_name into first/last
UPDATE public.bookings
SET
  client_first_name = CASE 
    WHEN position(' ' IN client_name) > 0 THEN substring(client_name FROM 1 FOR position(' ' IN client_name) - 1)
    ELSE client_name
  END,
  client_last_name = CASE 
    WHEN position(' ' IN client_name) > 0 THEN substring(client_name FROM position(' ' IN client_name) + 1)
    ELSE ''
  END,
  patient_first_name = CASE 
    WHEN position(' ' IN patient_name) > 0 THEN substring(patient_name FROM 1 FOR position(' ' IN patient_name) - 1)
    ELSE patient_name
  END,
  patient_last_name = CASE 
    WHEN position(' ' IN patient_name) > 0 THEN substring(patient_name FROM position(' ' IN patient_name) + 1)
    ELSE ''
  END
WHERE client_first_name IS NULL;