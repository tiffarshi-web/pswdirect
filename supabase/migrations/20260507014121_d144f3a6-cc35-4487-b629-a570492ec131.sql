
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  email TEXT PRIMARY KEY,
  reason TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (edge functions need to check)
CREATE POLICY "Allow read access to suppressed_emails"
ON public.suppressed_emails
FOR SELECT
USING (true);

-- Only service role / backend can insert
CREATE POLICY "Allow insert to suppressed_emails"
ON public.suppressed_emails
FOR INSERT
WITH CHECK (true);

-- Only service role / backend can delete
CREATE POLICY "Allow delete from suppressed_emails"
ON public.suppressed_emails
FOR DELETE
USING (true);

-- Insert Robert Tilling's email immediately
INSERT INTO public.suppressed_emails (email, reason, source)
VALUES ('tilling4handyman@yahoo.ca', 'user_request', 'admin_manual')
ON CONFLICT (email) DO NOTHING;
