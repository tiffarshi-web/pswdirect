-- Tighten ACL on complete_shift_signout and save_care_sheet_draft
REVOKE ALL ON FUNCTION public.complete_shift_signout(uuid, jsonb, numeric, numeric, numeric, numeric, boolean, boolean, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_shift_signout(uuid, jsonb, numeric, numeric, numeric, numeric, boolean, boolean, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_shift_signout(uuid, jsonb, numeric, numeric, numeric, numeric, boolean, boolean, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_shift_signout(uuid, jsonb, numeric, numeric, numeric, numeric, boolean, boolean, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.save_care_sheet_draft(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_care_sheet_draft(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_care_sheet_draft(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_care_sheet_draft(uuid, jsonb) TO service_role;