
-- ---------------------------------------------------------------------------
-- 1. Harden public.claim_booking: enforce that caller owns p_psw_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_booking(
  p_booking_id uuid,
  p_psw_id uuid,
  p_psw_name text DEFAULT NULL,
  p_psw_photo_url text DEFAULT NULL,
  p_psw_vehicle_photo_url text DEFAULT NULL,
  p_psw_license_plate text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_psw     public.psw_profiles%ROWTYPE;
  v_first   text;
  v_caller_email text;
  v_is_admin boolean := false;
BEGIN
  -- Identify caller. Service-role/superuser calls (used by admin flows) bypass
  -- the ownership check. Authenticated users must own the PSW profile.
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF auth.uid() IS NOT NULL THEN
    SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO v_is_admin;
  END IF;

  -- Lock the booking row to serialize concurrent claim attempts
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF v_booking.status <> 'pending' OR (v_booking.psw_assigned IS NOT NULL AND v_booking.psw_assigned <> '') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed');
  END IF;

  IF v_booking.stripe_payment_intent_id IS NOT NULL
     AND COALESCE(v_booking.payment_status, '') <> 'paid' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unpaid');
  END IF;

  IF COALESCE(v_booking.recovered_from_payment_intent, false) = true THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unpaid');
  END IF;

  -- PSW eligibility
  SELECT * INTO v_psw FROM public.psw_profiles WHERE id = p_psw_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'psw_not_found');
  END IF;

  -- Ownership check: only the PSW themselves (or an admin) may claim on
  -- behalf of p_psw_id. Prevents any authenticated user from calling this RPC
  -- with someone else's PSW UUID.
  IF NOT v_is_admin THEN
    IF v_caller_email = '' OR lower(coalesce(v_psw.email, '')) <> v_caller_email THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
    END IF;
  END IF;

  IF v_psw.vetting_status <> 'approved' OR COALESCE(v_psw.lifecycle_status, 'active') <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'psw_not_eligible');
  END IF;

  IF v_psw.police_check_date IS NOT NULL
     AND (v_psw.police_check_date + INTERVAL '1 year') < CURRENT_DATE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'vsc_expired');
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

  RETURN jsonb_build_object('ok', true, 'booking_id', p_booking_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Extend PSW self-update restrictive policy to lock psw_number + is_test
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "PSW self-update cannot change admin fields" ON public.psw_profiles;

CREATE POLICY "PSW self-update cannot change admin fields"
ON public.psw_profiles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
WITH CHECK (
  is_admin()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.psw_profiles p
    WHERE p.id = psw_profiles.id
      AND p.vetting_status IS NOT DISTINCT FROM psw_profiles.vetting_status
      AND p.vetting_notes IS NOT DISTINCT FROM psw_profiles.vetting_notes
      AND p.approved_at IS NOT DISTINCT FROM psw_profiles.approved_at
      AND p.lifecycle_status IS NOT DISTINCT FROM psw_profiles.lifecycle_status
      AND p.banned_at IS NOT DISTINCT FROM psw_profiles.banned_at
      AND p.flag_count IS NOT DISTINCT FROM psw_profiles.flag_count
      AND p.cancel_count IS NOT DISTINCT FROM psw_profiles.cancel_count
      AND p.rejection_reasons IS NOT DISTINCT FROM psw_profiles.rejection_reasons
      AND p.gov_id_status IS NOT DISTINCT FROM psw_profiles.gov_id_status
      AND p.psw_cert_status IS NOT DISTINCT FROM psw_profiles.psw_cert_status
      AND p.psw_number IS NOT DISTINCT FROM psw_profiles.psw_number
      AND p.is_test IS NOT DISTINCT FROM psw_profiles.is_test
  )
);

-- ---------------------------------------------------------------------------
-- 3. Consolidate duplicate/overlapping insert policies on psw_documents.
--    The "PSWs can insert own documents" policy already covers self-uploads,
--    and admins insert via service role in the upload edge function.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role can insert documents" ON public.psw_documents;
