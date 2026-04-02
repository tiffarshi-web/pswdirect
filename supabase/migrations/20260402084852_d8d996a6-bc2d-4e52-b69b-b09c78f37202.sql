
-- Part 1: Shift time adjustments audit table
CREATE TABLE public.shift_time_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  original_clock_in TIMESTAMP WITH TIME ZONE,
  original_clock_out TIMESTAMP WITH TIME ZONE,
  adjusted_clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  adjusted_clock_out TIMESTAMP WITH TIME ZONE NOT NULL,
  adjustment_reason TEXT NOT NULL,
  adjusted_by TEXT NOT NULL,
  adjusted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_time_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shift adjustments"
  ON public.shift_time_adjustments
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_shift_time_adjustments_booking ON public.shift_time_adjustments(booking_id);

-- Part 2: Extend psw_banking with account_holder_name and banking_note
ALTER TABLE public.psw_banking
  ADD COLUMN IF NOT EXISTS account_holder_name TEXT,
  ADD COLUMN IF NOT EXISTS banking_note TEXT;

-- Fix missing INSERT policy for psw_banking (PSWs can add their own)
CREATE POLICY "PSW can insert own banking"
  ON public.psw_banking
  FOR INSERT
  TO authenticated
  WITH CHECK (psw_id IN (
    SELECT p.id FROM psw_profiles p WHERE p.email = (auth.jwt() ->> 'email')
  ));

-- Admin can insert banking
CREATE POLICY "Admin can insert banking"
  ON public.psw_banking
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admin can delete banking
CREATE POLICY "Admin can delete banking"
  ON public.psw_banking
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
