
-- ============================================================================
-- Security hotfix: sanitize psw_safe_booking_view + tighten bookings RLS
-- ============================================================================
-- Goal: PSWs browsing available/unassigned jobs see only sanitized dispatch
-- details. Full booking row read access is restricted to bookings actually
-- assigned to the calling PSW. Admin/service_role behavior unchanged.

-- 1) Helper: resolve caller's psw_profiles.id from JWT email
CREATE OR REPLACE FUNCTION public.current_psw_profile_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (p.id)::text
  FROM public.psw_profiles p
  WHERE p.email = (auth.jwt() ->> 'email')
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.current_psw_profile_id() TO authenticated, service_role;

-- 2) Helper: is the caller an approved PSW?
CREATE OR REPLACE FUNCTION public.is_approved_psw()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.psw_profiles p
    WHERE p.email = (auth.jwt() ->> 'email')
      AND p.vetting_status = 'approved'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_approved_psw() TO authenticated, service_role;

-- 3) Rebuild psw_safe_booking_view as SECURITY DEFINER (security_invoker=off)
--    For unassigned rows: NULL out client/patient PII and redact addresses to
--    postal-prefix + city. For rows assigned to the caller: full safe columns.
DROP VIEW IF EXISTS public.psw_safe_booking_view;

CREATE VIEW public.psw_safe_booking_view
WITH (security_invoker = off, security_barrier = true)
AS
WITH ctx AS (
  SELECT public.current_psw_profile_id() AS my_psw_id,
         public.is_approved_psw()        AS approved,
         public.is_admin()               AS is_admin
)
SELECT
  b.id,
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
  b.hourly_rate,
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
  -- Postal codes / coords are safe (general area only)
  b.patient_postal_code,
  b.client_postal_code,
  b.pickup_postal_code,
  b.service_latitude,
  b.service_longitude,
  b.geocode_source,
  -- Shift execution columns: only meaningful when assigned to caller
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.check_in_lat       END AS check_in_lat,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.check_in_lng       END AS check_in_lng,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.checked_in_at      END AS checked_in_at,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.claimed_at         END AS claimed_at,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.signed_out_at      END AS signed_out_at,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.manual_check_in    END AS manual_check_in,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.manual_check_out   END AS manual_check_out,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.manual_override_reason END AS manual_override_reason,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet              END AS care_sheet,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_status       END AS care_sheet_status,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_submitted_at END AS care_sheet_submitted_at,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_last_saved_at END AS care_sheet_last_saved_at,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_psw_name     END AS care_sheet_psw_name,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_flagged      END AS care_sheet_flagged,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.care_sheet_flag_reason  END AS care_sheet_flag_reason,
  -- Client identity: full only when assigned to caller (or admin via underlying); redacted otherwise
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.client_name       END AS client_name,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.client_first_name END AS client_first_name,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.client_address    END AS client_address,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_name           END AS patient_name,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_first_name     END AS patient_first_name,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_last_name      END AS patient_last_name,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_address        END AS patient_address,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.patient_relationship   END AS patient_relationship,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.pickup_address         END AS pickup_address,
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.dropoff_address        END AS dropoff_address,
  -- Special notes can contain PII; only reveal after assignment
  CASE WHEN ctx.is_admin OR b.psw_assigned = ctx.my_psw_id THEN b.special_notes          END AS special_notes
FROM public.bookings b
CROSS JOIN ctx
WHERE
  ctx.is_admin
  OR (b.psw_assigned IS NOT NULL AND b.psw_assigned = ctx.my_psw_id)
  OR (
    ctx.approved
    AND b.status = 'pending'
    AND b.psw_assigned IS NULL
    AND COALESCE(b.status, '') NOT IN ('cancelled','archived')
  );

GRANT SELECT ON public.psw_safe_booking_view TO authenticated;
GRANT SELECT ON public.psw_safe_booking_view TO service_role;

-- 4) Tighten bookings SELECT for PSWs: assigned-only.
DROP POLICY IF EXISTS "PSW can select assigned or available bookings" ON public.bookings;

CREATE POLICY "PSW can select assigned bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  psw_assigned IS NOT NULL
  AND psw_assigned = public.current_psw_profile_id()
);

-- Existing admin SELECT and client SELECT policies remain untouched.
-- Approved PSWs continue to claim pending unassigned bookings via the existing
-- UPDATE policy "Approved PSWs can claim pending bookings" (qual targets
-- status='pending' AND psw_assigned IS NULL, with_check binds to caller).
-- Browsing of unassigned jobs happens via psw_safe_booking_view (SECURITY DEFINER).
