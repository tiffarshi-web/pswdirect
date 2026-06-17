-- Close the residual PII leak vector: an approved PSW could in theory
-- exploit the "Approved PSWs can claim pending bookings" UPDATE policy with
-- an UPDATE ... RETURNING client_email, stripe_customer_id, client_date_of_birth, ...
-- against any pending row at the moment of claim.
--
-- Route ALL claims through the SECURITY DEFINER RPC public.claim_booking(...),
-- which performs its own caller checks and returns only safe fields.
-- Drop the direct UPDATE policy so PostgREST UPDATEs from PSWs against
-- pending bookings are no longer possible.
--
-- Post-claim updates (check-in, sign-out, care-sheet, unclaim) remain allowed
-- by "Assigned PSW can update own booking", which only matches rows where
-- psw_assigned is already the caller — no PII exposure beyond what
-- public.psw_safe_booking_view already permits.

DROP POLICY IF EXISTS "Approved PSWs can claim pending bookings" ON public.bookings;

COMMENT ON FUNCTION public.claim_booking(uuid, uuid, text, text, text, text) IS
  'Sole supported path for a PSW to claim a pending booking. SECURITY DEFINER; performs eligibility checks and atomic first-claim-wins. No direct PSW UPDATE policy on pending bookings exists.';