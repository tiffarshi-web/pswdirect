GRANT EXECUTE ON FUNCTION public.psw_eligible_booking_ids(uuid, numeric) TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.eligible_psws_for_booking(uuid, numeric) TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.count_available_jobs_for_psw(uuid, numeric) TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.active_service_radius_km() TO supabase_read_only_user;