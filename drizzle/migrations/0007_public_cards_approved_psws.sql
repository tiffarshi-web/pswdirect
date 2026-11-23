CREATE OR REPLACE FUNCTION public.get_public_psws_by_city(p_city text)
 RETURNS TABLE(first_name text, last_initial text, service_city text, languages text[], profile_photo_url text, public_summary text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.first_name, NULL::text, p.home_city, p.languages, p.profile_photo_url,
    CASE WHEN p.public_summary_approved_at IS NOT NULL THEN p.public_summary END
  FROM psw_profiles p
  WHERE lower(btrim(p.home_city)) = lower(btrim(p_city))
    AND public.psw_public_display_eligible(true, p.public_display_revoked_at, p.vetting_status,
      p.lifecycle_status, p.archived_at, p.is_test, p.banned_at, p.police_check_date, p.expired_due_to_police_check)
  ORDER BY p.first_name
  LIMIT 12;
$function$;