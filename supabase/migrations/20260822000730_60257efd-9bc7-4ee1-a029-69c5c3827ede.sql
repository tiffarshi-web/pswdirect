CREATE TABLE IF NOT EXISTS public.claim_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid,
  booking_code text,
  psw_id uuid,
  psw_email text,
  outcome text NOT NULL,
  reason text,
  correlation_id text,
  client_info jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.claim_attempts TO authenticated;
GRANT ALL ON public.claim_attempts TO service_role;

ALTER TABLE public.claim_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view claim attempts" ON public.claim_attempts;
CREATE POLICY "Admins can view claim attempts"
  ON public.claim_attempts FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_claim_attempts_booking ON public.claim_attempts (booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claim_attempts_psw ON public.claim_attempts (psw_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_claim_attempt(
  _booking_id uuid,
  _booking_code text,
  _psw_id uuid,
  _psw_email text,
  _outcome text,
  _reason text,
  _correlation_id text,
  _client_info jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.claim_attempts
    (booking_id, booking_code, psw_id, psw_email, outcome, reason, correlation_id, client_info)
  VALUES (_booking_id, _booking_code, _psw_id, _psw_email, _outcome, _reason, _correlation_id, _client_info);
$$;

REVOKE ALL ON FUNCTION public.log_claim_attempt(uuid, text, uuid, text, text, text, text, jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.claim_booking(
  p_booking_id uuid,
  p_psw_id uuid,
  p_psw_name text,
  p_psw_photo_url text DEFAULT NULL,
  p_psw_vehicle_photo_url text DEFAULT NULL,
  p_psw_license_plate text DEFAULT NULL,
  p_correlation_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_psw     public.psw_profiles%ROWTYPE;
  v_first   text;
  v_caller_email text;
  v_is_admin boolean := false;
  v_booking_is_test boolean;
  v_psw_is_test boolean;
  v_conflicts int := 0;
  v_code text;
BEGIN
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF auth.uid() IS NOT NULL THEN
    SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO v_is_admin;
  END IF;

  IF auth.uid() IS NULL THEN
    PERFORM public.log_claim_attempt(p_booking_id, NULL, p_psw_id, NULL, 'failed', 'session_expired', p_correlation_id, NULL);
    RETURN jsonb_build_object('ok', false, 'reason', 'session_expired');
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM public.log_claim_attempt(p_booking_id, NULL, p_psw_id, v_caller_email, 'failed', 'not_found', p_correlation_id, NULL);
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  v_code := v_booking.booking_code;

  IF v_booking.status <> 'pending' OR (v_booking.psw_assigned IS NOT NULL AND v_booking.psw_assigned <> '') THEN
    PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, 'failed', 'already_claimed', p_correlation_id, NULL);
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed');
  END IF;

  IF (v_booking.stripe_payment_intent_id IS NOT NULL
      AND COALESCE(v_booking.payment_status, '') <> 'paid')
     OR COALESCE(v_booking.recovered_from_payment_intent, false) = true THEN
    PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, 'failed', 'unpaid', p_correlation_id, NULL);
    RETURN jsonb_build_object('ok', false, 'reason', 'unpaid');
  END IF;

  SELECT * INTO v_psw FROM public.psw_profiles WHERE id = p_psw_id;
  IF NOT FOUND THEN
    PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, 'failed', 'psw_not_found', p_correlation_id, NULL);
    RETURN jsonb_build_object('ok', false, 'reason', 'psw_not_found');
  END IF;

  IF NOT v_is_admin THEN
    IF v_caller_email = '' OR lower(coalesce(v_psw.email, '')) <> v_caller_email THEN
      PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, 'failed', 'not_authorized', p_correlation_id, NULL);
      RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
    END IF;
  END IF;

  v_booking_is_test := COALESCE(v_booking.is_test_data, false);
  v_psw_is_test     := COALESCE(v_psw.is_test, false);

  IF (v_booking_is_test = true) AND (v_psw_is_test = false) THEN
    PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, 'failed', 'qa_booking_not_claimable', p_correlation_id, NULL);
    RETURN jsonb_build_object('ok', false, 'reason', 'qa_booking_not_claimable');
  END IF;

  IF (v_booking_is_test = false) AND (v_psw_is_test = true) THEN
    PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, 'failed', 'qa_account_cannot_claim_production', p_correlation_id, NULL);
    RETURN jsonb_build_object('ok', false, 'reason', 'qa_account_cannot_claim_production');
  END IF;

  IF (v_booking_is_test = true)
     AND ((v_booking.test_target_psw_id IS NULL) OR (v_booking.test_target_psw_id <> p_psw_id)) THEN
    PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, 'failed', 'qa_booking_wrong_target', p_correlation_id, NULL);
    RETURN jsonb_build_object('ok', false, 'reason', 'qa_booking_wrong_target');
  END IF;

  IF v_psw.vetting_status <> 'approved' OR COALESCE(v_psw.lifecycle_status, 'active') <> 'active' THEN
    PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, 'failed', 'psw_not_eligible', p_correlation_id, NULL);
    RETURN jsonb_build_object('ok', false, 'reason', 'psw_not_eligible');
  END IF;

  IF v_psw.police_check_date IS NOT NULL
     AND (v_psw.police_check_date + INTERVAL '1 year') < CURRENT_DATE THEN
    PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, 'failed', 'vsc_expired', p_correlation_id, NULL);
    RETURN jsonb_build_object('ok', false, 'reason', 'vsc_expired');
  END IF;

  IF COALESCE(v_booking.is_transport_booking, false) = true
     AND NOT v_is_admin
     AND COALESCE(v_psw.has_own_transport, '') <> 'yes-car' THEN
    PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, 'failed', 'vehicle_required', p_correlation_id, NULL);
    RETURN jsonb_build_object('ok', false, 'reason', 'vehicle_required');
  END IF;

  IF NOT v_is_admin THEN
    SELECT count(*) INTO v_conflicts
    FROM public.bookings b
    WHERE b.psw_assigned = p_psw_id::text
      AND b.id <> p_booking_id
      AND b.scheduled_date = v_booking.scheduled_date
      AND COALESCE(b.status, '') NOT IN ('cancelled', 'completed', 'archived')
      AND b.start_time IS NOT NULL AND b.end_time IS NOT NULL
      AND v_booking.start_time IS NOT NULL AND v_booking.end_time IS NOT NULL
      AND b.start_time < v_booking.end_time
      AND v_booking.start_time < b.end_time;

    IF v_conflicts > 0 THEN
      PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, 'failed', 'schedule_conflict', p_correlation_id, NULL);
      RETURN jsonb_build_object('ok', false, 'reason', 'schedule_conflict');
    END IF;
  END IF;

  v_first := COALESCE(NULLIF(split_part(COALESCE(p_psw_name, ''), ' ', 1), ''), v_psw.first_name);

  UPDATE public.bookings
  SET psw_assigned          = p_psw_id::text,
      psw_first_name        = v_first,
      psw_photo_url         = COALESCE(p_psw_photo_url, v_psw.profile_photo_url),
      psw_vehicle_photo_url = COALESCE(p_psw_vehicle_photo_url, psw_vehicle_photo_url),
      psw_license_plate     = COALESCE(p_psw_license_plate, psw_license_plate),
      claimed_at            = now(),
      status                = 'active',
      updated_at            = now()
  WHERE id = p_booking_id;

  PERFORM public.log_claim_attempt(p_booking_id, v_code, p_psw_id, v_caller_email, 'success', NULL, p_correlation_id, NULL);

  RETURN jsonb_build_object('ok', true, 'booking_id', p_booking_id);
END;
$function$;