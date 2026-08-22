CREATE OR REPLACE FUNCTION public.psw_dispatch_readiness(p_psw_id uuid)
RETURNS TABLE(
  psw_id uuid,
  ready boolean,
  reasons text[],
  vetting_status text,
  lifecycle_status text,
  police_check_date date,
  vsc_status text,
  coverage_radius_km numeric,
  has_home_coords boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    public.is_admin()
    OR p_psw_id = (public.current_psw_profile_id())::uuid
  ) THEN
    RAISE EXCEPTION 'Not authorized to view this caregiver''s readiness'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH p AS (
    SELECT pp.id,
           pp.vetting_status,
           COALESCE(pp.lifecycle_status, 'active') AS lifecycle_status,
           pp.police_check_date,
           pp.coverage_radius_km,
           (pp.home_lat IS NOT NULL AND pp.home_lng IS NOT NULL) AS has_coords,
           COALESCE(pp.is_test, false) AS is_test
    FROM public.psw_profiles pp
    WHERE pp.id = p_psw_id
  ),
  r AS (
    SELECT p.*,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN p.vetting_status IS DISTINCT FROM 'approved' THEN 'not_approved' END,
        CASE WHEN p.lifecycle_status <> 'active' THEN 'lifecycle_' || p.lifecycle_status END,
        CASE WHEN p.police_check_date IS NOT NULL
               AND (p.police_check_date + INTERVAL '1 year') < CURRENT_DATE
             THEN 'police_check_expired' END,
        CASE WHEN NOT p.has_coords THEN 'no_home_coordinates' END,
        CASE WHEN p.is_test THEN 'test_account_isolated' END
      ], NULL) AS reasons
    FROM p
  )
  SELECT r.id,
         COALESCE(array_length(r.reasons, 1), 0) = 0,
         r.reasons,
         r.vetting_status,
         r.lifecycle_status,
         r.police_check_date,
         public.get_vsc_status(r.police_check_date),
         r.coverage_radius_km,
         r.has_coords
  FROM r;
END;
$function$;

REVOKE ALL ON FUNCTION public.psw_dispatch_readiness(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.psw_dispatch_readiness(uuid) TO authenticated, service_role;