SELECT setval(
  'public.booking_code_seq',
  GREATEST(
    (SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(booking_code, '\D', '', 'g') AS BIGINT)), 0)
     FROM public.bookings
     WHERE booking_code ~ '^CDT-\d+$'),
    (SELECT last_value FROM public.booking_code_seq)
  )
);