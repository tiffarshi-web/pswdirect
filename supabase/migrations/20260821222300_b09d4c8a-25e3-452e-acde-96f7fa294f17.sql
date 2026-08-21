
REVOKE EXECUTE ON FUNCTION public.retry_failed_assignment_emails() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bump_psw_assignment_version() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.touch_psw_assignment_email_log() FROM anon, authenticated, public;
