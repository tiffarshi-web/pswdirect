
REVOKE ALL ON FUNCTION public.cancel_obsolete_booking_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_obsolete_booking_notifications() TO service_role;
