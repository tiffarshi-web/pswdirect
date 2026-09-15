-- Phase 8: automatic immutable audit of province, pricing, coverage and authorization changes.
CREATE OR REPLACE FUNCTION public.log_province_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_province text;
  v_target text;
  v_change text;
BEGIN
  IF TG_TABLE_NAME = 'provinces' THEN
    v_province := COALESCE(NEW.code, OLD.code);
    v_target := v_province;
  ELSIF TG_TABLE_NAME = 'provincial_pricing' THEN
    v_province := COALESCE(NEW.province, OLD.province);
    v_target := COALESCE(NEW.id, OLD.id)::text;
  ELSE
    v_province := COALESCE(NEW.province, OLD.province);
    v_target := COALESCE(NEW.id, OLD.id)::text;
  END IF;

  v_change := TG_TABLE_NAME || '_' || lower(TG_OP);

  INSERT INTO public.province_audit_log (
    province, change_type, target_table, target_id,
    before_value, after_value, performed_by, performed_by_email
  ) VALUES (
    v_province,
    v_change,
    TG_TABLE_NAME,
    v_target,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid(),
    NULLIF(lower(btrim(COALESCE(auth.jwt() ->> 'email', ''))), '')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.log_province_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_provinces_audit ON public.provinces;
CREATE TRIGGER trg_provinces_audit
AFTER INSERT OR UPDATE OR DELETE ON public.provinces
FOR EACH ROW EXECUTE FUNCTION public.log_province_change();

DROP TRIGGER IF EXISTS trg_provincial_pricing_audit ON public.provincial_pricing;
CREATE TRIGGER trg_provincial_pricing_audit
AFTER INSERT OR UPDATE OR DELETE ON public.provincial_pricing
FOR EACH ROW EXECUTE FUNCTION public.log_province_change();

DROP TRIGGER IF EXISTS trg_provincial_authorizations_audit ON public.provider_provincial_authorizations;
CREATE TRIGGER trg_provincial_authorizations_audit
AFTER INSERT OR UPDATE OR DELETE ON public.provider_provincial_authorizations
FOR EACH ROW EXECUTE FUNCTION public.log_province_change();