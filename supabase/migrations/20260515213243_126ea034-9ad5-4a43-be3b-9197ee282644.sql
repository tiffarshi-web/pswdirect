
-- ============================================================
-- Shift Verification Stabilization Layer (additive only)
-- ============================================================

-- 1. Bookings: additive nullable columns -----------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS original_checked_in_at  timestamptz,
  ADD COLUMN IF NOT EXISTS original_signed_out_at  timestamptz,
  ADD COLUMN IF NOT EXISTS gps_check_in_failed     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gps_check_in_failure_reason text,
  ADD COLUMN IF NOT EXISTS check_in_outside_radius boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS check_in_distance_m     numeric,
  ADD COLUMN IF NOT EXISTS check_in_accuracy_m     numeric,
  ADD COLUMN IF NOT EXISTS verification_status     text;

-- Validation trigger (NOT a CHECK constraint — keeps options flexible)
CREATE OR REPLACE FUNCTION public.validate_booking_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IS NOT NULL
     AND NEW.verification_status NOT IN ('scheduled','active','awaiting_review','approved','paid','flagged') THEN
    RAISE EXCEPTION 'Invalid verification_status: %', NEW.verification_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_booking_verification_status ON public.bookings;
CREATE TRIGGER trg_validate_booking_verification_status
  BEFORE INSERT OR UPDATE OF verification_status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_verification_status();

-- 2. check_in_attempts table -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.check_in_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid,
  booking_code    text,
  psw_id          text,
  psw_name        text,
  success         boolean NOT NULL,
  outside_radius  boolean NOT NULL DEFAULT false,
  failure_reason  text,
  latitude        numeric,
  longitude       numeric,
  accuracy_m      numeric,
  distance_m      numeric,
  user_agent      text,
  network_online  boolean,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.check_in_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage check_in_attempts"
  ON public.check_in_attempts
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "PSWs insert their own check_in_attempts"
  ON public.check_in_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    psw_id IN (
      SELECT (p.id)::text FROM public.psw_profiles p
      WHERE p.email = (auth.jwt() ->> 'email'::text)
    )
  );

CREATE POLICY "PSWs read their own check_in_attempts"
  ON public.check_in_attempts
  FOR SELECT TO authenticated
  USING (
    psw_id IN (
      SELECT (p.id)::text FROM public.psw_profiles p
      WHERE p.email = (auth.jwt() ->> 'email'::text)
    )
  );

CREATE INDEX IF NOT EXISTS idx_check_in_attempts_booking ON public.check_in_attempts(booking_id);
CREATE INDEX IF NOT EXISTS idx_check_in_attempts_created ON public.check_in_attempts(created_at DESC);

-- 3. shift_admin_adjustments table -----------------------------------------
CREATE TABLE IF NOT EXISTS public.shift_admin_adjustments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id               uuid NOT NULL,
  booking_code             text,
  admin_email              text NOT NULL,
  field_name               text NOT NULL,        -- e.g. 'checked_in_at', 'signed_out_at', 'verification_status'
  original_value           text,
  new_value                text,
  reason                   text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_admin_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage shift_admin_adjustments"
  ON public.shift_admin_adjustments
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_shift_admin_adjustments_booking ON public.shift_admin_adjustments(booking_id);

-- 4. Helper: admin override shift times (preserves originals) -------------
CREATE OR REPLACE FUNCTION public.admin_override_shift_times(
  p_booking_id uuid,
  p_new_checked_in_at  timestamptz DEFAULT NULL,
  p_new_signed_out_at  timestamptz DEFAULT NULL,
  p_reason             text        DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email text;
  v_row         public.bookings%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can override shift times';
  END IF;

  v_admin_email := COALESCE(auth.jwt() ->> 'email', 'unknown');

  SELECT * INTO v_row FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  -- Preserve originals on first override only
  IF p_new_checked_in_at IS NOT NULL AND v_row.original_checked_in_at IS NULL THEN
    UPDATE public.bookings
       SET original_checked_in_at = v_row.checked_in_at
     WHERE id = p_booking_id;
  END IF;
  IF p_new_signed_out_at IS NOT NULL AND v_row.original_signed_out_at IS NULL THEN
    UPDATE public.bookings
       SET original_signed_out_at = v_row.signed_out_at
     WHERE id = p_booking_id;
  END IF;

  IF p_new_checked_in_at IS NOT NULL THEN
    INSERT INTO public.shift_admin_adjustments
      (booking_id, booking_code, admin_email, field_name, original_value, new_value, reason)
    VALUES
      (p_booking_id, v_row.booking_code, v_admin_email, 'checked_in_at',
       v_row.checked_in_at::text, p_new_checked_in_at::text, p_reason);
    UPDATE public.bookings
       SET checked_in_at = p_new_checked_in_at,
           manual_check_in = true,
           manual_override_at = now(),
           manual_override_by = v_admin_email,
           manual_override_reason = COALESCE(p_reason, manual_override_reason)
     WHERE id = p_booking_id;
  END IF;

  IF p_new_signed_out_at IS NOT NULL THEN
    INSERT INTO public.shift_admin_adjustments
      (booking_id, booking_code, admin_email, field_name, original_value, new_value, reason)
    VALUES
      (p_booking_id, v_row.booking_code, v_admin_email, 'signed_out_at',
       v_row.signed_out_at::text, p_new_signed_out_at::text, p_reason);
    UPDATE public.bookings
       SET signed_out_at = p_new_signed_out_at,
           manual_check_out = true,
           manual_override_at = now(),
           manual_override_by = v_admin_email,
           manual_override_reason = COALESCE(p_reason, manual_override_reason)
     WHERE id = p_booking_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_override_shift_times(uuid, timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_override_shift_times(uuid, timestamptz, timestamptz, text) TO authenticated;

-- 5. Helper: admin set verification status --------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_verification_status(
  p_booking_id uuid,
  p_status     text,
  p_reason     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email text;
  v_old text;
  v_code text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can set verification status';
  END IF;
  v_admin_email := COALESCE(auth.jwt() ->> 'email', 'unknown');

  SELECT verification_status, booking_code INTO v_old, v_code FROM public.bookings WHERE id = p_booking_id;

  INSERT INTO public.shift_admin_adjustments
    (booking_id, booking_code, admin_email, field_name, original_value, new_value, reason)
  VALUES (p_booking_id, v_code, v_admin_email, 'verification_status', v_old, p_status, p_reason);

  UPDATE public.bookings SET verification_status = p_status WHERE id = p_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_verification_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_verification_status(uuid, text, text) TO authenticated;
