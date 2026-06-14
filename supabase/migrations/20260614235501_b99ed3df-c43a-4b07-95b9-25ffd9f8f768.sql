-- Fix infinite-recursion in bookings RLS by removing the self-referencing
-- EXISTS(SELECT ... FROM bookings b WHERE b.id = bookings.id ...) clause.
-- The "clients cannot modify sensitive booking fields" guarantee is already
-- enforced by the BEFORE UPDATE trigger
-- public.prevent_client_sensitive_booking_updates(), so the restrictive
-- policy only needs to admit admins and the assigned PSW.

DROP POLICY IF EXISTS "Booking sensitive columns admin or psw only" ON public.bookings;

CREATE POLICY "Booking sensitive columns admin or psw only"
ON public.bookings
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  public.is_admin()
  OR (
    psw_assigned IN (
      SELECT (p.id)::text
      FROM public.psw_profiles p
      WHERE p.email = (auth.jwt() ->> 'email')
    )
  )
  OR (
    -- Client paths: trigger prevent_client_sensitive_booking_updates()
    -- already blocks any change to protected columns. Allow the row through
    -- here so the trigger can decide.
    EXISTS (
      SELECT 1 FROM public.client_profiles cp
      WHERE cp.user_id = auth.uid()
    )
  )
);