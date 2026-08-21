CREATE TABLE IF NOT EXISTS public.internal_invoke_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

GRANT ALL ON public.internal_invoke_tokens TO service_role;

ALTER TABLE public.internal_invoke_tokens ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role (which bypasses RLS) may touch this table.

CREATE INDEX IF NOT EXISTS idx_internal_invoke_tokens_created_at
  ON public.internal_invoke_tokens (created_at);

CREATE OR REPLACE FUNCTION public._invoke_edge_function(p_function_name text, p_body jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url text;
  v_service_key text;
  v_token uuid;
  v_headers jsonb;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_url
      FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
    SELECT decrypted_secret INTO v_service_key
      FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL;
  END;

  IF v_url IS NULL THEN
    v_url := 'https://pavibobervhqkfzwkotw.supabase.co';
  END IF;

  -- Single-use internal handshake token: lets the edge function authorize this
  -- database-originated call even when the vault service key is stale.
  INSERT INTO public.internal_invoke_tokens (function_name)
  VALUES (p_function_name)
  RETURNING token INTO v_token;

  DELETE FROM public.internal_invoke_tokens
   WHERE created_at < now() - interval '1 day';

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-internal-invoke-token', v_token::text
  );

  IF v_service_key IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || v_service_key);
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/' || p_function_name,
    headers := v_headers,
    body := p_body
  );
END;
$function$;