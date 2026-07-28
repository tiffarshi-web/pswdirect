UPDATE public.bookings
SET service_latitude = 45.3659205,
    service_longitude = -75.9654674,
    geocode_status = 'city_fallback',
    geocode_source = 'manual_correction:kanata',
    geocode_updated_at = now(),
    updated_at = now()
WHERE booking_code IN ('CDT-000312','CDT-000285','CDT-000269');

UPDATE public.bookings
SET service_latitude = 43.7579312,
    service_longitude = -79.7421054,
    geocode_status = 'approximate',
    geocode_source = 'manual_correction:brampton',
    geocode_updated_at = now(),
    updated_at = now()
WHERE booking_code IN ('CDT-000262','CDT-000263');