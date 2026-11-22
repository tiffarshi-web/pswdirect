CREATE OR REPLACE FUNCTION public.get_nearby_psws_public(p_lat numeric, p_lng numeric, p_radius_km numeric DEFAULT 50)
RETURNS TABLE(first_name text, last_initial text, home_city text, languages text[], gender text, years_experience text, profile_photo_url text, distance_km numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH c AS (
    SELECT p.home_city, p.languages,
      6371 * acos(LEAST(1, GREATEST(-1, cos(radians(p_lat)) * cos(radians(p.home_lat)) * cos(radians(p.home_lng) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(p.home_lat))))) AS d
    FROM psw_profiles p
    WHERE p.vetting_status = 'approved' AND COALESCE(p.lifecycle_status, 'active') = 'active'
      AND p.home_lat IS NOT NULL AND p.home_lng IS NOT NULL
      AND (p.police_check_date IS NULL OR (p.police_check_date + INTERVAL '1 year') >= CURRENT_DATE)
  )
  SELECT NULL::text, NULL::text, home_city, languages, NULL::text, NULL::text, NULL::text,
    (CEIL(d / 10.0) * 10)::numeric
  FROM c WHERE d <= LEAST(p_radius_km, 1000);
$$;
COMMENT ON FUNCTION public.get_nearby_psws_public(numeric, numeric, numeric) IS 'DEPRECATED: anonymous transitional coverage rows for the previously published client. Use get_coverage_inventory_public (coverage) or get_public_psws_by_city (consented cards).';