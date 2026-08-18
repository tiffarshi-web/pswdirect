UPDATE public.bookings
SET status = 'cancelled',
    payment_status = 'cancelled',
    stripe_payment_intent_id = NULL,
    cancelled_at = now(),
    cancellation_reason = 'Duplicate of CDT-000399 (webhook outage 2026-08-18); payment reconciled to CDT-000399'
WHERE booking_code IN ('CDT-000396','CDT-000397','CDT-000398');

UPDATE public.bookings
SET stripe_payment_intent_id = 'pi_3U5qy1AuxNvhE8nt0KgmLkSR',
    payment_status = 'paid',
    special_notes = COALESCE(special_notes || E'\n', '') ||
      '[2026-08-18 reconciliation] Client was charged 3x during a webhook outage. Refunds issued on pi_3U5r8N and pi_3U5sPy; this order is backed by the surviving charge pi_3U5qy1 (originally created for CDT-000396).'
WHERE booking_code = 'CDT-000399';