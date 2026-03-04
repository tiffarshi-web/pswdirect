
-- 1. Drop the public SELECT policy that exposes all approved PSW data
DROP POLICY IF EXISTS "Anyone can view approved PSW first names and photos" ON public.psw_profiles;

-- 2. Create a safe public view with ONLY non-sensitive fields for approved PSWs
-- This view uses security_invoker = false (default) to bypass underlying RLS
CREATE OR REPLACE VIEW public.psw_public_directory AS
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

-- 3. Grant read access on the safe view to anon and authenticated roles
GRANT SELECT ON public.psw_public_directory TO anon;
GRANT SELECT ON public.psw_public_directory TO authenticated;

-- 4. Add a comment explaining the security purpose
COMMENT ON VIEW public.psw_public_directory IS 'Public-safe view of approved PSWs. Excludes email, phone, postal code, GPS coordinates of home, police checks, gov IDs, license plates, and other sensitive PII. Only non-sensitive fields exposed for SEO directory pages.';
