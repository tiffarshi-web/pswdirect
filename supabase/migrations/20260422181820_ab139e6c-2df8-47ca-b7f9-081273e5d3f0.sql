-- Insert the service role key into vault so the assignment trigger can call the edge function.
-- This must be run by a privileged role (migrations run as postgres/supabase_admin).
DO $$
DECLARE
  v_existing uuid;
  v_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdmlib2JlcnZocWtmendrb3R3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQxMjg5OCwiZXhwIjoyMDgzOTg4ODk4fQ.PLACEHOLDER';
BEGIN
  -- We DON'T want to hardcode the real key here. Instead, check if it exists; if not,
  -- create a placeholder so the trigger code path doesn't crash. The actual key must
  -- be set via the Supabase dashboard or by editing this secret.
  SELECT id INTO v_existing FROM vault.secrets WHERE name = 'service_role_key' LIMIT 1;
  IF v_existing IS NULL THEN
    PERFORM vault.create_secret(
      v_key,
      'service_role_key',
      'Service role key used by DB triggers to call edge functions. UPDATE THIS with the real key.'
    );
  END IF;
END $$;