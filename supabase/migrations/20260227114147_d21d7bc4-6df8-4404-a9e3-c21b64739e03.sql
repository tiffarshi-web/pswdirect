-- Allow approved PSWs to view available (unassigned, pending) bookings for job discovery
CREATE POLICY "PSWs can view available bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  status = 'pending' 
  AND psw_assigned IS NULL
  AND EXISTS (
    SELECT 1 FROM public.psw_profiles
    WHERE psw_profiles.email = (auth.jwt() ->> 'email')
      AND psw_profiles.vetting_status = 'approved'
  )
);