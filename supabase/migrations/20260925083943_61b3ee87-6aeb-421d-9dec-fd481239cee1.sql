REVOKE ALL ON FUNCTION public.enforce_worker_province_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.worker_authorized_in_province(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.worker_authorized_in_province(uuid, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.admin_assignable_workers(uuid) FROM PUBLIC, anon;