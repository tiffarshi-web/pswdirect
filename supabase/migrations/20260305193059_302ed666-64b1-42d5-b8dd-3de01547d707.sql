-- 1. Drop the overly broad public SELECT policy on psw_profiles
DROP POLICY IF EXISTS "Public can read approved PSW profiles" ON public.psw_profiles;

-- 2. Recreate psw_public_directory view with ONLY non-sensitive fields
DROP VIEW IF EXISTS public.psw_public_directory;
CREATE VIEW public.psw_public_directory
WITH (security_invoker = false)
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

-- 3. Grant SELECT on the view to anon and authenticated
GRANT SELECT ON public.psw_public_directory TO anon, authenticated;