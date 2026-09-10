CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  psw_profile_id uuid,
  source text NOT NULL DEFAULT 'worker_app',
  status text NOT NULL DEFAULT 'pending',
  verification_token_hash text,
  verified_at timestamptz,
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_deletion_requests_status_check CHECK (status IN ('awaiting_verification','pending','identity_verification_requested','completed','rejected','cancelled')),
  CONSTRAINT account_deletion_requests_source_check CHECK (source IN ('worker_app','public_web','office'))
);

CREATE UNIQUE INDEX account_deletion_requests_open_email_idx
  ON public.account_deletion_requests (lower(btrim(email)))
  WHERE status IN ('awaiting_verification','pending','identity_verification_requested');

CREATE INDEX account_deletion_requests_status_idx ON public.account_deletion_requests (status, requested_at DESC);

GRANT SELECT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requesters can read their own deletion request"
  ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(btrim(email)) = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
  );

CREATE POLICY "Admins can read all deletion requests"
  ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.set_account_deletion_requests_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER account_deletion_requests_updated_at
  BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_account_deletion_requests_updated_at();

-- Is there an open deletion request for this email?
CREATE OR REPLACE FUNCTION public.has_pending_account_deletion(_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_deletion_requests
    WHERE lower(btrim(email)) = lower(btrim(coalesce(_email, '')))
      AND status IN ('pending','identity_verification_requested')
  );
$$;

-- A caregiver with an open deletion request must not take on more work.
CREATE OR REPLACE FUNCTION public.block_assignment_when_deletion_pending()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
BEGIN
  IF NEW.psw_assigned IS NOT NULL
     AND NEW.psw_assigned <> ''
     AND NEW.psw_assigned IS DISTINCT FROM COALESCE(OLD.psw_assigned, '') THEN
    SELECT email INTO v_email FROM public.psw_profiles WHERE id::text = NEW.psw_assigned;
    IF v_email IS NOT NULL AND public.has_pending_account_deletion(v_email) THEN
      RAISE EXCEPTION 'account_deletion_pending'
        USING HINT = 'This caregiver has an open account-deletion request and cannot take new work.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_block_assignment_when_deletion_pending
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.block_assignment_when_deletion_pending();

-- Controlled office workflow.
CREATE OR REPLACE FUNCTION public.admin_resolve_account_deletion(
  p_request_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status text;
  v_row public.account_deletion_requests%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_status := CASE p_action
    WHEN 'complete' THEN 'completed'
    WHEN 'reject' THEN 'rejected'
    WHEN 'request_identity' THEN 'identity_verification_requested'
    WHEN 'cancel' THEN 'cancelled'
    ELSE NULL
  END;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'invalid_action';
  END IF;

  IF v_status IN ('rejected','cancelled') AND coalesce(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  UPDATE public.account_deletion_requests
     SET status = v_status,
         resolution_reason = p_reason,
         resolved_at = CASE WHEN v_status IN ('completed','rejected','cancelled') THEN now() ELSE NULL END,
         resolved_by = auth.uid()
   WHERE id = p_request_id
   RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  INSERT INTO public.admin_audit_log (action, entity_type, entity_id, details)
  VALUES (
    'account_deletion_' || v_status,
    'account_deletion_request',
    v_row.id,
    jsonb_build_object('email', v_row.email, 'reason', p_reason, 'source', v_row.source)
  );

  RETURN jsonb_build_object('ok', true, 'status', v_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_resolve_account_deletion(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_pending_account_deletion(text) TO authenticated, service_role;