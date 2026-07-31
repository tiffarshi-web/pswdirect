-- Remove the broad open-jobs policy (it would expose client PII on the base table)
DROP POLICY IF EXISTS "Approved PSW can select open unclaimed bookings" ON public.bookings;

-- The safe caregiver view already enforces identity + QA isolation in its WHERE clause
-- and masks PII columns, so it can run as definer instead of invoker.
ALTER VIEW public.psw_safe_booking_view SET (security_invoker = off);