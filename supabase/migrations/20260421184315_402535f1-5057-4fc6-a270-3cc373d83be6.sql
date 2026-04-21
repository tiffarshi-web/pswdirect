DELETE FROM public.bookings WHERE booking_code LIKE 'SIMTEST-%';
DELETE FROM public.unreconciled_payments WHERE stripe_payment_intent_id LIKE 'pi_sim_%';