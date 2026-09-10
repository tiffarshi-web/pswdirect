REVOKE ALL ON FUNCTION public.has_pending_account_deletion(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_account_deletion_requests_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.block_assignment_when_deletion_pending() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_resolve_account_deletion(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_account_deletion(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_pending_account_deletion(text) TO service_role;