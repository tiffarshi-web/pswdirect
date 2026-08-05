CREATE OR REPLACE FUNCTION public.log_email_send(
  _recipient_email text,
  _subject text,
  _body text,
  _status text,
  _template_id uuid DEFAULT NULL,
  _template_name text DEFAULT NULL,
  _error_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF _status NOT IN ('sent','failed') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  INSERT INTO public.email_logs (
    template_id, template_name, recipient_email, subject, body, status, error_message, metadata
  ) VALUES (
    _template_id, _template_name, _recipient_email, _subject, left(coalesce(_body,''), 100000),
    _status, left(_error_message, 2000), '{}'::jsonb
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_email_send(text, text, text, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_email_send(text, text, text, text, uuid, text, text) TO anon, authenticated, service_role;