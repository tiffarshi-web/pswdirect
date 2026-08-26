-- 1. Central server-side rate resolver
CREATE OR REPLACE FUNCTION public.resolve_psw_pay_rate(p_service_type text[])
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rates jsonb;
BEGIN
  BEGIN
    SELECT setting_value::jsonb INTO v_rates
    FROM public.app_settings
    WHERE setting_key = 'staff_pay_rates';
  EXCEPTION WHEN OTHERS THEN
    v_rates := NULL;
  END;

  IF p_service_type && ARRAY['Doctor Escort','Doctor Appointment Escort']::text[] THEN
    RETURN COALESCE(NULLIF((v_rates->>'doctorVisit')::numeric, 0), 27);
  ELSIF p_service_type && ARRAY['Hospital Discharge']::text[] THEN
    RETURN COALESCE(NULLIF((v_rates->>'hospitalVisit')::numeric, 0), 27);
  ELSE
    RETURN COALESCE(NULLIF((v_rates->>'standardHomeCare')::numeric, 0), 21);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_psw_pay_rate(text[]) FROM PUBLIC, anon, authenticated;

-- 2. Trigger: server is the only source of psw_pay_rate
CREATE OR REPLACE FUNCTION public.lock_psw_pay_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trusted text;
  v_privileged boolean;
BEGIN
  BEGIN
    v_trusted := current_setting('app.trusted_rpc', true);
  EXCEPTION WHEN OTHERS THEN
    v_trusted := NULL;
  END;

  -- Trusted server contexts: internal RPC, service role / edge functions, admins.
  v_privileged := (v_trusted = 'on') OR (auth.uid() IS NULL) OR public.is_admin();

  IF TG_OP = 'UPDATE' THEN
    IF NOT v_privileged THEN
      -- Clients / PSWs / ordinary users can never change the locked rate.
      NEW.psw_pay_rate := OLD.psw_pay_rate;
    END IF;
    IF NEW.psw_pay_rate IS NULL OR NEW.psw_pay_rate <= 0 THEN
      NEW.psw_pay_rate := public.resolve_psw_pay_rate(NEW.service_type);
    END IF;
    RETURN NEW;
  END IF;

  -- INSERT
  IF NOT v_privileged THEN
    -- Ignore any client-supplied value entirely.
    NEW.psw_pay_rate := public.resolve_psw_pay_rate(NEW.service_type);
    RETURN NEW;
  END IF;

  IF NEW.psw_pay_rate IS NULL OR NEW.psw_pay_rate <= 0 THEN
    NEW.psw_pay_rate := public.resolve_psw_pay_rate(NEW.service_type);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_psw_pay_rate ON public.bookings;
CREATE TRIGGER trg_lock_psw_pay_rate
BEFORE INSERT OR UPDATE OF psw_pay_rate, service_type ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.lock_psw_pay_rate();

-- 3. Audited admin override workflow
CREATE OR REPLACE FUNCTION public.admin_set_psw_pay_rate(
  p_booking_id uuid,
  p_new_rate numeric,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old numeric;
  v_code text;
  v_actor text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF p_new_rate IS NULL OR p_new_rate <= 0 OR p_new_rate > 200 THEN
    RAISE EXCEPTION 'invalid_rate';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT psw_pay_rate, booking_code INTO v_old, v_code
  FROM public.bookings WHERE id = p_booking_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  PERFORM set_config('app.trusted_rpc', 'on', true);
  UPDATE public.bookings
  SET psw_pay_rate = p_new_rate, updated_at = now()
  WHERE id = p_booking_id;
  PERFORM set_config('app.trusted_rpc', 'off', true);

  v_actor := COALESCE(auth.jwt() ->> 'email', auth.uid()::text);

  INSERT INTO public.admin_audit_log (action, actor_email, booking_id, booking_code, amount, reason, details)
  VALUES (
    'psw_pay_rate_override',
    v_actor,
    p_booking_id,
    v_code,
    p_new_rate,
    btrim(p_reason),
    jsonb_build_object(
      'previous_rate', v_old,
      'new_rate', p_new_rate,
      'admin_user_id', auth.uid(),
      'changed_at', now()
    )
  );

  RETURN jsonb_build_object('ok', true, 'previous_rate', v_old, 'new_rate', p_new_rate);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_psw_pay_rate(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_psw_pay_rate(uuid, numeric, text) TO authenticated;