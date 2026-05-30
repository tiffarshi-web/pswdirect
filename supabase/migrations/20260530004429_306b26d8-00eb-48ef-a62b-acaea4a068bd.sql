REVOKE EXECUTE ON FUNCTION public.admin_record_manual_payout(uuid, numeric, timestamp with time zone, payout_method, uuid[], numeric[], text, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_psw_entry_payment_status(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_psw_payout_summary(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_record_manual_payout(uuid, numeric, timestamp with time zone, payout_method, uuid[], numeric[], text, text, boolean) TO authenticated, service_role, sandbox_exec, sandbox_exec_pavibobervhqkfzwkotw;
GRANT EXECUTE ON FUNCTION public.get_psw_entry_payment_status(uuid) TO authenticated, service_role, sandbox_exec, sandbox_exec_pavibobervhqkfzwkotw;
GRANT EXECUTE ON FUNCTION public.get_psw_payout_summary(uuid) TO authenticated, service_role, sandbox_exec, sandbox_exec_pavibobervhqkfzwkotw;