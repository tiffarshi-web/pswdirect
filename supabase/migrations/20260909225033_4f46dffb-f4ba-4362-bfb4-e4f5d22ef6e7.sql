CREATE TABLE IF NOT EXISTS public.worker_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  app_version text,
  device_model text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_worker_push_tokens_user ON public.worker_push_tokens (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_push_tokens TO authenticated;
GRANT ALL ON public.worker_push_tokens TO service_role;

ALTER TABLE public.worker_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers manage their own device tokens"
  ON public.worker_push_tokens FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view device tokens"
  ON public.worker_push_tokens FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE TRIGGER update_worker_push_tokens_updated_at
  BEFORE UPDATE ON public.worker_push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();