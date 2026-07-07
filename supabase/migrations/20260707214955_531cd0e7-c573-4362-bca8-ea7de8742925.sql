-- Phase 0 security hardening: remove public INSERT on unserved_orders.
-- All writes must now go through the log-unserved-order edge function
-- (service_role) or other backend paths using service_role. Dispatch flow
-- (notify-psws, stripe-webhook, fulfill-unserved-order) already uses
-- service_role, so this drop preserves all production functionality.

DROP POLICY IF EXISTS "Anyone can insert unserved orders (constrained)" ON public.unserved_orders;
DROP POLICY IF EXISTS "Anyone can insert unserved orders" ON public.unserved_orders;
