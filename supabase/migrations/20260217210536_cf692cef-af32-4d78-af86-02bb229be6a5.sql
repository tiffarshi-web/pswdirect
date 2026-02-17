
-- Create message_templates table
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT '',
  channel text NOT NULL DEFAULT 'email',
  enabled boolean NOT NULL DEFAULT true,
  subject text NOT NULL DEFAULT '',
  html text NOT NULL DEFAULT '',
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all message templates"
  ON public.message_templates FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read enabled templates"
  ON public.message_templates FOR SELECT
  USING (enabled = true);

CREATE POLICY "Admins can insert message templates"
  ON public.message_templates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update message templates"
  ON public.message_templates FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete message templates"
  ON public.message_templates FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create notification_queue table
CREATE TABLE public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  to_email text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can read notification queue"
  ON public.notification_queue FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert notification queue"
  ON public.notification_queue FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update notification queue"
  ON public.notification_queue FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete notification queue"
  ON public.notification_queue FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow anon/authenticated to insert (for PSA signup enqueue)
CREATE POLICY "Anyone can enqueue notifications"
  ON public.notification_queue FOR INSERT
  WITH CHECK (true);

-- Create email_history table (for queue processor logging)
CREATE TABLE public.email_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  to_email text NOT NULL,
  subject text NOT NULL DEFAULT '',
  html text NOT NULL DEFAULT '',
  resend_response jsonb,
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read email history"
  ON public.email_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert email history"
  ON public.email_history FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete email history"
  ON public.email_history FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on message_templates
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
