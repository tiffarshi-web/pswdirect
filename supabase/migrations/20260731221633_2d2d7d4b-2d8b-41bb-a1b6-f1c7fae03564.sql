-- Caregivers lost read access to bookings (no SELECT policy existed for them),
-- which made assigned shifts invisible through psw_safe_booking_view (security_invoker=on).

CREATE POLICY "Assigned PSW can select own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  psw_assigned IS NOT NULL
  AND psw_assigned = public.current_psw_profile_id()
);

CREATE POLICY "Approved PSW can select open unclaimed bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  public.is_approved_psw()
  AND psw_assigned IS NULL
  AND status = 'pending'
);