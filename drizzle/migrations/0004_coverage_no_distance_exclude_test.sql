CREATE OR REPLACE FUNCTION public.get_coverage_inventory_public(p_lat numeric, p_lng numeric, p_radius_km numeric DEFAULT 75)
 RETURNS TABLE(has_coverage boolean, nearest_city text, nearest_distance_band_km integer, languages text[])
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH c AS (
    SELECT p.home_city, p.languages,
      6371 * acos(LEAST(1, GREATEST(-1, cos(radians(p_lat)) * cos(radians(p.home_lat)) * cos(radians(p.home_lng) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(p.home_lat))))) AS d
    FROM psw_profiles p
    WHERE p.vetting_status = 'approved' AND COALESCE(p.lifecycle_status, 'active') = 'active'
      AND p.archived_at IS NULL AND p.banned_at IS NULL
      AND COALESCE(p.is_test, false) = false
      AND COALESCE(p.email, '') NOT ILIKE '%@test.com'
      AND p.home_lat IS NOT NULL AND p.home_lng IS NOT NULL
      AND (p.police_check_date IS NULL OR (p.police_check_date + INTERVAL '1 year') >= CURRENT_DATE)
  ), w AS (SELECT * FROM c WHERE d <= LEAST(p_radius_km, 1000))
  SELECT EXISTS (SELECT 1 FROM w),
    (SELECT home_city FROM w ORDER BY d LIMIT 1),
    NULL::int,
    COALESCE((SELECT array_agg(DISTINCT l ORDER BY l) FROM w, unnest(COALESCE(w.languages, '{}')) l), '{}');
$function$;
COMMENT ON FUNCTION public.get_coverage_inventory_public(numeric, numeric, numeric) IS 'Aggregate only. nearest_distance_band_km is DEPRECATED and always NULL: no distance is exposed publicly.';
REVOKE EXECUTE ON FUNCTION public.get_nearby_psws_public(numeric, numeric, numeric) FROM anon, authenticated, PUBLIC;