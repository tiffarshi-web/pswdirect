-- =============================================================================
-- Backward-compatible transition for complete_shift_signout
-- =============================================================================
-- The canonical (9-arg) complete_shift_signout was deployed on 2026-07-17.
-- Older installed PWA bundles cached before that release still call the
-- previous 11-arg signature with client-supplied overtime_minutes and
-- flagged_for_overtime. Those calls now fail with "function does not exist"
-- and strand PSWs at sign-out.
--
-- This migration restores the 11-arg overload as a thin compatibility
-- shim that:
--   * authenticates via public.current_psw_profile_id()
--   * IGNORES the client-supplied overtime values (server recomputes)
--   * delegates to the canonical (9-arg) implementation
--   * is atomic + idempotent (canonical function is the sole writer)
--   * returns the canonical shape (success/did_update/already_completed)
--
-- Removal target: 2026-10-01 (≥ 8 weeks after every active PSW has updated
-- their installed app). Do NOT drop before the analytics show zero calls to
-- this overload for at least two consecutive weeks.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.complete_shift_signout(
  _booking_id uuid,
  _care_sheet jsonb,
  _overtime_minutes integer,       -- IGNORED (server recomputes)
  _flagged_for_overtime boolean,   -- IGNORED (server recomputes)
  _sign_out_lat numeric,
  _sign_out_lng numeric,
  _sign_out_accuracy_m numeric,
  _sign_out_distance_m numeric,
  _sign_out_outside_radius boolean,
  _care_sheet_flagged boolean,
  _care_sheet_flag_reason jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Client-supplied overtime is intentionally discarded here so a stale
  -- browser cannot influence payroll. Auth/assignment checks and the
  -- conditional UPDATE all live inside the canonical function.
  RETURN public.complete_shift_signout(
    _booking_id,
    _care_sheet,
    _sign_out_lat,
    _sign_out_lng,
    _sign_out_accuracy_m,
    _sign_out_distance_m,
    _sign_out_outside_radius,
    _care_sheet_flagged,
    _care_sheet_flag_reason
  );
END;
$$;

COMMENT ON FUNCTION public.complete_shift_signout(
  uuid, jsonb, integer, boolean, numeric, numeric, numeric, numeric, boolean, boolean, jsonb
) IS 'DEPRECATED compatibility overload for pre-2026-07-17 PWA clients. Delegates to the canonical 9-arg complete_shift_signout. Scheduled for removal 2026-10-01 once stale clients have aged out.';

REVOKE ALL ON FUNCTION public.complete_shift_signout(
  uuid, jsonb, integer, boolean, numeric, numeric, numeric, numeric, boolean, boolean, jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_shift_signout(
  uuid, jsonb, integer, boolean, numeric, numeric, numeric, numeric, boolean, boolean, jsonb
) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_shift_signout(
  uuid, jsonb, integer, boolean, numeric, numeric, numeric, numeric, boolean, boolean, jsonb
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_shift_signout(
  uuid, jsonb, integer, boolean, numeric, numeric, numeric, numeric, boolean, boolean, jsonb
) TO service_role;
