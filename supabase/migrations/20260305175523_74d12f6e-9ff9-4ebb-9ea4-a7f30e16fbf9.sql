-- Fix psw_public_directory: add security_invoker but also add a permissive anon SELECT policy on psw_profiles for approved PSWs
-- First set security_invoker on the view
DROP VIEW IF EXISTS public.psw_public_directory;
CREATE VIEW public.psw_public_directory
WITH (security_invoker = on)
AS
SELECT
  id,
  first_name,
  last_name,
  home_city,
  languages,
  gender,
  years_experience,
  profile_photo_url,
  certifications,
  vetting_status
FROM public.psw_profiles
WHERE vetting_status = 'approved';

-- Allow anon/public to read approved PSW profiles (limited fields enforced by view)
CREATE POLICY "Public can read approved PSW profiles"
ON public.psw_profiles
FOR SELECT
TO anon, authenticated
USING (vetting_status = 'approved');