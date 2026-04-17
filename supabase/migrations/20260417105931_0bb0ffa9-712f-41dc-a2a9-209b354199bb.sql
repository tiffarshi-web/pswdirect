UPDATE public.bookings
SET service_latitude = 44.4267793,
    service_longitude = -79.1643018,
    geocode_source = 'backfill_admin_fix_beaverton',
    geocode_updated_at = now()
WHERE client_name ILIKE '%tilling%'
  AND patient_postal_code = 'L0K 1A0'
  AND (service_latitude IS NULL OR service_longitude IS NULL);