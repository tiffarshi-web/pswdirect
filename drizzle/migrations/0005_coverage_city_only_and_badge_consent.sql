CREATE OR REPLACE FUNCTION public.psw_coverage_eligible_row(p public.psw_profiles)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT p.vetting_status = 'approved' AND COALESCE(p.lifecycle_status,'active') = 'active'
    AND p.archived_at IS NULL AND p.banned_at IS NULL AND COALESCE(p.is_test,false) = false
    AND COALESCE(p.email,'') NOT ILIKE '%@test.com'
    AND p.police_check_date IS NOT NULL AND (p.police_check_date + INTERVAL '1 year') >= CURRENT_DATE
    AND COALESCE(p.expired_due_to_police_check,false) = false
$$;

CREATE OR REPLACE FUNCTION public.get_city_coverage_public(p_lat numeric, p_lng numeric, p_radius_km numeric DEFAULT 75)
RETURNS TABLE(has_coverage boolean, languages text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH w AS (
    SELECT p.languages FROM psw_profiles p
    WHERE public.psw_coverage_eligible_row(p) AND p.home_lat IS NOT NULL AND p.home_lng IS NOT NULL
      AND 6371 * acos(LEAST(1, GREATEST(-1, cos(radians(p_lat)) * cos(radians(p.home_lat)) * cos(radians(p.home_lng) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(p.home_lat))))) <= LEAST(p_radius_km, 1000)
  )
  SELECT EXISTS (SELECT 1 FROM w),
    COALESCE((SELECT array_agg(DISTINCT l ORDER BY l) FROM w, unnest(COALESCE(w.languages,'{}')) l), '{}');
$$;
GRANT EXECUTE ON FUNCTION public.get_city_coverage_public(numeric, numeric, numeric) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_coverage_inventory_public(p_lat numeric, p_lng numeric, p_radius_km numeric DEFAULT 75)
 RETURNS TABLE(has_coverage boolean, nearest_city text, nearest_distance_band_km integer, languages text[])
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.has_coverage, NULL::text, NULL::int, c.languages FROM public.get_city_coverage_public(p_lat, p_lng, p_radius_km) c;
$$;
COMMENT ON FUNCTION public.get_coverage_inventory_public(numeric, numeric, numeric) IS 'DEPRECATED: replaced by get_city_coverage_public. Kept only for the currently published app; nearest_city and nearest_distance_band_km are always NULL.';

CREATE OR REPLACE FUNCTION public.verify_psw_badge(p_id uuid)
 RETURNS TABLE(first_name text, last_initial text, home_city text, is_verified boolean, profile_photo_url text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    CASE WHEN e.ok THEN p.first_name END,
    CASE WHEN e.ok THEN NULLIF(upper(LEFT(btrim(COALESCE(p.last_name,'')),1)),'') END,
    CASE WHEN e.ok THEN p.home_city END,
    public.psw_coverage_eligible_row(p),
    CASE WHEN e.ok AND p.public_photo_consent THEN p.profile_photo_url END
  FROM psw_profiles p
  CROSS JOIN LATERAL (SELECT public.psw_public_display_eligible(p.public_display_consent, p.public_display_revoked_at, p.vetting_status,
      p.lifecycle_status, p.archived_at, p.is_test, p.banned_at, p.police_check_date, p.expired_due_to_police_check) AS ok) e
  WHERE p.id = p_id;
$$;