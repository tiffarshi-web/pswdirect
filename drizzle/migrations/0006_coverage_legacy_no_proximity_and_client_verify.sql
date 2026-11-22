DROP FUNCTION IF EXISTS public.get_coverage_inventory_public(numeric, numeric, numeric);
CREATE FUNCTION public.get_coverage_inventory_public(p_lat numeric, p_lng numeric, p_radius_km numeric DEFAULT 75)
 RETURNS TABLE(has_coverage boolean, languages text[])
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.has_coverage, c.languages FROM public.get_city_coverage_public(p_lat, p_lng, p_radius_km) c;
$$;
COMMENT ON FUNCTION public.get_coverage_inventory_public(numeric, numeric, numeric) IS 'DEPRECATED: replaced by get_city_coverage_public; kept for the published app. No proximity outputs.';
GRANT EXECUTE ON FUNCTION public.get_coverage_inventory_public(numeric, numeric, numeric) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.verify_client_registration(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.client_profiles WHERE id = p_id);
$$;
GRANT EXECUTE ON FUNCTION public.verify_client_registration(uuid) TO anon, authenticated, service_role;