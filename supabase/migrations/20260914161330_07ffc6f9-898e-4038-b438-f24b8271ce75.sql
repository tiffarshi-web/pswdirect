-- Privacy-safe public caregiver-availability lookup.
-- The full get_nearby_psws (last name + exact home coordinates) stays
-- restricted to authenticated/service_role. Public pages and the sitemap
-- generator use this masked variant: no surname, no exact coordinates.
CREATE OR REPLACE FUNCTION public.get_nearby_psws_public(
  p_lat numeric,
  p_lng numeric,
  p_radius_km numeric DEFAULT 50
)
RETURNS TABLE(
  first_name text,
  last_initial text,
  home_city text,
  languages text[],
  gender text,
  years_experience text,
  profile_photo_url text,
  distance_km numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.first_name,
    NULLIF(LEFT(COALESCE(p.last_name, ''), 1), '') AS last_initial,
    p.home_city,
    p.languages,
    p.gender,
    p.years_experience,
    p.profile_photo_url,
    ROUND(
      (6371 * acos(
        LEAST(1, GREATEST(-1,
          cos(radians(p_lat)) * cos(radians(p.home_lat)) *
          cos(radians(p.home_lng) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(p.home_lat))
        ))
      ))::numeric, 1
    ) AS distance_km
  FROM public.psw_profiles p
  WHERE p.vetting_status = 'approved'
    AND COALESCE(p.lifecycle_status, 'active') = 'active'
    AND p.home_lat IS NOT NULL
    AND p.home_lng IS NOT NULL
    AND (
      p.police_check_date IS NULL
      OR (p.police_check_date + INTERVAL '1 year') >= CURRENT_DATE
    )
    AND (
      6371 * acos(
        LEAST(1, GREATEST(-1,
          cos(radians(p_lat)) * cos(radians(p.home_lat)) *
          cos(radians(p.home_lng) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(p.home_lat))
        ))
      )
    ) <= p_radius_km;
$function$;

REVOKE ALL ON FUNCTION public.get_nearby_psws_public(numeric, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_nearby_psws_public(numeric, numeric, numeric) TO anon, authenticated, service_role;

-- Aggregate count is non-identifying; public coverage checks need it.
GRANT EXECUTE ON FUNCTION public.count_nearby_psws(numeric, numeric, numeric) TO anon;