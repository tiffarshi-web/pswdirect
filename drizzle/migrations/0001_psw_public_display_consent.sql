ALTER TABLE public.psw_profiles
  ADD COLUMN IF NOT EXISTS public_display_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_display_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_display_consent_version text,
  ADD COLUMN IF NOT EXISTS public_display_revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_photo_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_summary text,
  ADD COLUMN IF NOT EXISTS public_summary_approved_at timestamptz;

CREATE TABLE IF NOT EXISTS public.psw_public_consent_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psw_id uuid NOT NULL,
  actor_user_id uuid,
  actor_role text NOT NULL,
  action text NOT NULL,
  display_consent boolean,
  photo_consent boolean,
  consent_version text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.psw_public_consent_audit TO authenticated;
GRANT ALL ON public.psw_public_consent_audit TO service_role;
ALTER TABLE public.psw_public_consent_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read consent audit" ON public.psw_public_consent_audit FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "PSWs read own consent audit" ON public.psw_public_consent_audit FOR SELECT TO authenticated USING (psw_id::text = public.current_psw_profile_id());

CREATE OR REPLACE FUNCTION public.block_consent_audit_mutation() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Consent audit entries are immutable'; END; $$;
CREATE TRIGGER trg_block_consent_audit_mutation BEFORE UPDATE OR DELETE ON public.psw_public_consent_audit
  FOR EACH ROW EXECUTE FUNCTION public.block_consent_audit_mutation();

CREATE OR REPLACE FUNCTION public.psw_public_display_eligible(
  p_consent boolean, p_revoked_at timestamptz, p_vetting text, p_lifecycle text,
  p_archived_at timestamptz, p_is_test boolean, p_banned_at timestamptz,
  p_police_check_date date, p_police_expired boolean)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(p_consent, false)
    AND p_revoked_at IS NULL
    AND p_vetting = 'approved'
    AND COALESCE(p_lifecycle, 'active') = 'active'
    AND p_archived_at IS NULL
    AND COALESCE(p_is_test, false) = false
    AND p_banned_at IS NULL
    AND p_police_check_date IS NOT NULL
    AND (p_police_check_date + INTERVAL '1 year') >= CURRENT_DATE
    AND COALESCE(p_police_expired, false) = false;
$$;

CREATE OR REPLACE FUNCTION public.guard_public_consent_columns() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('app.public_consent_rpc', true) = 'on' OR auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.public_display_consent IS DISTINCT FROM OLD.public_display_consent
     OR NEW.public_display_consent_at IS DISTINCT FROM OLD.public_display_consent_at
     OR NEW.public_display_consent_version IS DISTINCT FROM OLD.public_display_consent_version
     OR NEW.public_display_revoked_at IS DISTINCT FROM OLD.public_display_revoked_at
     OR NEW.public_photo_consent IS DISTINCT FROM OLD.public_photo_consent
     OR NEW.public_summary IS DISTINCT FROM OLD.public_summary
     OR NEW.public_summary_approved_at IS DISTINCT FROM OLD.public_summary_approved_at THEN
    RAISE EXCEPTION 'Public display consent can only be changed through the consent workflow';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_guard_public_consent_columns BEFORE UPDATE ON public.psw_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_public_consent_columns();

CREATE OR REPLACE FUNCTION public.set_my_public_display_consent(p_display boolean, p_photo boolean, p_version text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid := NULLIF(public.current_psw_profile_id(), '')::uuid;
BEGIN
  IF v_id IS NULL THEN RAISE EXCEPTION 'Not a caregiver account'; END IF;
  IF p_display AND (p_version IS NULL OR length(btrim(p_version)) = 0) THEN RAISE EXCEPTION 'Consent version required'; END IF;
  PERFORM set_config('app.public_consent_rpc', 'on', true);
  IF p_display THEN
    UPDATE psw_profiles SET public_display_consent = true, public_display_consent_at = now(),
      public_display_consent_version = btrim(p_version), public_display_revoked_at = NULL,
      public_photo_consent = COALESCE(p_photo, false) WHERE id = v_id;
  ELSE
    UPDATE psw_profiles SET public_display_consent = false, public_photo_consent = false,
      public_display_revoked_at = now() WHERE id = v_id;
  END IF;
  PERFORM set_config('app.public_consent_rpc', 'off', true);
  INSERT INTO psw_public_consent_audit(psw_id, actor_user_id, actor_role, action, display_consent, photo_consent, consent_version)
  VALUES (v_id, auth.uid(), 'psw', CASE WHEN p_display THEN 'grant' ELSE 'revoke' END, p_display, CASE WHEN p_display THEN COALESCE(p_photo,false) ELSE false END, p_version);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_revoke_public_display_consent(p_psw_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN RAISE EXCEPTION 'Reason required'; END IF;
  PERFORM set_config('app.public_consent_rpc', 'on', true);
  UPDATE psw_profiles SET public_display_consent = false, public_photo_consent = false,
    public_display_revoked_at = now() WHERE id = p_psw_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caregiver not found'; END IF;
  PERFORM set_config('app.public_consent_rpc', 'off', true);
  INSERT INTO psw_public_consent_audit(psw_id, actor_user_id, actor_role, action, display_consent, photo_consent, reason)
  VALUES (p_psw_id, auth.uid(), 'admin', 'revoke', false, false, btrim(p_reason));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_public_summary(p_psw_id uuid, p_summary text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v text := NULLIF(btrim(COALESCE(p_summary,'')), '');
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF v IS NOT NULL AND (length(v) > 300 OR v ~ '[0-9]{3}[^0-9]?[0-9]{3}[^0-9]?[0-9]{4}' OR v ~ '@') THEN
    RAISE EXCEPTION 'Summary must be under 300 characters with no contact details'; END IF;
  PERFORM set_config('app.public_consent_rpc', 'on', true);
  UPDATE psw_profiles SET public_summary = v, public_summary_approved_at = CASE WHEN v IS NULL THEN NULL ELSE now() END WHERE id = p_psw_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caregiver not found'; END IF;
  PERFORM set_config('app.public_consent_rpc', 'off', true);
  INSERT INTO psw_public_consent_audit(psw_id, actor_user_id, actor_role, action, reason)
  VALUES (p_psw_id, auth.uid(), 'admin', CASE WHEN v IS NULL THEN 'summary_cleared' ELSE 'summary_approved' END, v);
END; $$;

CREATE OR REPLACE FUNCTION public.get_public_psws_by_city(p_city text)
RETURNS TABLE(first_name text, last_initial text, service_city text, languages text[], profile_photo_url text, public_summary text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.first_name, NULLIF(upper(LEFT(btrim(COALESCE(p.last_name,'')),1)),''), p.home_city, p.languages,
    CASE WHEN p.public_photo_consent THEN p.profile_photo_url END,
    CASE WHEN p.public_summary_approved_at IS NOT NULL THEN p.public_summary END
  FROM psw_profiles p
  WHERE lower(btrim(p.home_city)) = lower(btrim(p_city))
    AND public.psw_public_display_eligible(p.public_display_consent, p.public_display_revoked_at, p.vetting_status,
      p.lifecycle_status, p.archived_at, p.is_test, p.banned_at, p.police_check_date, p.expired_due_to_police_check)
  ORDER BY p.public_display_consent_at
  LIMIT 12;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_psws_by_city(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_nearby_psws_public(p_lat numeric, p_lng numeric, p_radius_km numeric DEFAULT 50)
RETURNS TABLE(first_name text, last_initial text, home_city text, languages text[], gender text, years_experience text, profile_photo_url text, distance_km numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.first_name, NULLIF(upper(LEFT(btrim(COALESCE(p.last_name,'')),1)),''), p.home_city, p.languages,
    NULL::text, NULL::text, CASE WHEN p.public_photo_consent THEN p.profile_photo_url END, NULL::numeric
  FROM psw_profiles p
  WHERE public.psw_public_display_eligible(p.public_display_consent, p.public_display_revoked_at, p.vetting_status,
      p.lifecycle_status, p.archived_at, p.is_test, p.banned_at, p.police_check_date, p.expired_due_to_police_check)
    AND p.home_lat IS NOT NULL AND p.home_lng IS NOT NULL
    AND (6371 * acos(LEAST(1, GREATEST(-1, cos(radians(p_lat)) * cos(radians(p.home_lat)) * cos(radians(p.home_lng) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(p.home_lat)))))) <= LEAST(p_radius_km, 200)
  LIMIT 24;
$$;

CREATE OR REPLACE FUNCTION public.get_coverage_inventory_public(p_lat numeric, p_lng numeric, p_radius_km numeric DEFAULT 75)
RETURNS TABLE(has_coverage boolean, nearest_city text, nearest_distance_band_km integer, languages text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH c AS (
    SELECT p.home_city, p.languages,
      6371 * acos(LEAST(1, GREATEST(-1, cos(radians(p_lat)) * cos(radians(p.home_lat)) * cos(radians(p.home_lng) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(p.home_lat))))) AS d
    FROM psw_profiles p
    WHERE p.vetting_status = 'approved' AND COALESCE(p.lifecycle_status, 'active') = 'active'
      AND p.home_lat IS NOT NULL AND p.home_lng IS NOT NULL
      AND (p.police_check_date IS NULL OR (p.police_check_date + INTERVAL '1 year') >= CURRENT_DATE)
  ), w AS (SELECT * FROM c WHERE d <= LEAST(p_radius_km, 1000))
  SELECT EXISTS (SELECT 1 FROM w),
    (SELECT home_city FROM w ORDER BY d LIMIT 1),
    (SELECT (CEIL(MIN(d) / 10.0) * 10)::int FROM w),
    COALESCE((SELECT array_agg(DISTINCT l ORDER BY l) FROM w, unnest(COALESCE(w.languages, '{}')) l), '{}');
$$;
GRANT EXECUTE ON FUNCTION public.get_coverage_inventory_public(numeric, numeric, numeric) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_psw_badge(p_id uuid)
RETURNS TABLE(first_name text, last_initial text, home_city text, is_verified boolean, profile_photo_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.first_name, NULLIF(upper(LEFT(btrim(COALESCE(p.last_name,'')),1)),''), p.home_city,
    (p.vetting_status = 'approved' AND COALESCE(p.lifecycle_status,'active') = 'active' AND p.archived_at IS NULL
      AND p.banned_at IS NULL AND COALESCE(p.is_test,false) = false AND p.police_check_date IS NOT NULL
      AND (p.police_check_date + INTERVAL '1 year') >= CURRENT_DATE),
    p.profile_photo_url
  FROM psw_profiles p WHERE p.id = p_id AND p.vetting_status = 'approved';
$$;
GRANT EXECUTE ON FUNCTION public.verify_psw_badge(uuid) TO anon, authenticated;

CREATE OR REPLACE VIEW public.psw_public_directory WITH (security_invoker = false) AS
SELECT NULL::uuid AS id, p.first_name,
  CASE WHEN p.last_name IS NULL OR length(btrim(p.last_name)) = 0 THEN '' ELSE upper(substr(btrim(p.last_name),1,1)) || '.' END AS last_name,
  p.home_city, NULL::text AS years_experience, p.languages, NULL::text AS gender,
  CASE WHEN p.public_photo_consent THEN p.profile_photo_url END AS profile_photo_url,
  NULL::text AS certifications, NULL::text AS vetting_status, NULL::text AS gov_id_status,
  NULL::text AS psw_cert_status, NULL::text AS hscpoa_number
FROM public.psw_profiles p
WHERE public.psw_public_display_eligible(p.public_display_consent, p.public_display_revoked_at, p.vetting_status,
  p.lifecycle_status, p.archived_at, p.is_test, p.banned_at, p.police_check_date, p.expired_due_to_police_check);
GRANT SELECT ON public.psw_public_directory TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_nearby_psws(numeric, numeric, numeric) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_nearby_psws(numeric, numeric, numeric) TO service_role;
REVOKE EXECUTE ON FUNCTION public.set_my_public_display_consent(boolean, boolean, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_public_display_consent(boolean, boolean, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_public_display_consent(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_public_display_consent(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_public_summary(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_public_summary(uuid, text) TO authenticated;