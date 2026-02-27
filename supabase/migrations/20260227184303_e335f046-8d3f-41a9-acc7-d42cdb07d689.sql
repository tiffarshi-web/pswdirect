-- Allow approved PSWs to claim unassigned pending bookings
CREATE POLICY "PSWs can claim available bookings"
  ON public.bookings FOR UPDATE
  USING (
    status = 'pending' 
    AND psw_assigned IS NULL
    AND EXISTS (
      SELECT 1 FROM psw_profiles
      WHERE psw_profiles.email = (auth.jwt() ->> 'email'::text)
      AND psw_profiles.vetting_status = 'approved'
    )
  )
  WITH CHECK (
    psw_assigned IN (
      SELECT (psw_profiles.id)::text
      FROM psw_profiles
      WHERE psw_profiles.email = (auth.jwt() ->> 'email'::text)
    )
  );