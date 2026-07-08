DELETE FROM public.dispatch_logs
 WHERE booking_id = '65ccb0ec-3eac-40dd-b347-d2a82221b38f';

UPDATE public.bookings
   SET service_latitude = NULL,
       service_longitude = NULL,
       geocode_source = NULL,
       geocode_updated_at = NULL
 WHERE id = '65ccb0ec-3eac-40dd-b347-d2a82221b38f';