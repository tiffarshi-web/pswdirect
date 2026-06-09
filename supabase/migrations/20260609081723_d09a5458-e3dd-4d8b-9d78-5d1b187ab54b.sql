
-- Seed geofence threshold defaults in app_settings (idempotent)
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES
  ('checkin_radius_m', '1000'),
  ('transport_checkin_radius_m', '500'),
  ('signout_radius_m', '2000')
ON CONFLICT (setting_key) DO NOTHING;

-- Table to log PSW requests for admin override on sign-in/out failures
CREATE TABLE IF NOT EXISTS public.admin_override_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID,
  psw_id UUID,
  request_type TEXT NOT NULL CHECK (request_type IN ('check_in','sign_out')),
  reason TEXT,
  failure_code TEXT,
  distance_m NUMERIC,
  threshold_m NUMERIC,
  accuracy_m NUMERIC,
  psw_lat NUMERIC,
  psw_lng NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.admin_override_requests TO authenticated;
GRANT ALL ON public.admin_override_requests TO service_role;

ALTER TABLE public.admin_override_requests ENABLE ROW LEVEL SECURITY;

-- PSWs can create their own override requests
CREATE POLICY "PSWs insert own override requests"
ON public.admin_override_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = psw_id);

-- PSWs can view their own override requests
CREATE POLICY "PSWs view own override requests"
ON public.admin_override_requests
FOR SELECT
TO authenticated
USING (auth.uid() = psw_id OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can update / manage
CREATE POLICY "Admins manage override requests"
ON public.admin_override_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_admin_override_requests_status
  ON public.admin_override_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_override_requests_booking
  ON public.admin_override_requests (booking_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_admin_override_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_admin_override_requests ON public.admin_override_requests;
CREATE TRIGGER trg_touch_admin_override_requests
BEFORE UPDATE ON public.admin_override_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_admin_override_requests();
