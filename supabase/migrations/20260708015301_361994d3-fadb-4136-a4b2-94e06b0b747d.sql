DELETE FROM public.dispatch_logs
 WHERE booking_id = '65ccb0ec-3eac-40dd-b347-d2a82221b38f'
   AND notes ILIKE 'GEOCODE_FAILED%';

UPDATE public.unserved_orders
   SET status = 'RESOLVED'
 WHERE booking_id = '65ccb0ec-3eac-40dd-b347-d2a82221b38f'
   AND status IN ('PENDING','OPEN');

UPDATE public.bookings
   SET service_latitude = 46.3092115,
       service_longitude = -79.4607617,
       geocode_source = 'city_fallback_manual',
       geocode_updated_at = now()
 WHERE id = '65ccb0ec-3eac-40dd-b347-d2a82221b38f'
   AND service_latitude IS NULL;