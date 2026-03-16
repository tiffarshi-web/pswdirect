-- Backfill postal codes to A1A 1A1 format
UPDATE bookings
SET client_postal_code = UPPER(SUBSTRING(REPLACE(REPLACE(client_postal_code, ' ', ''), '-', ''), 1, 3) || ' ' || SUBSTRING(REPLACE(REPLACE(client_postal_code, ' ', ''), '-', ''), 4, 3))
WHERE client_postal_code IS NOT NULL
  AND LENGTH(REPLACE(REPLACE(client_postal_code, ' ', ''), '-', '')) = 6
  AND client_postal_code NOT LIKE '___ ___';

UPDATE bookings
SET patient_postal_code = UPPER(SUBSTRING(REPLACE(REPLACE(patient_postal_code, ' ', ''), '-', ''), 1, 3) || ' ' || SUBSTRING(REPLACE(REPLACE(patient_postal_code, ' ', ''), '-', ''), 4, 3))
WHERE patient_postal_code IS NOT NULL
  AND LENGTH(REPLACE(REPLACE(patient_postal_code, ' ', ''), '-', '')) = 6
  AND patient_postal_code NOT LIKE '___ ___';

-- Backfill phone numbers to (XXX) XXX-XXXX format
-- First strip to digits, then reformat
UPDATE bookings
SET client_phone = '(' || SUBSTRING(regexp_replace(client_phone, '[^0-9]', '', 'g'), CASE WHEN LENGTH(regexp_replace(client_phone, '[^0-9]', '', 'g')) = 11 THEN 2 ELSE 1 END, 3) || ') ' || SUBSTRING(regexp_replace(client_phone, '[^0-9]', '', 'g'), CASE WHEN LENGTH(regexp_replace(client_phone, '[^0-9]', '', 'g')) = 11 THEN 5 ELSE 4 END, 3) || '-' || SUBSTRING(regexp_replace(client_phone, '[^0-9]', '', 'g'), CASE WHEN LENGTH(regexp_replace(client_phone, '[^0-9]', '', 'g')) = 11 THEN 8 ELSE 7 END, 4)
WHERE client_phone IS NOT NULL
  AND LENGTH(regexp_replace(client_phone, '[^0-9]', '', 'g')) IN (10, 11)
  AND client_phone NOT LIKE '(___) ___-____';