-- Create location_logs table for GPS tracking
CREATE TABLE public.location_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  psw_id UUID NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_location_logs_booking_id ON public.location_logs(booking_id);
CREATE INDEX idx_location_logs_psw_id ON public.location_logs(psw_id);
CREATE INDEX idx_location_logs_created_at ON public.location_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.location_logs ENABLE ROW LEVEL SECURITY;

-- PSWs can insert their own locations (match by email from JWT to psw_profiles)
CREATE POLICY "PSWs can insert their own locations"
ON public.location_logs
FOR INSERT
WITH CHECK (
  psw_id IN (
    SELECT id FROM public.psw_profiles 
    WHERE email = (auth.jwt() ->> 'email')
  )
);

-- Clients can read locations for their bookings (by email match)
CREATE POLICY "Clients can read locations for their bookings"
ON public.location_logs
FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM public.bookings 
    WHERE client_email = (auth.jwt() ->> 'email')
  )
);

-- PSWs can read their own locations
CREATE POLICY "PSWs can read their own locations"
ON public.location_logs
FOR SELECT
USING (
  psw_id IN (
    SELECT id FROM public.psw_profiles 
    WHERE email = (auth.jwt() ->> 'email')
  )
);

-- Admins can read all locations
CREATE POLICY "Admins can read all locations"
ON public.location_logs
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Enable realtime for location updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_logs;