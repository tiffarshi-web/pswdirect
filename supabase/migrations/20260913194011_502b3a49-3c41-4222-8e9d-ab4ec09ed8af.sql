REVOKE ALL ON FUNCTION public.enforce_provincial_registration() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_provincial_registration() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_provincial_registration() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_provincial_registration() TO service_role;