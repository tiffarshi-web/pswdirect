-- Create PSW status audit log table for permanent tracking
CREATE TABLE public.psw_status_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  psw_id UUID NOT NULL,
  psw_name TEXT NOT NULL,
  psw_email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('activated', 'flagged', 'deactivated', 'reinstated')),
  reason TEXT,
  performed_by TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.psw_status_audit ENABLE ROW LEVEL SECURITY;

-- Admin can read all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.psw_status_audit
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can create audit logs
CREATE POLICY "Admins can create audit logs"
  ON public.psw_status_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups by PSW
CREATE INDEX idx_psw_status_audit_psw_id ON public.psw_status_audit(psw_id);
CREATE INDEX idx_psw_status_audit_created_at ON public.psw_status_audit(created_at DESC);

-- Add status column to psw_profiles if not exists (should be there already as vetting_status)
-- Update the column to support new status values
COMMENT ON COLUMN public.psw_profiles.vetting_status IS 'Status values: pending, approved, flagged, deactivated, rejected';