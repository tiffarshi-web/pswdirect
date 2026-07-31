-- ═══════════════════════════════════════════════════════════════
-- PHASE 1 — QA ISOLATION: SCHEMA FOUNDATION
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS is_test_data boolean NOT NULL DEFAULT false;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_test_data boolean NOT NULL DEFAULT false;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS test_target_psw_id uuid NULL
    REFERENCES public.psw_profiles(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_bookings_is_test_data
  ON public.bookings (is_test_data) WHERE is_test_data = true;
CREATE INDEX IF NOT EXISTS idx_bookings_test_target_psw
  ON public.bookings (test_target_psw_id) WHERE test_target_psw_id IS NOT NULL;

-- Structural consistency: normal => (false, NULL); test => (true, NOT NULL)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_test_data_consistency;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_test_data_consistency CHECK (
  ((is_test_data = false) AND (test_target_psw_id IS NULL))
  OR
  ((is_test_data = true) AND (test_target_psw_id IS NOT NULL))
);

-- Semantic consistency: target must be a flagged test PSW; a test booking can
-- never be downgraded into a normal dispatchable booking.
CREATE OR REPLACE FUNCTION public.enforce_test_booking_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_is_test boolean;
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (COALESCE(OLD.is_test_data, false) = true) AND (COALESCE(NEW.is_test_data, false) = false) THEN
      RAISE EXCEPTION 'A QA test booking cannot be converted into a production booking';
    END IF;
    IF (COALESCE(OLD.is_test_data, false) = true)
       AND (NEW.test_target_psw_id IS DISTINCT FROM OLD.test_target_psw_id) THEN
      RAISE EXCEPTION 'The QA target PSW of a test booking cannot be changed';
    END IF;
  END IF;

  IF (COALESCE(NEW.is_test_data, false) = true) THEN
    SELECT COALESCE(p.is_test, false) INTO v_target_is_test
    FROM public.psw_profiles p WHERE p.id = NEW.test_target_psw_id;

    IF (v_target_is_test IS NULL) THEN
      RAISE EXCEPTION 'QA test booking targets a non-existent PSW profile';
    END IF;
    IF (v_target_is_test = false) THEN
      RAISE EXCEPTION 'QA test booking must target a PSW profile flagged is_test = true';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_test_booking_integrity ON public.bookings;
CREATE TRIGGER trg_enforce_test_booking_integrity
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_test_booking_integrity();

-- A PSW profile that owns QA bookings can never lose its test flag.
CREATE OR REPLACE FUNCTION public.enforce_test_psw_flag_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (COALESCE(OLD.is_test, false) = true) AND (COALESCE(NEW.is_test, false) = false) THEN
    IF EXISTS (SELECT 1 FROM public.bookings b WHERE b.test_target_psw_id = OLD.id) THEN
      RAISE EXCEPTION 'This PSW profile is the target of QA test bookings and cannot be unflagged';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_test_psw_flag_integrity ON public.psw_profiles;
CREATE TRIGGER trg_enforce_test_psw_flag_integrity
  BEFORE UPDATE ON public.psw_profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_test_psw_flag_integrity();


-- ═══════════════════════════════════════════════════════════════
-- PHASE 2 — STRICT QA VISIBILITY
-- ═══════════════════════════════════════════════════════════════
-- Canonical, explicitly-parenthesised QA visibility predicate:
--   ( (booking is NOT test) OR (booking is test AND target = caller psw id) )
-- Real PSWs therefore never see test bookings; a QA PSW sees only its own.

DROP VIEW IF EXISTS public.psw_safe_booking_view;

CREATE VIEW public.psw_safe_booking_view
WITH (security_invoker = on) AS
 WITH ctx AS (
         SELECT current_psw_profile_id() AS my_psw_id,
            is_approved_psw() AS approved,
            is_admin() AS is_admin
        )
 SELECT b.id,
    b.booking_code,
    b.status,
    b.payment_status,
    b.stripe_payment_intent_id,
    b.is_asap,
    b.psw_assigned,
    b.psw_first_name,
    b.psw_photo_url,
    b.psw_vehicle_photo_url,
    b.psw_license_plate,
    b.preferred_languages,
    b.preferred_gender,
    b.is_transport_booking,
    b.service_type,
    b.scheduled_date,
    b.start_time,
    b.end_time,
    b.hours,
    b.care_conditions,
    b.care_conditions_other,
    b.is_recurring,
    b.parent_schedule_id,
    b.flagged_for_overtime,
    b.overtime_minutes,
    b.suggested_billable_hours,
    b.final_billable_hours,
    b.psw_cancel_reason,
    b.psw_cancelled_at,
    b.created_at,
    b.updated_at,
    b.cancelled_at,
    b.cancellation_reason,
    b.patient_postal_code,
    b.client_postal_code,
    b.pickup_postal_code,
    b.service_latitude,
    b.service_longitude,
    b.geocode_source,
    b.is_test_data,
    b.test_target_psw_id,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.check_in_lat ELSE NULL::numeric END AS check_in_lat,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.check_in_lng ELSE NULL::numeric END AS check_in_lng,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.checked_in_at ELSE NULL::timestamp with time zone END AS checked_in_at,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.claimed_at ELSE NULL::timestamp with time zone END AS claimed_at,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.signed_out_at ELSE NULL::timestamp with time zone END AS signed_out_at,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.manual_check_in ELSE NULL::boolean END AS manual_check_in,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.manual_check_out ELSE NULL::boolean END AS manual_check_out,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.manual_override_reason ELSE NULL::text END AS manual_override_reason,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.care_sheet ELSE NULL::jsonb END AS care_sheet,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.care_sheet_status ELSE NULL::text END AS care_sheet_status,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.care_sheet_submitted_at ELSE NULL::timestamp with time zone END AS care_sheet_submitted_at,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.care_sheet_last_saved_at ELSE NULL::timestamp with time zone END AS care_sheet_last_saved_at,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.care_sheet_psw_name ELSE NULL::text END AS care_sheet_psw_name,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.care_sheet_flagged ELSE NULL::boolean END AS care_sheet_flagged,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.care_sheet_flag_reason ELSE NULL::text[] END AS care_sheet_flag_reason,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.client_name ELSE NULL::text END AS client_name,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.client_first_name ELSE NULL::text END AS client_first_name,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.client_address ELSE NULL::text END AS client_address,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.patient_name ELSE NULL::text END AS patient_name,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.patient_first_name ELSE NULL::text END AS patient_first_name,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.patient_last_name ELSE NULL::text END AS patient_last_name,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.patient_address ELSE NULL::text END AS patient_address,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.patient_relationship ELSE NULL::text END AS patient_relationship,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.pickup_address ELSE NULL::text END AS pickup_address,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.dropoff_address ELSE NULL::text END AS dropoff_address,
        CASE
            WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.special_notes
            WHEN (ctx.approved AND (b.psw_assigned IS NULL)) THEN redact_pii_text(b.special_notes)
            ELSE NULL::text
        END AS special_notes,
    b.facility_name,
    b.appointment_time,
    b.is_round_trip,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.facility_unit ELSE NULL::text END AS facility_unit,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.pickup_instructions ELSE NULL::text END AS pickup_instructions,
        CASE WHEN (ctx.is_admin OR (b.psw_assigned = ctx.my_psw_id)) THEN b.dropoff_postal_code ELSE NULL::text END AS dropoff_postal_code
   FROM (bookings b CROSS JOIN ctx)
  WHERE
    (
      ctx.is_admin
      OR
      (
        (
          ((b.psw_assigned IS NOT NULL) AND (b.psw_assigned = ctx.my_psw_id))
          OR
          (
            ctx.approved
            AND (b.status = 'pending'::text)
            AND (b.psw_assigned IS NULL)
            AND (COALESCE(b.status, ''::text) <> ALL (ARRAY['cancelled'::text, 'archived'::text]))
          )
        )
        AND
        (
          (COALESCE(b.is_test_data, false) = false)
          OR
          (
            (COALESCE(b.is_test_data, false) = true)
            AND (b.test_target_psw_id IS NOT NULL)
            AND (ctx.my_psw_id IS NOT NULL)
            AND (b.test_target_psw_id::text = ctx.my_psw_id)
          )
        )
      )
    );

REVOKE ALL ON public.psw_safe_booking_view FROM PUBLIC;
GRANT SELECT ON public.psw_safe_booking_view TO authenticated;
GRANT SELECT ON public.psw_safe_booking_view TO service_role;

COMMENT ON VIEW public.psw_safe_booking_view IS
  'PSW-safe booking projection. Redacts client PII pre-claim and enforces QA isolation: test bookings are visible only to their test_target_psw_id.';

-- Counter must match the feed exactly.
CREATE OR REPLACE FUNCTION public.count_available_jobs_for_psw(p_psw_id uuid, p_radius_km numeric DEFAULT 75)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH psw AS (
    SELECT id, home_lat, home_lng, vetting_status, lifecycle_status, COALESCE(is_test, false) AS is_test
    FROM public.psw_profiles WHERE id = p_psw_id
  )
  SELECT COUNT(*)::int
  FROM public.bookings b, psw
  WHERE psw.vetting_status = 'approved'
    AND COALESCE(psw.lifecycle_status, 'active') = 'active'
    AND b.status = 'pending'
    AND (b.psw_assigned IS NULL OR b.psw_assigned = '')
    AND (
      b.stripe_payment_intent_id IS NULL
      OR COALESCE(b.payment_status, '') = 'paid'
    )
    AND COALESCE(b.recovered_from_payment_intent, false) = false
    AND (
      (COALESCE(b.is_test_data, false) = false)
      OR
      (
        (COALESCE(b.is_test_data, false) = true)
        AND (b.test_target_psw_id IS NOT NULL)
        AND (b.test_target_psw_id = psw.id)
      )
    )
    AND (
      psw.home_lat IS NULL OR psw.home_lng IS NULL
      OR b.service_latitude IS NULL OR b.service_longitude IS NULL
      OR (
        6371 * acos(
          cos(radians(psw.home_lat)) * cos(radians(b.service_latitude)) *
          cos(radians(b.service_longitude) - radians(psw.home_lng)) +
          sin(radians(psw.home_lat)) * sin(radians(b.service_latitude))
        )
      ) <= p_radius_km
    );
$function$;

GRANT EXECUTE ON FUNCTION public.count_available_jobs_for_psw(uuid, numeric) TO authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 3 — CLAIM PROTECTION
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.claim_booking(p_booking_id uuid, p_psw_id uuid, p_psw_name text DEFAULT NULL::text, p_psw_photo_url text DEFAULT NULL::text, p_psw_vehicle_photo_url text DEFAULT NULL::text, p_psw_license_plate text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_psw     public.psw_profiles%ROWTYPE;
  v_first   text;
  v_caller_email text;
  v_is_admin boolean := false;
  v_booking_is_test boolean;
  v_psw_is_test boolean;
BEGIN
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF auth.uid() IS NOT NULL THEN
    SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO v_is_admin;
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

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

  SELECT * INTO v_psw FROM public.psw_profiles WHERE id = p_psw_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'psw_not_found'); END IF;

  IF NOT v_is_admin THEN
    IF v_caller_email = '' OR lower(coalesce(v_psw.email, '')) <> v_caller_email THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
    END IF;
  END IF;

  -- ── QA ISOLATION GUARDS (applied to admins too: test/prod never mix) ──
  v_booking_is_test := COALESCE(v_booking.is_test_data, false);
  v_psw_is_test     := COALESCE(v_psw.is_test, false);

  IF (v_booking_is_test = true) AND (v_psw_is_test = false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'qa_booking_not_claimable');
  END IF;

  IF (v_booking_is_test = false) AND (v_psw_is_test = true) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'qa_account_cannot_claim_production');
  END IF;

  IF (v_booking_is_test = true)
     AND ((v_booking.test_target_psw_id IS NULL) OR (v_booking.test_target_psw_id <> p_psw_id)) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'qa_booking_wrong_target');
  END IF;

  IF v_psw.vetting_status <> 'approved' OR COALESCE(v_psw.lifecycle_status, 'active') <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'psw_not_eligible');
  END IF;

  IF v_psw.police_check_date IS NOT NULL
     AND (v_psw.police_check_date + INTERVAL '1 year') < CURRENT_DATE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'vsc_expired');
  END IF;

  IF COALESCE(v_booking.is_transport_booking, false) = true
     AND NOT v_is_admin
     AND COALESCE(v_psw.has_own_transport, '') <> 'yes-car' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'vehicle_required');
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
$function$;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 5 — QA RECIPIENT ALLOW-LIST (fails closed, admin-only)
-- ═══════════════════════════════════════════════════════════════
-- Stored under app_settings.setting_key = 'qa_test_recipients' as a JSON array
-- of lowercase email addresses. NOT included in the public-readable key list.
-- Intentionally left EMPTY until real QA addresses are supplied.

INSERT INTO public.app_settings (setting_key, setting_value)
SELECT 'qa_test_recipients', '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings WHERE setting_key = 'qa_test_recipients');

CREATE OR REPLACE FUNCTION public.is_qa_allowed_recipient(p_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_list jsonb;
BEGIN
  IF (p_email IS NULL) OR (btrim(p_email) = '') THEN
    RETURN false; -- fail closed
  END IF;

  SELECT setting_value INTO v_list
  FROM public.app_settings WHERE setting_key = 'qa_test_recipients';

  IF (v_list IS NULL) OR (jsonb_typeof(v_list) <> 'array') OR (jsonb_array_length(v_list) = 0) THEN
    RETURN false; -- missing / malformed / empty => fail closed
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(v_list) AS e(addr)
    WHERE lower(btrim(e.addr)) = lower(btrim(p_email))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_qa_allowed_recipient(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_qa_allowed_recipient(text) TO service_role;


-- ═══════════════════════════════════════════════════════════════
-- PHASE 6 — FINANCIAL / OPERATIONAL HARD GUARDS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.block_financial_records_for_test_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_is_test boolean := false;
BEGIN
  IF (TG_TABLE_NAME = 'payroll_entries') THEN
    v_booking_id := NEW.shift_id;
  ELSE
    v_booking_id := NEW.booking_id;
  END IF;

  IF v_booking_id IS NOT NULL THEN
    SELECT COALESCE(b.is_test_data, false) INTO v_is_test
    FROM public.bookings b WHERE b.id = v_booking_id;
  END IF;

  IF COALESCE(v_is_test, false) = true THEN
    RAISE EXCEPTION 'QA test bookings cannot generate % records', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_test_invoices ON public.invoices;
CREATE TRIGGER trg_block_test_invoices
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.block_financial_records_for_test_bookings();

DROP TRIGGER IF EXISTS trg_block_test_payroll ON public.payroll_entries;
CREATE TRIGGER trg_block_test_payroll
  BEFORE INSERT ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION public.block_financial_records_for_test_bookings();

DROP TRIGGER IF EXISTS trg_block_test_unserved ON public.unserved_orders;
CREATE TRIGGER trg_block_test_unserved
  BEFORE INSERT ON public.unserved_orders
  FOR EACH ROW EXECUTE FUNCTION public.block_financial_records_for_test_bookings();

COMMENT ON COLUMN public.bookings.is_test_data IS 'QA isolation flag. true = synthetic QA order: excluded from dispatch fan-out, expiry, unserved, reporting, payments and payroll.';
COMMENT ON COLUMN public.bookings.test_target_psw_id IS 'The ONLY psw_profiles.id allowed to see or claim this QA test booking.';
COMMENT ON COLUMN public.client_profiles.is_test_data IS 'QA isolation flag for synthetic QA client records.';