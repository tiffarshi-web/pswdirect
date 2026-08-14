DELETE FROM public.unserved_orders WHERE booking_id = '994e0f5f-fcc8-45ea-be45-390d75009e66';
UPDATE public.bookings
SET status = 'pending', cancelled_at = NULL, cancellation_reason = NULL, updated_at = now()
WHERE id = '994e0f5f-fcc8-45ea-be45-390d75009e66';