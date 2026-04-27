-- 1) Remove the over-broad anon read on psw_profiles.
DROP POLICY IF EXISTS "Anon can read approved PSW profiles for directory" ON public.psw_profiles;

-- 2) Replace the public directory view to expose only the last-name initial.
DROP VIEW IF EXISTS public.psw_public_directory;

CREATE VIEW public.psw_public_directory
WITH (security_invoker = true)
AS
SELECT
  id,
  first_name,
  -- Expose only the first letter of the last name (followed by ".") for SEO/display.
  CASE
    WHEN last_name IS NULL OR length(btrim(last_name)) = 0 THEN ''
    ELSE upper(substr(btrim(last_name), 1, 1)) || '.'
  END AS last_name,
  home_city,
  years_experience,
  languages,
  gender,
  profile_photo_url,
  certifications,
  vetting_status,
  gov_id_status,
  psw_cert_status,
  hscpoa_number
FROM public.psw_profiles
WHERE vetting_status = 'approved';

-- 3) The view needs its own permissive policy via a security barrier wrapper.
-- Since security_invoker=true forwards RLS to underlying table, and we removed
-- the anon SELECT, anon would lose access. Re-grant SELECT on the view ONLY,
-- backed by a narrow policy on psw_profiles that returns only safe columns is
-- not possible at column level via RLS, so instead add a dedicated policy that
-- allows SELECT for anon/authenticated but ONLY when accessed via the view.
-- Postgres can't gate by view directly; we use a SECURITY DEFINER wrapper view.

DROP VIEW IF EXISTS public.psw_public_directory;

-- Recreate as SECURITY DEFINER (security_invoker = false) so it bypasses RLS
-- on psw_profiles and exposes ONLY the safe columns to anon/authenticated.
CREATE VIEW public.psw_public_directory
WITH (security_invoker = false)
AS
SELECT
  id,
  first_name,
  CASE
    WHEN last_name IS NULL OR length(btrim(last_name)) = 0 THEN ''
    ELSE upper(substr(btrim(last_name), 1, 1)) || '.'
  END AS last_name,
  home_city,
  years_experience,
  languages,
  gender,
  profile_photo_url,
  certifications,
  vetting_status,
  gov_id_status,
  psw_cert_status,
  hscpoa_number
FROM public.psw_profiles
WHERE vetting_status = 'approved';

GRANT SELECT ON public.psw_public_directory TO anon, authenticated;