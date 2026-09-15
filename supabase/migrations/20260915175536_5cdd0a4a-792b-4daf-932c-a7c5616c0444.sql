-- ============ Phase 8: multi-province foundation (additive) ============

-- 1) Province configuration expansion -------------------------------------
ALTER TABLE public.provinces
  ADD COLUMN IF NOT EXISTS recruitment_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payments_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS launch_status text NOT NULL DEFAULT 'preparation',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Toronto',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS tax_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS pricing_regions text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS support_phone text,
  ADD COLUMN IF NOT EXISTS agreement_version text NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS privacy_policy_version text NOT NULL DEFAULT 'v1';

UPDATE public.provinces SET
  recruitment_enabled = true,
  payments_enabled = true,
  launch_status = 'live',
  timezone = 'America/Toronto',
  tax_config = jsonb_build_object(
    'label', 'HST',
    'home_care_bps', 0,
    'doctor_escort_bps', 1300,
    'hospital_discharge_bps', 1300
  ),
  provider_types = ARRAY['PSW','RPN','RN'],
  pricing_regions = ARRAY['default'],
  support_email = 'barrie@pswdirect.ca',
  support_phone = '(249) 288-4787',
  agreement_version = COALESCE(NULLIF(agreement_version,''), 'on-provider-v1'),
  privacy_policy_version = 'on-privacy-v1'
WHERE code = 'ON';

UPDATE public.provinces SET
  recruitment_enabled = false,
  payments_enabled = false,
  bookings_enabled = false,
  launch_status = 'preparation',
  timezone = 'America/Edmonton',
  tax_config = jsonb_build_object(
    'label', 'GST',
    'home_care_bps', 0,
    'doctor_escort_bps', 500,
    'hospital_discharge_bps', 500
  ),
  provider_types = ARRAY['HCA','LPN','RN'],
  pricing_regions = ARRAY['default'],
  support_email = 'barrie@pswdirect.ca',
  support_phone = '(249) 288-4787',
  agreement_version = 'ab-provider-draft-v0',
  privacy_policy_version = 'ab-privacy-draft-v0'
WHERE code = 'AB';

-- 2) Separate activation permission ---------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'province_admin';

-- 3) Provincial provider authorizations -----------------------------------
CREATE TABLE IF NOT EXISTS public.provider_provincial_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psw_profile_id uuid NOT NULL,
  province text NOT NULL REFERENCES public.provinces(code),
  provider_type text NOT NULL,
  registration_number text,
  verification_status text NOT NULL DEFAULT 'pending',
  expires_at date,
  restrictions text,
  verified_at timestamptz,
  verified_by uuid,
  job_eligible boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (psw_profile_id, province, provider_type)
);

GRANT SELECT ON public.provider_provincial_authorizations TO authenticated;
GRANT ALL ON public.provider_provincial_authorizations TO service_role;
ALTER TABLE public.provider_provincial_authorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage provincial authorizations"
  ON public.provider_provincial_authorizations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Providers read their own authorizations"
  ON public.provider_provincial_authorizations FOR SELECT TO authenticated
  USING (psw_profile_id::text = public.current_psw_profile_id());

CREATE INDEX IF NOT EXISTS idx_ppa_profile ON public.provider_provincial_authorizations (psw_profile_id);
CREATE INDEX IF NOT EXISTS idx_ppa_province ON public.provider_provincial_authorizations (province, job_eligible);

-- 4) Immutable province audit history -------------------------------------
CREATE TABLE IF NOT EXISTS public.province_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province text,
  change_type text NOT NULL,
  target_table text,
  target_id text,
  before_value jsonb,
  after_value jsonb,
  reason text,
  performed_by uuid,
  performed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.province_audit_log TO authenticated;
GRANT ALL ON public.province_audit_log TO service_role;
ALTER TABLE public.province_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read province audit log"
  ON public.province_audit_log FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.block_province_audit_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'province_audit_log is immutable';
END;
$$;
REVOKE ALL ON FUNCTION public.block_province_audit_mutation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_province_audit_immutable ON public.province_audit_log;
CREATE TRIGGER trg_province_audit_immutable
  BEFORE UPDATE OR DELETE ON public.province_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.block_province_audit_mutation();

-- 5) Province review queue for ambiguous records --------------------------
CREATE TABLE IF NOT EXISTS public.province_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_table text NOT NULL,
  record_id text NOT NULL,
  record_label text,
  reason text NOT NULL,
  detected_province text,
  suggested_province text,
  status text NOT NULL DEFAULT 'pending',
  resolved_province text,
  resolved_by uuid,
  resolved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (record_table, record_id)
);

GRANT SELECT, INSERT, UPDATE ON public.province_review_queue TO authenticated;
GRANT ALL ON public.province_review_queue TO service_role;
ALTER TABLE public.province_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage province review queue"
  ON public.province_review_queue FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6) Province policy / agreement documents --------------------------------
CREATE TABLE IF NOT EXISTS public.province_policy_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province text NOT NULL REFERENCES public.provinces(code),
  document_type text NOT NULL,
  version text NOT NULL,
  title text NOT NULL,
  body text,
  is_placeholder boolean NOT NULL DEFAULT true,
  effective_from date,
  active boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (province, document_type, version)
);

GRANT SELECT ON public.province_policy_documents TO authenticated, anon;
GRANT ALL ON public.province_policy_documents TO service_role;
ALTER TABLE public.province_policy_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active policy documents"
  ON public.province_policy_documents FOR SELECT TO authenticated, anon
  USING (active = true);

CREATE POLICY "Admins manage policy documents"
  ON public.province_policy_documents FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.province_policy_documents (province, document_type, version, title, body, is_placeholder, active, effective_from)
VALUES
  ('ON','provider_agreement','on-provider-v1','Ontario Provider Agreement', NULL, false, true, CURRENT_DATE),
  ('ON','client_terms','on-terms-v1','Ontario Client Terms of Service', NULL, false, true, CURRENT_DATE),
  ('ON','privacy_notice','on-privacy-v1','Ontario Privacy Notice', NULL, false, true, CURRENT_DATE),
  ('AB','provider_agreement','ab-provider-draft-v0','Alberta Provider Agreement (PLACEHOLDER — legal review required)','PLACEHOLDER. Not legally reviewed. Do not use for a live Alberta launch.', true, false, NULL),
  ('AB','client_terms','ab-terms-draft-v0','Alberta Client Terms (PLACEHOLDER — legal review required)','PLACEHOLDER. Not legally reviewed.', true, false, NULL),
  ('AB','privacy_notice','ab-privacy-draft-v0','Alberta Privacy Notice (PLACEHOLDER — legal review required)','PLACEHOLDER. Not legally reviewed.', true, false, NULL),
  ('AB','service_policy','ab-service-draft-v0','Alberta Service Policy (PLACEHOLDER — legal review required)','PLACEHOLDER. Not legally reviewed.', true, false, NULL)
ON CONFLICT (province, document_type, version) DO NOTHING;

-- 7) Province codes on remaining records ----------------------------------
ALTER TABLE public.client_profiles  ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE public.booking_groups   ADD COLUMN IF NOT EXISTS service_province text;
ALTER TABLE public.payouts          ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE public.unserved_orders  ADD COLUMN IF NOT EXISTS service_province text;
ALTER TABLE public.bookings         ADD COLUMN IF NOT EXISTS provincial_agreement_version text;

-- 8) Safe Ontario backfill (address/postal must establish Ontario) ---------
CREATE OR REPLACE FUNCTION public.province_from_postal(p_postal text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE upper(left(btrim(coalesce(p_postal,'')), 1))
    WHEN 'A' THEN 'NL' WHEN 'B' THEN 'NS' WHEN 'C' THEN 'PE' WHEN 'E' THEN 'NB'
    WHEN 'G' THEN 'QC' WHEN 'H' THEN 'QC' WHEN 'J' THEN 'QC'
    WHEN 'K' THEN 'ON' WHEN 'L' THEN 'ON' WHEN 'M' THEN 'ON' WHEN 'N' THEN 'ON' WHEN 'P' THEN 'ON'
    WHEN 'R' THEN 'MB' WHEN 'S' THEN 'SK' WHEN 'T' THEN 'AB' WHEN 'V' THEN 'BC'
    WHEN 'X' THEN 'NT' WHEN 'Y' THEN 'YT' ELSE NULL END;
$$;
REVOKE ALL ON FUNCTION public.province_from_postal(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.province_from_postal(text) TO authenticated, service_role;

-- bookings: only where postal code or address text clearly says Ontario
UPDATE public.bookings b SET service_province = 'ON'
WHERE b.service_province IS NULL
  AND (
    public.province_from_postal(b.client_postal_code) = 'ON'
    OR public.province_from_postal(b.patient_postal_code) = 'ON'
    OR public.province_from_postal(b.pickup_postal_code) = 'ON'
    OR b.client_address ILIKE '%, ON %' OR b.client_address ILIKE '%, ON,%'
    OR b.client_address ILIKE '%, Ontario%'
    OR b.patient_address ILIKE '%, Ontario%'
    OR b.pickup_address ILIKE '%, Ontario%'
  );

UPDATE public.bookings b SET provincial_policy_version = 'on-v1'
WHERE b.provincial_policy_version IS NULL AND b.service_province = 'ON';

UPDATE public.bookings b SET provincial_agreement_version = 'on-provider-v1'
WHERE b.provincial_agreement_version IS NULL AND b.service_province = 'ON';

-- caregivers
UPDATE public.psw_profiles p SET province = 'ON'
WHERE p.province IS NULL
  AND (public.province_from_postal(p.home_postal_code) = 'ON'
       OR upper(coalesce(p.home_province,'')) IN ('ON','ONTARIO'));

UPDATE public.client_profiles c SET province = 'ON'
WHERE c.province IS NULL
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.client_email = c.email AND b.service_province = 'ON'
  );

UPDATE public.booking_groups g SET service_province = 'ON'
WHERE g.service_province IS NULL
  AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.booking_group_id = g.id AND b.service_province = 'ON');

UPDATE public.unserved_orders u SET service_province = 'ON'
WHERE u.service_province IS NULL
  AND public.province_from_postal(COALESCE(u.postal_code_raw, u.postal_fsa)) = 'ON';

-- 9) Ambiguous records -> administrator review list -----------------------
INSERT INTO public.province_review_queue (record_table, record_id, record_label, reason, detected_province, suggested_province)
SELECT 'bookings', b.id::text, b.booking_code,
       'Province could not be established from the service address or postal code',
       NULL, NULL
FROM public.bookings b
WHERE b.service_province IS NULL
ON CONFLICT (record_table, record_id) DO NOTHING;

INSERT INTO public.province_review_queue (record_table, record_id, record_label, reason, detected_province, suggested_province)
SELECT 'psw_profiles', p.id::text, p.first_name,
       'Caregiver province could not be established from their address',
       NULL, NULL
FROM public.psw_profiles p
WHERE p.province IS NULL
ON CONFLICT (record_table, record_id) DO NOTHING;

-- 10) Ontario authorizations for existing Ontario caregivers --------------
INSERT INTO public.provider_provincial_authorizations
  (psw_profile_id, province, provider_type, verification_status, job_eligible, verified_at, notes)
SELECT p.id, 'ON', COALESCE(p.provider_type,'PSW'),
       CASE WHEN p.vetting_status = 'approved' THEN 'verified' ELSE 'pending' END,
       (p.vetting_status = 'approved' AND COALESCE(p.eligible_for_jobs, true)),
       CASE WHEN p.vetting_status = 'approved' THEN now() ELSE NULL END,
       'Backfilled from existing Ontario record (Phase 8)'
FROM public.psw_profiles p
WHERE COALESCE(p.province,'ON') = 'ON'
ON CONFLICT (psw_profile_id, province, provider_type) DO NOTHING;

-- 11) Activation permission + guarded activation RPC ----------------------
CREATE OR REPLACE FUNCTION public.can_activate_province()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role::text = 'province_admin'
  );
$$;
REVOKE ALL ON FUNCTION public.can_activate_province() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_activate_province() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_province_activation(
  p_code text,
  p_recruitment boolean,
  p_bookings boolean,
  p_payments boolean,
  p_launch_status text,
  p_reason text
)
RETURNS public.provinces
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_before jsonb;
  v_row public.provinces;
BEGIN
  IF NOT public.is_admin() OR NOT public.can_activate_province() THEN
    RAISE EXCEPTION 'not_authorized_to_activate_province' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF coalesce(btrim(p_reason),'') = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT to_jsonb(p) INTO v_before FROM public.provinces p WHERE p.code = upper(p_code);
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'unknown_province';
  END IF;

  -- payment can never be on while client bookings are off
  IF p_payments AND NOT p_bookings THEN
    RAISE EXCEPTION 'payments_require_bookings';
  END IF;

  UPDATE public.provinces SET
    recruitment_enabled = p_recruitment,
    bookings_enabled = p_bookings,
    payments_enabled = p_payments,
    launch_status = COALESCE(NULLIF(btrim(p_launch_status), ''), launch_status),
    updated_at = now()
  WHERE code = upper(p_code)
  RETURNING * INTO v_row;

  INSERT INTO public.province_audit_log
    (province, change_type, target_table, target_id, before_value, after_value, reason, performed_by, performed_by_email)
  VALUES
    (upper(p_code), 'province_activation', 'provinces', upper(p_code), v_before, to_jsonb(v_row),
     btrim(p_reason), auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()));

  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_province_activation(text, boolean, boolean, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_province_activation(text, boolean, boolean, boolean, text, text) TO authenticated;

-- 12) Admin-only provincial authorization decision RPC --------------------
CREATE OR REPLACE FUNCTION public.admin_set_provincial_authorization(
  p_psw_profile_id uuid,
  p_province text,
  p_provider_type text,
  p_verification_status text,
  p_registration_number text,
  p_expires_at date,
  p_restrictions text,
  p_job_eligible boolean,
  p_reason text
)
RETURNS public.provider_provincial_authorizations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_before jsonb;
  v_row public.provider_provincial_authorizations;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_verification_status NOT IN ('pending','verified','rejected','restricted','expired') THEN
    RAISE EXCEPTION 'invalid_verification_status';
  END IF;

  SELECT to_jsonb(a) INTO v_before
  FROM public.provider_provincial_authorizations a
  WHERE a.psw_profile_id = p_psw_profile_id AND a.province = upper(p_province)
    AND a.provider_type = upper(p_provider_type);

  INSERT INTO public.provider_provincial_authorizations AS a
    (psw_profile_id, province, provider_type, registration_number, verification_status,
     expires_at, restrictions, job_eligible, verified_at, verified_by)
  VALUES
    (p_psw_profile_id, upper(p_province), upper(p_provider_type), p_registration_number,
     p_verification_status, p_expires_at, p_restrictions,
     (p_verification_status = 'verified' AND COALESCE(p_job_eligible, false)),
     CASE WHEN p_verification_status = 'verified' THEN now() ELSE NULL END, auth.uid())
  ON CONFLICT (psw_profile_id, province, provider_type) DO UPDATE SET
    registration_number = EXCLUDED.registration_number,
    verification_status = EXCLUDED.verification_status,
    expires_at = EXCLUDED.expires_at,
    restrictions = EXCLUDED.restrictions,
    job_eligible = EXCLUDED.job_eligible,
    verified_at = EXCLUDED.verified_at,
    verified_by = EXCLUDED.verified_by,
    updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.province_audit_log
    (province, change_type, target_table, target_id, before_value, after_value, reason, performed_by, performed_by_email)
  VALUES
    (upper(p_province), 'provider_authorization', 'provider_provincial_authorizations', v_row.id::text,
     v_before, to_jsonb(v_row), btrim(COALESCE(p_reason,'')), auth.uid(),
     (SELECT email FROM auth.users WHERE id = auth.uid()));

  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_provincial_authorization(uuid, text, text, text, text, date, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_provincial_authorization(uuid, text, text, text, text, date, text, boolean, text) TO authenticated;

-- 13) Administrator review list RPC ---------------------------------------
CREATE OR REPLACE FUNCTION public.admin_province_review_queue()
RETURNS SETOF public.province_review_queue
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.* FROM public.province_review_queue q
  WHERE public.is_admin() AND q.status = 'pending'
  ORDER BY q.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.admin_province_review_queue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_province_review_queue() TO authenticated;

-- 14) updated_at triggers -------------------------------------------------
DROP TRIGGER IF EXISTS trg_ppa_updated ON public.provider_provincial_authorizations;
CREATE TRIGGER trg_ppa_updated BEFORE UPDATE ON public.provider_provincial_authorizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_prq_updated ON public.province_review_queue;
CREATE TRIGGER trg_prq_updated BEFORE UPDATE ON public.province_review_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ppd_updated ON public.province_policy_documents;
CREATE TRIGGER trg_ppd_updated BEFORE UPDATE ON public.province_policy_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();