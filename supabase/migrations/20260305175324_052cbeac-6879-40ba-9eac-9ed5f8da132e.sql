-- Fix: psw_public_directory view uses default SECURITY DEFINER behavior
-- Recreate with security_invoker=on to respect underlying RLS policies
CREATE OR REPLACE VIEW public.psw_public_directory
WITH (security_invoker = on)
AS
SELECT
  id,
  first_name,
  last_name,
  home_city,
  home_lat,
  home_lng,
  languages,
  gender,
  years_experience,
  profile_photo_url,
  certifications,
  vetting_status
FROM public.psw_profiles
WHERE vetting_status = 'approved';