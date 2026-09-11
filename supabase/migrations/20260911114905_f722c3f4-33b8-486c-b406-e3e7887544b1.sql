CREATE OR REPLACE FUNCTION public.worker_push_tokens_for_emails(_emails text[])
RETURNS TABLE (email text, token text, platform text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(u.email), t.token, t.platform
  FROM public.worker_push_tokens t
  JOIN auth.users u ON u.id = t.user_id
  WHERE lower(u.email) = ANY (SELECT lower(e) FROM unnest(_emails) AS e)
$$;

REVOKE ALL ON FUNCTION public.worker_push_tokens_for_emails(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.worker_push_tokens_for_emails(text[]) TO service_role;