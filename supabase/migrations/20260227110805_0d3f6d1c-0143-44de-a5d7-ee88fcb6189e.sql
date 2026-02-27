
CREATE TABLE public.unserved_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  service_type text,
  requested_start_time timestamptz,
  city text,
  postal_code_raw text,
  postal_fsa text,
  lat numeric,
  lng numeric,
  radius_checked_km numeric,
  psw_count_found integer NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT 'NO_PSW_IN_RADIUS',
  notes text
);

ALTER TABLE public.unserved_orders ENABLE ROW LEVEL SECURITY;

-- Admin read
CREATE POLICY "Admins can read unserved orders"
  ON public.unserved_orders FOR SELECT
  USING (public.is_admin() OR public.has_role(auth.uid(), 'admin'));

-- Admin delete
CREATE POLICY "Admins can delete unserved orders"
  ON public.unserved_orders FOR DELETE
  USING (public.is_admin() OR public.has_role(auth.uid(), 'admin'));

-- Anyone can insert (coverage check runs before auth)
CREATE POLICY "Anyone can insert unserved orders"
  ON public.unserved_orders FOR INSERT
  WITH CHECK (true);
