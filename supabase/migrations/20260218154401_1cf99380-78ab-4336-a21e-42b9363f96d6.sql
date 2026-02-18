
-- Add new columns to psw_profiles (idempotent with IF NOT EXISTS)
ALTER TABLE public.psw_profiles ADD COLUMN IF NOT EXISTS home_lat numeric;
ALTER TABLE public.psw_profiles ADD COLUMN IF NOT EXISTS home_lng numeric;
ALTER TABLE public.psw_profiles ADD COLUMN IF NOT EXISTS coverage_radius_km numeric DEFAULT 25;
ALTER TABLE public.psw_profiles ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false;

-- Create coverage map view
CREATE OR REPLACE VIEW public.v_psw_coverage_map
WITH (security_invoker = on)
AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.home_postal_code,
  p.home_city,
  p.home_lat,
  p.home_lng,
  p.coverage_radius_km
FROM public.psw_profiles p
WHERE p.vetting_status = 'approved'
  AND COALESCE(p.is_test, false) = false
  AND p.home_lat IS NOT NULL
  AND p.home_lng IS NOT NULL;
