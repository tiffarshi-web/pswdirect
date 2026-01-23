-- Allow updates to bookings for completion (status, care sheet, PSW assignment)
CREATE POLICY "Allow booking updates for completion"
ON public.bookings FOR UPDATE
USING (true)
WITH CHECK (true);