ALTER VIEW public.psw_public_directory SET (security_invoker = off);
GRANT SELECT ON public.psw_public_directory TO anon, authenticated;
GRANT SELECT ON public.psw_public_directory TO service_role;