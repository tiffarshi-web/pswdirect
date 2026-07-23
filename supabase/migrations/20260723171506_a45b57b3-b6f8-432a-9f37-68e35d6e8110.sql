-- Extend column-level SELECT grant on public.bookings to include columns added
-- after the 20260617 grant migration. Without these, any client/PSW SELECT *
-- returns "permission denied for table bookings" because column-level grants
-- are enforced before RLS. psw_pay_rate remains intentionally excluded (admin only).
GRANT SELECT (stale_webhook_alerted_at, arrived_notified_at) ON public.bookings TO authenticated;