
-- Add rejection workflow columns to psw_profiles
ALTER TABLE public.psw_profiles 
  ADD COLUMN IF NOT EXISTS rejection_reasons text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rejection_notes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS resubmitted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS application_version integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS last_status_change_at timestamptz DEFAULT now();

-- Create transactional email log table
CREATE TABLE IF NOT EXISTS public.transactional_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_type text NOT NULL CHECK (recipient_type IN ('psw', 'client', 'admin')),
  template_key text NOT NULL,
  entity_id uuid DEFAULT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'blocked')),
  error_message text DEFAULT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for transactional_email_log
ALTER TABLE public.transactional_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read transactional email log" ON public.transactional_email_log
  FOR SELECT USING (is_admin() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert transactional email log" ON public.transactional_email_log
  FOR INSERT WITH CHECK (is_admin() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert transactional email log" ON public.transactional_email_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can delete transactional email log" ON public.transactional_email_log
  FOR DELETE USING (is_admin() OR has_role(auth.uid(), 'admin'::app_role));
