
CREATE POLICY "Assigned PSW can update own booking"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  psw_assigned IN (
    SELECT id::text FROM psw_profiles
    WHERE email = (auth.jwt() ->> 'email')
  )
)
WITH CHECK (
  psw_assigned IN (
    SELECT id::text FROM psw_profiles
    WHERE email = (auth.jwt() ->> 'email')
  )
);
