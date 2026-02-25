
-- Fix search_path warnings for new functions
ALTER FUNCTION format_booking_code(bigint) SET search_path = 'public';
ALTER FUNCTION format_psw_number(integer) SET search_path = 'public';
