CREATE OR REPLACE FUNCTION public.get_nearby_psws_public(p_lat numeric, p_lng numeric, p_radius_km numeric DEFAULT 50)
RETURNS TABLE(first_name text, last_initial text, home_city text, languages text[], gender text, years_experience text, profile_photo_url text, distance_km numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NULL::text, NULL::text, NULL::text, NULL::text[], NULL::text, NULL::text, NULL::text, NULL::numeric
  WHERE FALSE;
$$;
COMMENT ON FUNCTION public.get_nearby_psws_public(numeric, numeric, numeric) IS 'RETIRED: always returns zero rows. Coverage uses get_coverage_inventory_public (aggregate only); caregiver cards use get_public_psws_by_city (explicit public-display consent). No distance or home-location data is public.';