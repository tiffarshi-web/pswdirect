-- Make the view use invoker security (safer for public directory)
ALTER VIEW public.psw_public_directory SET (security_invoker = on);