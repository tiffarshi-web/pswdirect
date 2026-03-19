-- Allow approved PSWs to read pending/unassigned bookings (for Available Jobs feed)
CREATE POLICY "Approved PSWs can view pending unassigned bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND psw_assigned IS NULL
  AND EXISTS (
    SELECT 1 FROM public.psw_profiles p
    WHERE p.email = (auth.jwt() ->> 'email')
      AND p.vetting_status = 'approved'
  )
);

-- Allow PSWs to update bookings they are claiming (pending -> active)
CREATE POLICY "Approved PSWs can claim pending bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  status = 'pending'
  AND psw_assigned IS NULL
  AND EXISTS (
    SELECT 1 FROM public.psw_profiles p
    WHERE p.email = (auth.jwt() ->> 'email')
      AND p.vetting_status = 'approved'
  )
)
WITH CHECK (
  psw_assigned IN (
    SELECT p.id::text FROM public.psw_profiles p
    WHERE p.email = (auth.jwt() ->> 'email')
  )
);