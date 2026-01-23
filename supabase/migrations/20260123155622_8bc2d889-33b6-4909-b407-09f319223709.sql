-- Drop problematic policies that reference auth.users table directly
DROP POLICY IF EXISTS "Clients can create bookings" ON bookings;
DROP POLICY IF EXISTS "Clients can view their own bookings" ON bookings;

-- Create fixed INSERT policy using JWT email extraction
CREATE POLICY "Clients can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    (user_id = auth.uid()) OR 
    (client_email = (auth.jwt() ->> 'email'))
  );

-- Create fixed SELECT policy using JWT email extraction
CREATE POLICY "Clients can view their own bookings"
  ON bookings FOR SELECT
  USING (
    (user_id = auth.uid()) OR 
    (client_email = (auth.jwt() ->> 'email'))
  );