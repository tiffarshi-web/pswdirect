
-- Add payment_method_id to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_payment_method_id text;

-- Create overtime_charges table for admin approval flow
CREATE TABLE public.overtime_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  booking_code text NOT NULL,
  client_email text NOT NULL,
  client_name text NOT NULL,
  psw_id text NOT NULL,
  psw_name text NOT NULL,
  scheduled_start time NOT NULL,
  scheduled_end time NOT NULL,
  actual_sign_out timestamptz NOT NULL,
  overtime_minutes integer NOT NULL,
  billable_minutes integer NOT NULL,
  hourly_rate numeric NOT NULL,
  overtime_amount numeric NOT NULL,
  stripe_customer_id text,
  stripe_payment_method_id text,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending_admin',
  failure_reason text,
  admin_approved_by text,
  approved_at timestamptz,
  charged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.overtime_charges ENABLE ROW LEVEL SECURITY;

-- RLS policies - admin only
CREATE POLICY "Admins can read overtime charges"
  ON public.overtime_charges FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert overtime charges"
  ON public.overtime_charges FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update overtime charges"
  ON public.overtime_charges FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete overtime charges"
  ON public.overtime_charges FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert (for edge functions)
CREATE POLICY "Service can insert overtime charges"
  ON public.overtime_charges FOR INSERT TO anon
  WITH CHECK (true);

-- Clients can view own overtime charges
CREATE POLICY "Clients can view own overtime charges"
  ON public.overtime_charges FOR SELECT TO authenticated
  USING (client_email = (auth.jwt() ->> 'email'::text));
