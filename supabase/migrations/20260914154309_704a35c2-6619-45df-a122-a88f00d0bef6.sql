
DO $$
DECLARE
  r record;
  keep_anon text[] := ARRAY[
    'is_admin','has_role','is_approved_psw','is_qa_psw','current_psw_profile_id',
    'active_service_radius_km','dispatch_location_max_age_hours','get_unserved_order_by_token'
  ];
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
           (t.typname = 'trigger') AS is_trigger
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_type t ON t.oid = p.prorettype
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF r.is_trigger THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.args);
    ELSIF NOT (r.proname = ANY(keep_anon)) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', r.proname, r.args);
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.internal_invoke_tokens FROM anon, authenticated;
REVOKE ALL ON TABLE public.psw_safe_booking_view FROM anon;
