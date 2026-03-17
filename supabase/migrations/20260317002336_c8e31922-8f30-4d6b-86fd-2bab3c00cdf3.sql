CREATE TABLE public.dispatch_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_code text NOT NULL,
  matched_psw_ids text[] DEFAULT '{}',
  matched_psw_emails text[] DEFAULT '{}',
  channels_sent text[] DEFAULT '{}',
  claimed_by_psw_id text,
  claimed_at timestamptz,
  admin_assigned boolean DEFAULT false,
  admin_assigned_at timestamptz,
  marked_unserved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dispatch_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read dispatch logs" ON public.dispatch_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert dispatch logs" ON public.dispatch_logs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update dispatch logs" ON public.dispatch_logs
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert dispatch logs" ON public.dispatch_logs
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Service can update dispatch logs" ON public.dispatch_logs
  FOR UPDATE TO anon USING (true);