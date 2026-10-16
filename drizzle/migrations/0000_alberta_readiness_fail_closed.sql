
-- 1. Checklist evidence columns
ALTER TABLE public.province_activation_checklist
  ADD COLUMN IF NOT EXISTS evidence text,
  ADD COLUMN IF NOT EXISTS auto_verified boolean NOT NULL DEFAULT false;

-- 2. Provider registration evidence columns
ALTER TABLE public.provider_provincial_authorizations
  ADD COLUMN IF NOT EXISTS registration_body text,
  ADD COLUMN IF NOT EXISTS permit_number text,
  ADD COLUMN IF NOT EXISTS evidence_reference text,
  ADD COLUMN IF NOT EXISTS evidence_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS evidence_checked_by uuid;

-- 3. Live evidence for each checklist item. NULL auto_ok = needs a written human record.
CREATE OR REPLACE FUNCTION public.province_readiness_evidence(p_code text)
RETURNS TABLE(item_key text, auto_ok boolean, detail text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_code text := upper(p_code);
  v_prov public.provinces;
  v_missing_rates text;
  v_docs_ok boolean;
  v_priv_ok boolean;
  v_tax_ok boolean;
  v_prices_ok boolean;
  v_providers int;
  v_tests int;
BEGIN
  SELECT * INTO v_prov FROM public.provinces WHERE code = v_code;

  SELECT bool_and(EXISTS (SELECT 1 FROM public.province_policy_documents d
      WHERE d.province = v_code AND d.document_type = t AND d.active AND NOT d.is_placeholder))
    INTO v_docs_ok FROM unnest(ARRAY['provider_agreement','client_terms','service_policy']) t;
  SELECT EXISTS (SELECT 1 FROM public.province_policy_documents d
      WHERE d.province = v_code AND d.document_type = 'privacy_notice' AND d.active AND NOT d.is_placeholder)
    INTO v_priv_ok;

  SELECT string_agg(pt, ', ') INTO v_missing_rates
  FROM unnest(coalesce(v_prov.provider_types, ARRAY[]::text[])) pt
  WHERE NOT EXISTS (SELECT 1 FROM public.provider_earning_rates r
     WHERE r.province = v_code AND upper(r.provider_type) = upper(pt) AND r.is_active AND r.rate_cents IS NOT NULL AND r.rate_cents > 0);

  v_tax_ok := coalesce((v_prov.tax_config->>'approved')::boolean, false)
    AND (v_prov.tax_config ? 'home_care_bps') AND (v_prov.tax_config ? 'doctor_escort_bps')
    AND (v_prov.tax_config ? 'hospital_discharge_bps');

  SELECT count(DISTINCT service_id) = 3 INTO v_prices_ok FROM public.provincial_pricing
   WHERE province = v_code AND active AND client_hourly_price > 0
     AND service_id IN ('standard','doctor-appointment','hospital-discharge');

  SELECT count(*) INTO v_providers FROM public.provider_provincial_authorizations a
   WHERE a.province = v_code AND a.verification_status = 'verified' AND a.job_eligible
     AND a.expires_at >= current_date AND a.evidence_reference IS NOT NULL;

  SELECT count(*) INTO v_tests FROM public.bookings b
   WHERE b.service_province = v_code AND b.is_test_data AND b.status = 'completed';

  RETURN QUERY VALUES
    ('legal_documents_approved', coalesce(v_docs_ok,false), CASE WHEN coalesce(v_docs_ok,false) THEN 'Active approved provider agreement, client terms and service policy on file' ELSE 'Provider agreement, client terms or service policy is still a placeholder or inactive' END),
    ('privacy_documents_approved', v_priv_ok, CASE WHEN v_priv_ok THEN 'Active approved privacy notice on file' ELSE 'Privacy notice is still a placeholder or inactive' END),
    ('hca_verification_approved', NULL::boolean, 'Needs written sign-off: CLHA registration and practice-permit check process; LPN/RN Alberta registration check process'),
    ('required_documents_confirmed', cardinality(coalesce(v_prov.required_documents, ARRAY[]::text[])) > 0, CASE WHEN cardinality(coalesce(v_prov.required_documents, ARRAY[]::text[])) > 0 THEN 'Required document list set' ELSE 'Required document list is empty' END),
    ('cities_confirmed', cardinality(coalesce(v_prov.cities, ARRAY[]::text[])) > 0, 'Cities: ' || coalesce(array_to_string(v_prov.cities, ', '), 'none')),
    ('coverage_confirmed', NULL::boolean, 'Needs written operations sign-off on coverage areas'),
    ('client_prices_confirmed', v_prices_ok, CASE WHEN v_prices_ok THEN 'Base prices set for home care, doctor escort, hospital discharge (before tax)' ELSE 'One or more base prices missing' END),
    ('provider_rates_confirmed', v_missing_rates IS NULL, CASE WHEN v_missing_rates IS NULL THEN 'Approved pay rate set for every provider type' ELSE 'No approved pay rate for: ' || v_missing_rates END),
    ('tax_treatment_confirmed', v_tax_ok, CASE WHEN v_tax_ok THEN 'Approved per-service tax matrix on file' ELSE 'Per-service tax treatment not approved' END),
    ('support_process_confirmed', NULL::boolean, 'Needs written operations sign-off on support process'),
    ('verified_providers_available', v_providers > 0, v_providers || ' verified provider(s) with current registration evidence'),
    ('test_bookings_passed', v_tests > 0, v_tests || ' completed test booking(s) in this province'),
    ('booking_switch_approved', NULL::boolean, 'Needs written owner approval'),
    ('payment_switch_approved', NULL::boolean, 'Needs written owner approval');
END;
$$;
REVOKE ALL ON FUNCTION public.province_readiness_evidence(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.province_readiness_evidence(text) TO authenticated, service_role;

-- 4. Guard: an item can only be ticked by a signed-in admin, with written evidence,
-- and only when live evidence (where checkable) actually passes. Every change is audited.
CREATE OR REPLACE FUNCTION public.guard_province_checklist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ok boolean;
  v_detail text;
BEGIN
  IF NEW.is_complete AND (TG_OP = 'INSERT' OR NOT OLD.is_complete OR NEW.evidence IS DISTINCT FROM OLD.evidence) THEN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
      RAISE EXCEPTION 'checklist_requires_signed_in_admin';
    END IF;
    IF coalesce(btrim(NEW.evidence), '') = '' THEN
      RAISE EXCEPTION 'checklist_evidence_required';
    END IF;
    SELECT e.auto_ok, e.detail INTO v_ok, v_detail
      FROM public.province_readiness_evidence(NEW.province_code) e WHERE e.item_key = NEW.item_key;
    IF v_ok IS FALSE THEN
      RAISE EXCEPTION 'checklist_evidence_missing: %', v_detail;
    END IF;
    NEW.auto_verified := coalesce(v_ok, false);
    NEW.completed_by := (SELECT email FROM auth.users WHERE id = auth.uid());
    NEW.completed_at := now();
  ELSIF NOT NEW.is_complete THEN
    NEW.auto_verified := false;
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.is_complete IS DISTINCT FROM OLD.is_complete OR NEW.evidence IS DISTINCT FROM OLD.evidence) THEN
    INSERT INTO public.province_audit_log
      (province, change_type, target_table, target_id, before_value, after_value, reason, performed_by, performed_by_email)
    VALUES (NEW.province_code, 'checklist_item', 'province_activation_checklist', NEW.id::text,
      to_jsonb(OLD), to_jsonb(NEW), NEW.notes, auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_province_checklist ON public.province_activation_checklist;
CREATE TRIGGER guard_province_checklist BEFORE INSERT OR UPDATE ON public.province_activation_checklist
  FOR EACH ROW EXECUTE FUNCTION public.guard_province_checklist();

-- 5. Activation: bookings/payments can only be turned on for a non-Ontario province
-- when every required item is complete AND its live evidence still passes.
CREATE OR REPLACE FUNCTION public.province_launch_ready(p_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.province_activation_checklist c
    LEFT JOIN public.province_readiness_evidence(p_code) e ON e.item_key = c.item_key
    WHERE c.province_code = upper(p_code) AND c.is_required
      AND (NOT c.is_complete OR coalesce(btrim(c.evidence),'') = '' OR e.auto_ok IS FALSE)
  ) AND EXISTS (SELECT 1 FROM public.province_activation_checklist c WHERE c.province_code = upper(p_code));
$$;
GRANT EXECUTE ON FUNCTION public.province_launch_ready(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_province_go_live()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.code <> 'ON'
     AND ((NEW.bookings_enabled AND NOT OLD.bookings_enabled) OR (NEW.payments_enabled AND NOT OLD.payments_enabled))
     AND NOT public.province_launch_ready(NEW.code) THEN
    RAISE EXCEPTION 'province_not_launch_ready';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_province_go_live ON public.provinces;
CREATE TRIGGER guard_province_go_live BEFORE UPDATE ON public.provinces
  FOR EACH ROW EXECUTE FUNCTION public.guard_province_go_live();

-- 6. Alberta provider verification requires recorded registration evidence.
CREATE OR REPLACE FUNCTION public.guard_ab_provider_authorization()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.province = 'AB' AND (NEW.verification_status = 'verified' OR NEW.job_eligible) THEN
    IF coalesce(btrim(NEW.registration_number),'') = '' THEN
      RAISE EXCEPTION 'ab_registration_number_required';
    END IF;
    IF NEW.expires_at IS NULL OR NEW.expires_at < current_date THEN
      RAISE EXCEPTION 'ab_current_permit_expiry_required';
    END IF;
    IF coalesce(btrim(NEW.evidence_reference),'') = '' OR NEW.evidence_checked_at IS NULL OR NEW.evidence_checked_by IS NULL THEN
      RAISE EXCEPTION 'ab_registration_evidence_required';
    END IF;
    IF upper(NEW.provider_type) = 'HCA' THEN
      IF upper(coalesce(NEW.registration_body,'')) <> 'CLHA' OR coalesce(btrim(NEW.permit_number),'') = '' THEN
        RAISE EXCEPTION 'ab_hca_requires_clha_registration_and_practice_permit';
      END IF;
    ELSIF upper(NEW.provider_type) IN ('LPN','RN') THEN
      IF coalesce(btrim(NEW.registration_body),'') = '' THEN
        RAISE EXCEPTION 'ab_nurse_requires_alberta_registration_body';
      END IF;
    ELSE
      RAISE EXCEPTION 'ab_unsupported_provider_type';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_ab_provider_authorization ON public.provider_provincial_authorizations;
CREATE TRIGGER guard_ab_provider_authorization BEFORE INSERT OR UPDATE ON public.provider_provincial_authorizations
  FOR EACH ROW EXECUTE FUNCTION public.guard_ab_provider_authorization();

-- Admin records what they checked by hand (no automated registry lookup exists).
CREATE OR REPLACE FUNCTION public.admin_record_provider_registration_evidence(
  p_authorization_id uuid, p_registration_body text, p_registration_number text,
  p_permit_number text, p_expires_at date, p_evidence_reference text, p_reason text)
RETURNS public.provider_provincial_authorizations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_before jsonb; v_row public.provider_provincial_authorizations;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='insufficient_privilege'; END IF;
  IF coalesce(btrim(p_reason),'') = '' THEN RAISE EXCEPTION 'reason_required'; END IF;
  SELECT to_jsonb(a) INTO v_before FROM public.provider_provincial_authorizations a WHERE a.id = p_authorization_id;
  IF v_before IS NULL THEN RAISE EXCEPTION 'unknown_authorization'; END IF;
  UPDATE public.provider_provincial_authorizations SET
    registration_body = btrim(p_registration_body),
    registration_number = btrim(p_registration_number),
    permit_number = nullif(btrim(p_permit_number),''),
    expires_at = p_expires_at,
    evidence_reference = btrim(p_evidence_reference),
    evidence_checked_at = now(),
    evidence_checked_by = auth.uid(),
    updated_at = now()
  WHERE id = p_authorization_id RETURNING * INTO v_row;
  INSERT INTO public.province_audit_log
    (province, change_type, target_table, target_id, before_value, after_value, reason, performed_by, performed_by_email)
  VALUES (v_row.province, 'provider_registration_evidence', 'provider_provincial_authorizations', v_row.id::text,
    v_before, to_jsonb(v_row), btrim(p_reason), auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()));
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_record_provider_registration_evidence(uuid,text,text,text,date,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_record_provider_registration_evidence(uuid,text,text,text,date,text,text) TO authenticated;
