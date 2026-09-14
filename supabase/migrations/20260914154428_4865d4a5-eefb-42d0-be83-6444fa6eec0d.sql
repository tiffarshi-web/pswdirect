
-- 1. Block direct client-side booking inserts (bookings must come from the server checkout)
CREATE OR REPLACE FUNCTION public.guard_client_booking_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trusted text;
BEGIN
  BEGIN
    v_trusted := current_setting('app.trusted_rpc', true);
  EXCEPTION WHEN OTHERS THEN
    v_trusted := NULL;
  END;

  IF v_trusted = 'on' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;       -- service role / server context
  IF public.is_admin() THEN RETURN NEW; END IF;

  RAISE EXCEPTION 'Bookings must be created through the secure server checkout'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_client_booking_insert ON public.bookings;
CREATE TRIGGER trg_guard_client_booking_insert
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.guard_client_booking_insert();

-- 2. Force admin-controlled caregiver fields to safe values on self sign-up
CREATE OR REPLACE FUNCTION public.guard_psw_self_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trusted text;
BEGIN
  BEGIN
    v_trusted := current_setting('app.trusted_rpc', true);
  EXCEPTION WHEN OTHERS THEN
    v_trusted := NULL;
  END;

  IF v_trusted = 'on' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_admin() OR public.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;

  NEW.vetting_status   := 'pending';
  NEW.vetting_notes    := NULL;
  NEW.approved_at      := NULL;
  NEW.banned_at        := NULL;
  NEW.gov_id_status    := 'pending';
  NEW.psw_cert_status  := 'pending';
  NEW.psw_number       := NULL;
  NEW.flag_count       := 0;
  NEW.cancel_count     := 0;
  NEW.rejection_reasons := NULL;
  NEW.is_test          := false;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_psw_self_insert ON public.psw_profiles;
CREATE TRIGGER trg_guard_psw_self_insert
BEFORE INSERT ON public.psw_profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_psw_self_insert();

-- 3. Internal / scheduled-job helpers: server side only
DO $$
DECLARE
  r record;
  internal text[] := ARRAY[
    '_dispatch_location_internal','_eligible_booking_ids_internal','_invoke_edge_function',
    'alert_admins_on_stale_incomplete_payments','auto_expire_vsc_psws','cleanup_push_delivery_logs',
    'delete_psw_cascade','get_expiring_vsc_psws','nextval_psw_number','send_vsc_expiry_warnings',
    'suspend_expired_provincial_registrations','upsert_payroll_entry_for_booking',
    'retry_failed_assignment_emails','expiring_provincial_registrations','eligible_psws_for_booking',
    'log_claim_attempt','guard_client_booking_insert','guard_psw_self_insert'
  ];
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY(internal)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', r.proname, r.args);
  END LOOP;
END $$;
