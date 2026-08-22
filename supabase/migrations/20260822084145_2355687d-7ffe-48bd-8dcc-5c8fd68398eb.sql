-- ============================================================
-- 1. Readiness function: single explainable source of truth for
--    "why is this caregiver not receiving job alerts?"
-- ============================================================
CREATE OR REPLACE FUNCTION public.psw_dispatch_readiness(p_psw_id uuid)
RETURNS TABLE(
  psw_id uuid,
  ready boolean,
  reasons text[],
  vetting_status text,
  lifecycle_status text,
  police_check_date date,
  vsc_status text,
  coverage_radius_km numeric,
  has_home_coords boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH p AS (
    SELECT pp.id,
           pp.vetting_status,
           COALESCE(pp.lifecycle_status, 'active') AS lifecycle_status,
           pp.police_check_date,
           pp.coverage_radius_km,
           (pp.home_lat IS NOT NULL AND pp.home_lng IS NOT NULL) AS has_coords,
           COALESCE(pp.is_test, false) AS is_test
    FROM public.psw_profiles pp
    WHERE pp.id = p_psw_id
  ),
  r AS (
    SELECT p.*,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN p.vetting_status IS DISTINCT FROM 'approved' THEN 'not_approved' END,
        CASE WHEN p.lifecycle_status <> 'active' THEN 'lifecycle_' || p.lifecycle_status END,
        CASE WHEN p.police_check_date IS NOT NULL
               AND (p.police_check_date + INTERVAL '1 year') < CURRENT_DATE
             THEN 'police_check_expired' END,
        CASE WHEN NOT p.has_coords THEN 'no_home_coordinates' END,
        CASE WHEN p.is_test THEN 'test_account_isolated' END
      ], NULL) AS reasons
    FROM p
  )
  SELECT r.id,
         COALESCE(array_length(r.reasons, 1), 0) = 0,
         r.reasons,
         r.vetting_status,
         r.lifecycle_status,
         r.police_check_date,
         public.get_vsc_status(r.police_check_date),
         r.coverage_radius_km,
         r.has_coords
  FROM r;
$function$;

REVOKE ALL ON FUNCTION public.psw_dispatch_readiness(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.psw_dispatch_readiness(uuid) TO authenticated, service_role;

-- Self-service variant: a caregiver can only ever see their own readiness.
CREATE OR REPLACE FUNCTION public.my_dispatch_readiness()
RETURNS TABLE(
  psw_id uuid,
  ready boolean,
  reasons text[],
  vetting_status text,
  lifecycle_status text,
  police_check_date date,
  vsc_status text,
  coverage_radius_km numeric,
  has_home_coords boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT * FROM public.psw_dispatch_readiness((public.current_psw_profile_id())::uuid);
$function$;

REVOKE ALL ON FUNCTION public.my_dispatch_readiness() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_dispatch_readiness() TO authenticated, service_role;

-- ============================================================
-- 2. Break the approve/auto-expire flip-flop loop.
--    An expired Police Check can never be re-approved silently.
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_approval_requires_valid_vsc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.vetting_status = 'approved'
     AND COALESCE(OLD.vetting_status, '') IS DISTINCT FROM 'approved'
     AND NEW.police_check_date IS NOT NULL
     AND (NEW.police_check_date + INTERVAL '1 year') < CURRENT_DATE
  THEN
    RAISE EXCEPTION
      'Cannot approve %: their Police Check (VSC) dated % expired on %. Upload and record a current VSC first.',
      COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.email),
      to_char(NEW.police_check_date, 'YYYY-MM-DD'),
      to_char(NEW.police_check_date + INTERVAL '1 year', 'YYYY-MM-DD')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_approval_requires_valid_vsc ON public.psw_profiles;
CREATE TRIGGER trg_guard_approval_requires_valid_vsc
  BEFORE UPDATE ON public.psw_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_approval_requires_valid_vsc();

-- ============================================================
-- 3. Stop duplicate daily "VSC expired" notification spam.
--    Only act on caregivers not already flagged as expired.
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_expire_vsc_psws()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  v_psw record;
BEGIN
  FOR v_psw IN
    SELECT id, first_name, last_name, email, police_check_date
    FROM public.psw_profiles
    WHERE vetting_status = 'approved'
      AND police_check_date IS NOT NULL
      AND (police_check_date + INTERVAL '1 year') < CURRENT_DATE
      AND COALESCE(expired_due_to_police_check, false) = false
  LOOP
    UPDATE public.psw_profiles
    SET vetting_status = 'pending',
        vetting_notes = COALESCE(vetting_notes || E'\n', '') ||
          '[AUTO] VSC expired on ' || to_char(v_psw.police_check_date + INTERVAL '1 year', 'YYYY-MM-DD') ||
          '. PSW must upload a new VSC.',
        vetting_updated_at = now(),
        expired_due_to_police_check = true,
        approved_at = NULL,
        updated_at = now()
    WHERE id = v_psw.id;

    INSERT INTO public.psw_status_audit (psw_id, psw_name, psw_email, action, reason, performed_by)
    VALUES (
      v_psw.id,
      v_psw.first_name || ' ' || v_psw.last_name,
      v_psw.email,
      'vsc_auto_expired',
      'VSC expired (issued ' || to_char(v_psw.police_check_date, 'YYYY-MM-DD') ||
        ', expired ' || to_char(v_psw.police_check_date + INTERVAL '1 year', 'YYYY-MM-DD') || ')',
      'system'
    );

    INSERT INTO public.notifications (user_email, title, body, type)
    VALUES (
      v_psw.email,
      '⚠️ VSC Expired – Action Required',
      'Your Vulnerable Sector Check has expired. Please upload a new VSC to continue receiving shifts.',
      'vsc_expired'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;