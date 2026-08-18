-- ─────────────────────────────────────────────────────────────
-- Multi-day bookings: one group, many single-visit bookings
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.booking_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code text UNIQUE,
  user_id uuid,
  client_name text,
  client_email text,
  client_phone text,
  visit_count integer NOT NULL DEFAULT 1,
  subtotal numeric NOT NULL DEFAULT 0,
  hst_amount numeric NOT NULL DEFAULT 0,
  parking_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'cad',
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'awaiting_payment',
  stripe_payment_intent_id text,
  stripe_customer_id text,
  stripe_payment_method_id text,
  invoice_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.booking_groups TO authenticated;
GRANT ALL ON public.booking_groups TO service_role;

ALTER TABLE public.booking_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all booking groups"
  ON public.booking_groups FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Clients view own booking groups"
  ON public.booking_groups FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Clients create own booking groups"
  ON public.booking_groups FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_booking_groups_updated_at
  BEFORE UPDATE ON public.booking_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link individual visits to their group
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_group_id uuid REFERENCES public.booking_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visit_index integer;

CREATE INDEX IF NOT EXISTS idx_bookings_booking_group_id
  ON public.bookings (booking_group_id) WHERE booking_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_groups_pi
  ON public.booking_groups (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- Keep the group status in step with its visits
CREATE OR REPLACE FUNCTION public.sync_booking_group_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group uuid := COALESCE(NEW.booking_group_id, OLD.booking_group_id);
  v_total int;
  v_cancelled int;
  v_completed int;
BEGIN
  IF v_group IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE status = 'cancelled'),
         count(*) FILTER (WHERE status = 'completed')
    INTO v_total, v_cancelled, v_completed
    FROM public.bookings
   WHERE booking_group_id = v_group;

  UPDATE public.booking_groups
     SET status = CASE
                    WHEN v_total > 0 AND v_cancelled = v_total THEN 'cancelled'
                    WHEN v_total > 0 AND (v_cancelled + v_completed) = v_total THEN 'completed'
                    ELSE 'active'
                  END,
         updated_at = now()
   WHERE id = v_group;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_booking_group_status
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_booking_group_status();