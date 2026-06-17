-- Security hardening: remove PSW direct SELECT on public.bookings.
-- PSWs must read assigned shift details only through the SECURITY DEFINER
-- view public.psw_safe_booking_view, which redacts sensitive columns
-- (client_email, client_phone, client_date_of_birth, insurance fields,
-- VAC/Veterans identifiers, stripe_customer_id, stripe_payment_method_id,
-- cc_email, internal admin notes, full billing metadata, etc.).
--
-- PSWs retain:
--   * UPDATE on bookings via "Assigned PSW can update own booking"
--     (used for check-in, sign-out, care-sheet submission, unclaim).
--   * UPDATE on pending/unassigned bookings via
--     "Approved PSWs can claim pending bookings" (claim path).
--   * SELECT through public.psw_safe_booking_view only.
--
-- Admins, clients (own rows), and service_role are unaffected.

DROP POLICY IF EXISTS "PSW can select assigned bookings" ON public.bookings;

COMMENT ON TABLE public.bookings IS
  'Direct SELECT on bookings is restricted to admins (is_admin()), the owning client (user_id/client_email), and service_role. PSWs MUST read via public.psw_safe_booking_view, which redacts client PII, payment identifiers, insurance/VAC data, and admin-only notes.';