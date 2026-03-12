DROP VIEW IF EXISTS public.v_psw_coverage_map;

CREATE VIEW public.v_psw_coverage_map
WITH (security_invoker = on) AS
SELECT
  id,
  first_name,
  last_name,
  home_postal_code,
  home_city,
  coverage_radius_km
FROM public.psw_profiles p
WHERE vetting_status = 'approved'
  AND COALESCE(is_test, false) = false
  AND home_lat IS NOT NULL
  AND home_lng IS NOT NULL;