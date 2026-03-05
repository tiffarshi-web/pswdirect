-- Step 1: Drop and recreate psw_public_directory with security_invoker = on
DROP VIEW IF EXISTS public.psw_public_directory;

CREATE VIEW public.psw_public_directory
WITH (security_invoker = on) AS
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

-- Step 2: Grant SELECT to anon and authenticated so the view is queryable
GRANT SELECT ON public.psw_public_directory TO anon, authenticated;

-- Step 3: Add a SELECT policy on psw_profiles for anon users
-- so the security_invoker view can read approved profiles.
-- The view itself limits which columns are exposed.
CREATE POLICY "Anon can read approved PSW profiles for directory"
ON public.psw_profiles
FOR SELECT
TO anon
USING (vetting_status = 'approved');
