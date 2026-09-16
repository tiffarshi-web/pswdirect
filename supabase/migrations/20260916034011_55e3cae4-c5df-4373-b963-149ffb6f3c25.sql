-- Phase 10: province-aware approved provider pay rates ---------------------

-- 1. Admin-only rate configuration (set or clear), fully audited.
CREATE OR REPLACE FUNCTION public.admin_set_provider_earning_rate(
  p_province text,
  p_provider_type text,
  p_rate_cents integer,
  p_reason text
)
RETURNS public.provider_earning_rates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before jsonb;
  v_row public.provider_earning_rates;
  v_province text := upper(btrim(coalesce(p_province, '')));
  v_type text := lower(btrim(coalesce(p_provider_type, '')));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF coalesce(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;
  IF v_province = '' OR v_type = '' THEN
    RAISE EXCEPTION 'province_and_provider_type_required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.provinces WHERE code = v_province) THEN
    RAISE EXCEPTION 'unknown_province';
  END IF;
  IF p_rate_cents IS NOT NULL AND (p_rate_cents < 100 OR p_rate_cents > 20000) THEN
    RAISE EXCEPTION 'rate_out_of_range';
  END IF;

  SELECT to_jsonb(r) INTO v_before
  FROM public.provider_earning_rates r
  WHERE r.province = v_province AND r.provider_type = v_type;

  INSERT INTO public.provider_earning_rates AS r
    (province, provider_type, rate_cents, is_active, notes)
  VALUES
    (v_province, v_type, p_rate_cents, p_rate_cents IS NOT NULL, btrim(p_reason))
  ON CONFLICT (province, provider_type) DO UPDATE SET
    rate_cents = EXCLUDED.rate_cents,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.province_audit_log
    (province, change_type, target_table, target_id, before_value, after_value,
     reason, performed_by, performed_by_email)
  VALUES
    (v_province, 'provider_rate_change', 'provider_earning_rates', v_row.id::text,
     v_before, to_jsonb(v_row), btrim(p_reason), auth.uid(),
     (SELECT email FROM auth.users WHERE id = auth.uid()));

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_provider_earning_rate(text, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_provider_earning_rate(text, text, integer, text) TO authenticated, service_role;

-- 2. Booking rate lock now resolves the province's own provider type.
CREATE OR REPLACE FUNCTION public.lock_psw_pay_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trusted text;
  v_approved numeric;
  v_province text;
  v_type text;
BEGIN
  BEGIN
    v_trusted := current_setting('app.trusted_rpc', true);
  EXCEPTION WHEN OTHERS THEN
    v_trusted := NULL;
  END;

  v_province := COALESCE(NULLIF(NEW.service_province, ''), 'ON');

  SELECT lower(COALESCE(NULLIF(p.provider_type, ''), 'psw')) INTO v_type
  FROM public.provinces p WHERE p.code = v_province;
  v_type := COALESCE(v_type, 'psw');

  -- NULL means "Earnings amount pending verification" (fail closed).
  v_approved := public.resolve_provider_pay_rate(v_province, v_type);

  IF TG_OP = 'INSERT' THEN
    NEW.psw_pay_rate := v_approved;
    RETURN NEW;
  END IF;

  IF v_trusted = 'on' THEN
    NEW.psw_pay_rate := v_approved;
  ELSE
    NEW.psw_pay_rate := OLD.psw_pay_rate;
    IF NEW.psw_pay_rate IS NULL OR NEW.psw_pay_rate <= 0 THEN
      NEW.psw_pay_rate := v_approved;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Admin rate corrections on a booking must match that province's approved rate.
CREATE OR REPLACE FUNCTION public.admin_set_psw_pay_rate(p_booking_id uuid, p_new_rate numeric, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old numeric;
  v_code text;
  v_actor text;
  v_province text;
  v_type text;
  v_approved numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT psw_pay_rate, booking_code, COALESCE(NULLIF(service_province, ''), 'ON')
    INTO v_old, v_code, v_province
  FROM public.bookings WHERE id = p_booking_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  SELECT lower(COALESCE(NULLIF(p.provider_type, ''), 'psw')) INTO v_type
  FROM public.provinces p WHERE p.code = v_province;
  v_type := COALESCE(v_type, 'psw');

  v_approved := public.resolve_provider_pay_rate(v_province, v_type);
  IF v_approved IS NULL THEN
    RAISE EXCEPTION 'rate_pending_verification';
  END IF;
  IF p_new_rate IS NULL OR round(p_new_rate, 2) <> round(v_approved, 2) THEN
    RAISE EXCEPTION 'rate_not_approved';
  END IF;

  PERFORM set_config('app.trusted_rpc', 'on', true);
  UPDATE public.bookings
  SET psw_pay_rate = v_approved, updated_at = now()
  WHERE id = p_booking_id;
  PERFORM set_config('app.trusted_rpc', 'off', true);

  v_actor := COALESCE(auth.jwt() ->> 'email', auth.uid()::text);

  INSERT INTO public.admin_audit_log (action, actor_email, booking_id, booking_code, amount, reason, details)
  VALUES ('psw_pay_rate_resync', v_actor, p_booking_id, v_code, v_approved, btrim(p_reason),
    jsonb_build_object('previous_rate', v_old, 'new_rate', v_approved, 'province', v_province,
                       'provider_type', v_type, 'admin_user_id', auth.uid(), 'changed_at', now()));

  RETURN jsonb_build_object('ok', true, 'previous_rate', v_old, 'new_rate', v_approved);
END;
$$;