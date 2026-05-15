-- Add sign-out telemetry columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS sign_out_lat numeric,
  ADD COLUMN IF NOT EXISTS sign_out_lng numeric,
  ADD COLUMN IF NOT EXISTS sign_out_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS sign_out_distance_m numeric,
  ADD COLUMN IF NOT EXISTS sign_out_outside_radius boolean NOT NULL DEFAULT false;

-- Sign-out attempt log (success + failure)
CREATE TABLE IF NOT EXISTS public.sign_out_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid,
  booking_code text,
  psw_id text,
  psw_name text,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  error_code text,
  error_message text,
  latitude numeric,
  longitude numeric,
  accuracy_m numeric,
  distance_m numeric,
  outside_radius boolean NOT NULL DEFAULT false,
  user_agent text,
  network_online boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sign_out_attempts_booking ON public.sign_out_attempts(booking_id);
CREATE INDEX IF NOT EXISTS idx_sign_out_attempts_psw ON public.sign_out_attempts(psw_id);
CREATE INDEX IF NOT EXISTS idx_sign_out_attempts_failed ON public.sign_out_attempts(success, attempted_at DESC);

ALTER TABLE public.sign_out_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sign-out attempts"
  ON public.sign_out_attempts
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "PSWs can insert own sign-out attempts"
  ON public.sign_out_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    psw_id IN (
      SELECT (p.id)::text FROM public.psw_profiles p
      WHERE p.email = (auth.jwt() ->> 'email'::text)
    )
  );

CREATE POLICY "PSWs can view own sign-out attempts"
  ON public.sign_out_attempts
  FOR SELECT
  TO authenticated
  USING (
    psw_id IN (
      SELECT (p.id)::text FROM public.psw_profiles p
      WHERE p.email = (auth.jwt() ->> 'email'::text)
    )
  );
