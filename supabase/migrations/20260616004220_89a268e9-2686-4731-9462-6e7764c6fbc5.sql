
REVOKE EXECUTE ON FUNCTION public.is_own_psw_folder(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_own_psw_folder(text) TO authenticated, service_role;
