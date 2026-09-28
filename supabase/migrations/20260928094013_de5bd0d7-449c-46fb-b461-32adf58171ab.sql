CREATE OR REPLACE FUNCTION public.province_local_today(p_province text)
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (now() AT TIME ZONE COALESCE(
    (SELECT NULLIF(timezone,'') FROM public.provinces WHERE code = COALESCE(p_province,'ON') LIMIT 1),
    CASE COALESCE(p_province,'ON') WHEN 'AB' THEN 'America/Edmonton' ELSE 'America/Toronto' END))::date
$$;
REVOKE ALL ON FUNCTION public.province_local_today(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.province_local_today(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_checkin_service_date()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_today date;
BEGIN
  IF NEW.checked_in_at IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.checked_in_at IS NOT NULL THEN RETURN NEW; END IF;
  -- Office manual check-in (admin, explicitly flagged) is the only override.
  IF COALESCE(NEW.manual_check_in,false) AND public.is_admin() THEN RETURN NEW; END IF;
  v_today := public.province_local_today(NEW.service_province);
  IF NEW.scheduled_date IS NULL OR NEW.scheduled_date <> v_today THEN
    RAISE EXCEPTION 'wrong_service_date: scheduled %, local today %', NEW.scheduled_date, v_today
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_checkin_service_date ON public.bookings;
CREATE TRIGGER trg_enforce_checkin_service_date
BEFORE INSERT OR UPDATE OF checked_in_at ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_checkin_service_date();

CREATE OR REPLACE FUNCTION public.check_in_to_shift(p_booking_id uuid, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_gps_failure_reason text DEFAULT NULL::text, p_outside_radius boolean DEFAULT false, p_distance_m double precision DEFAULT NULL::double precision, p_accuracy_m double precision DEFAULT NULL::double precision)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_psw_id text;
  v_row public.bookings%ROWTYPE;
  v_soft_fail boolean;
  v_did_update boolean := false;
  v_today date;
BEGIN
  PERFORM set_config('app.trusted_rpc', 'on', true);
  v_psw_id := public.current_psw_profile_id();
  IF v_psw_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  SELECT * INTO v_row FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF v_row.psw_assigned IS DISTINCT FROM v_psw_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_assigned');
  END IF;
  IF v_row.status IN ('cancelled','completed','archived','refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_row.status);
  END IF;
  IF v_row.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true,'did_update', false,'already_checked_in', true,'checked_in_at', v_row.checked_in_at,'status', v_row.status);
  END IF;

  v_today := public.province_local_today(v_row.service_province);
  IF v_row.scheduled_date IS NULL OR v_row.scheduled_date <> v_today THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_service_date',
      'scheduled_date', v_row.scheduled_date, 'local_today', v_today);
  END IF;

  v_soft_fail := COALESCE(p_outside_radius, false) OR (p_gps_failure_reason IS NOT NULL);
  UPDATE public.bookings
     SET checked_in_at = now(), check_in_lat = p_lat, check_in_lng = p_lng, status = 'in-progress',
         gps_check_in_failed = v_soft_fail, gps_check_in_failure_reason = p_gps_failure_reason,
         check_in_outside_radius = COALESCE(p_outside_radius, false),
         check_in_distance_m = p_distance_m, check_in_accuracy_m = p_accuracy_m,
         verification_status = CASE WHEN v_soft_fail THEN 'awaiting_review' ELSE 'active' END
   WHERE id = p_booking_id AND psw_assigned = v_psw_id AND checked_in_at IS NULL AND signed_out_at IS NULL
     AND status NOT IN ('cancelled','completed','archived','refunded')
   RETURNING * INTO v_row;
  v_did_update := FOUND;
  IF NOT v_did_update THEN
    SELECT * INTO v_row FROM public.bookings WHERE id = p_booking_id;
    IF v_row.checked_in_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', true,'did_update', false,'already_checked_in', true,'checked_in_at', v_row.checked_in_at,'status', v_row.status);
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'update_failed');
  END IF;
  RETURN jsonb_build_object('success', true,'did_update', true,'already_checked_in', false,'checked_in_at', v_row.checked_in_at,'status', v_row.status);
END;
$function$;