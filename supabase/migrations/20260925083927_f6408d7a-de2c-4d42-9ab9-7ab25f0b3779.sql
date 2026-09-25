-- Worker province assignment guard -------------------------------------------
-- Visibility in admin review lists is intentionally broad (handled in the UI).
-- Job ELIGIBILITY is strict and enforced here on the server: a matching
-- psw_profiles.province alone never grants eligibility.

CREATE OR REPLACE FUNCTION public.worker_authorized_in_province(
  p_psw_profile_id uuid,
  p_province text,
  p_provider_type text DEFAULT 'PSW'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.psw_profiles p
    JOIN public.provider_provincial_authorizations a
      ON a.psw_profile_id = p.id
    WHERE p.id = p_psw_profile_id
      AND p.vetting_status = 'approved'
      AND COALESCE(p.lifecycle_status, 'active') = 'active'
      AND COALESCE(p.eligible_for_jobs, true) = true
      AND a.province = upper(COALESCE(NULLIF(btrim(p_province), ''), 'ON'))
      AND a.provider_type = upper(COALESCE(NULLIF(btrim(p_provider_type), ''), 'PSW'))
      AND a.verification_status = 'verified'
      AND a.job_eligible = true
      AND (a.expires_at IS NULL OR a.expires_at >= CURRENT_DATE)
  );
$$;

REVOKE ALL ON FUNCTION public.worker_authorized_in_province(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.worker_authorized_in_province(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_worker_province_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new text;
  v_old text;
  v_psw_id uuid;
  v_province text;
  v_provider_type text;
BEGIN
  v_new := NULLIF(btrim(COALESCE(NEW.psw_assigned, '')), '');

  -- Nothing assigned -> nothing to validate (unassignment always allowed).
  IF v_new IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old := NULLIF(btrim(COALESCE(OLD.psw_assigned, '')), '');
    -- Only validate when the assignment actually changes. Existing orders are
    -- never revalidated, so live Ontario work is not interrupted.
    IF v_old IS NOT DISTINCT FROM v_new THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Test bookings keep their own isolation rules.
  IF COALESCE(NEW.is_test_data, false) = true THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_psw_id := v_new::uuid;
  EXCEPTION WHEN others THEN
    -- Legacy non-uuid identifiers are left alone.
    RETURN NEW;
  END;

  v_province := upper(COALESCE(NULLIF(btrim(NEW.service_province), ''), 'ON'));
  v_provider_type := upper(COALESCE(NULLIF(btrim(NEW.required_provider_type), ''), 'PSW'));

  IF NOT public.worker_authorized_in_province(v_psw_id, v_province, v_provider_type) THEN
    RAISE EXCEPTION
      'worker_not_authorized_in_province: caregiver % is not approved and verified as % in %',
      v_psw_id, v_provider_type, v_province
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_worker_province_assignment_ins ON public.bookings;
CREATE TRIGGER trg_enforce_worker_province_assignment_ins
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_worker_province_assignment();

DROP TRIGGER IF EXISTS trg_enforce_worker_province_assignment_upd ON public.bookings;
CREATE TRIGGER trg_enforce_worker_province_assignment_upd
BEFORE UPDATE OF psw_assigned ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_worker_province_assignment();

-- Admin-facing eligibility lookup for the assignment dialogs ------------------
CREATE OR REPLACE FUNCTION public.admin_assignable_workers(p_booking_id uuid)
RETURNS TABLE(
  psw_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  home_city text,
  home_lat numeric,
  home_lng numeric,
  provider_type text,
  province text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b public.bookings%ROWTYPE;
  v_province text;
  v_provider_type text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_province := upper(COALESCE(NULLIF(btrim(v_b.service_province), ''), 'ON'));
  v_provider_type := upper(COALESCE(NULLIF(btrim(v_b.required_provider_type), ''), 'PSW'));

  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.email, p.phone, p.home_city,
         p.home_lat, p.home_lng, a.provider_type, a.province
  FROM public.psw_profiles p
  JOIN public.provider_provincial_authorizations a
    ON a.psw_profile_id = p.id
   AND a.province = v_province
   AND a.provider_type = v_provider_type
   AND a.verification_status = 'verified'
   AND a.job_eligible = true
   AND (a.expires_at IS NULL OR a.expires_at >= CURRENT_DATE)
  WHERE p.vetting_status = 'approved'
    AND COALESCE(p.lifecycle_status, 'active') = 'active'
    AND COALESCE(p.eligible_for_jobs, true) = true
    AND COALESCE(p.is_test, false) = COALESCE(v_b.is_test_data, false)
  ORDER BY p.first_name, p.last_name;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assignable_workers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assignable_workers(uuid) TO authenticated;