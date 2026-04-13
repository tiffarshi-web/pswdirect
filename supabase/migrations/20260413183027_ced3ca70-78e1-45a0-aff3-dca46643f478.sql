
-- Communication sessions table for future masked calling/messaging
CREATE TABLE public.communication_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  client_email TEXT NOT NULL,
  psw_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.communication_sessions ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage communication sessions"
ON public.communication_sessions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Client can view their own sessions
CREATE POLICY "Clients can view own communication sessions"
ON public.communication_sessions
FOR SELECT
TO authenticated
USING (client_email = (auth.jwt() ->> 'email'));

-- PSW can view their own sessions
CREATE POLICY "PSWs can view own communication sessions"
ON public.communication_sessions
FOR SELECT
TO authenticated
USING (psw_id IN (
  SELECT id::text FROM psw_profiles WHERE email = (auth.jwt() ->> 'email')
));

-- Service/anon can insert (for edge functions)
CREATE POLICY "Service can insert communication sessions"
ON public.communication_sessions
FOR INSERT
TO anon
WITH CHECK (true);

-- Service/anon can update (for edge functions)
CREATE POLICY "Service can update communication sessions"
ON public.communication_sessions
FOR UPDATE
TO anon
USING (true);

-- Index for fast lookups
CREATE INDEX idx_comm_sessions_booking ON public.communication_sessions(booking_id);
CREATE INDEX idx_comm_sessions_client ON public.communication_sessions(client_email);
CREATE INDEX idx_comm_sessions_psw ON public.communication_sessions(psw_id);

-- Trigger for updated_at
CREATE TRIGGER update_communication_sessions_updated_at
BEFORE UPDATE ON public.communication_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
