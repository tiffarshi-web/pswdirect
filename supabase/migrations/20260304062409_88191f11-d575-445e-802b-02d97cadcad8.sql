
-- Add flagging columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS care_sheet_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS care_sheet_flag_reason text[] DEFAULT '{}';

-- Create audit log table for care sheet contact info detection
CREATE TABLE public.care_sheet_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  psw_id text NOT NULL,
  detected_patterns text[] NOT NULL DEFAULT '{}',
  raw_text_snippet text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.care_sheet_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can read care sheet audit log"
  ON public.care_sheet_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete care sheet audit log"
  ON public.care_sheet_audit_log FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Anyone authenticated can insert (PSWs insert during submission)
CREATE POLICY "Authenticated users can insert audit log"
  ON public.care_sheet_audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Index for fast admin lookups
CREATE INDEX idx_care_sheet_audit_booking ON public.care_sheet_audit_log(booking_id);
CREATE INDEX idx_care_sheet_audit_created ON public.care_sheet_audit_log(created_at DESC);
