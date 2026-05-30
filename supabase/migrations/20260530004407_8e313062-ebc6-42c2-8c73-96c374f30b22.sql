REVOKE EXECUTE ON FUNCTION public.admin_record_manual_payout(uuid, numeric, timestamp with time zone, payout_method, uuid[], numeric[], text, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_psw_entry_payment_status(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_psw_payout_summary(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_record_manual_payout(uuid, numeric, timestamp with time zone, payout_method, uuid[], numeric[], text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_manual_payout(uuid, numeric, timestamp with time zone, payout_method, uuid[], numeric[], text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_psw_entry_payment_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_psw_entry_payment_status(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_psw_payout_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_psw_payout_summary(uuid) TO service_role;