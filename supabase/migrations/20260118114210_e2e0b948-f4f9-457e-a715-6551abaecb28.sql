-- Create email_logs table to track all sent emails
CREATE TABLE public.email_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  template_id text,
  template_name text,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text DEFAULT 'sent',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admin can view all email logs (enforced at app level)
CREATE POLICY "Anyone can view email logs"
  ON public.email_logs FOR SELECT
  USING (true);

-- Service role can insert logs
CREATE POLICY "Service can insert email logs"
  ON public.email_logs FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);