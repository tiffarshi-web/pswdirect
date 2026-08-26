REVOKE EXECUTE ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text, text) TO service_role;