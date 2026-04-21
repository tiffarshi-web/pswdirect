-- =====================================================================
-- PSW Self-Service Profile: bio + availability + pending update queue
-- =====================================================================

-- 1. Add new self-service columns to psw_profiles
ALTER TABLE public.psw_profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS availability text;

-- 2. Pending updates queue (for restricted fields: VSC, gov ID, verified certs)
CREATE TABLE IF NOT EXISTS public.psw_pending_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psw_id uuid NOT NULL REFERENCES public.psw_profiles(id) ON DELETE CASCADE,
  field_name text NOT NULL,                  -- e.g. 'police_check', 'gov_id', 'psw_cert'
  old_value jsonb,                           -- snapshot of current verified value
  new_value jsonb NOT NULL,                  -- proposed new value (url + name + meta)
  status text NOT NULL DEFAULT 'pending',    -- pending | approved | rejected
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psw_pending_updates_status ON public.psw_pending_updates(status);
CREATE INDEX IF NOT EXISTS idx_psw_pending_updates_psw ON public.psw_pending_updates(psw_id);

ALTER TABLE public.psw_pending_updates ENABLE ROW LEVEL SECURITY;

-- PSWs can view & insert their own pending updates
CREATE POLICY "PSWs view own pending updates"
  ON public.psw_pending_updates FOR SELECT
  TO authenticated
  USING (psw_id IN (SELECT id FROM public.psw_profiles WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "PSWs insert own pending updates"
  ON public.psw_pending_updates FOR INSERT
  TO authenticated
  WITH CHECK (psw_id IN (SELECT id FROM public.psw_profiles WHERE email = (auth.jwt() ->> 'email')));

-- Admins full access
CREATE POLICY "Admins manage pending updates"
  ON public.psw_pending_updates FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_psw_pending_updates_updated_at ON public.psw_pending_updates;
CREATE TRIGGER trg_psw_pending_updates_updated_at
  BEFORE UPDATE ON public.psw_pending_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Profile change audit log (covers self-service edits + approvals)
CREATE TABLE IF NOT EXISTS public.psw_profile_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psw_id uuid NOT NULL,
  psw_email text,
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  change_type text NOT NULL,                 -- 'self_service' | 'pending_submitted' | 'admin_approved' | 'admin_rejected'
  performed_by text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psw_profile_audit_psw ON public.psw_profile_audit(psw_id);
CREATE INDEX IF NOT EXISTS idx_psw_profile_audit_created ON public.psw_profile_audit(created_at DESC);

ALTER TABLE public.psw_profile_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read profile audit"
  ON public.psw_profile_audit FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins insert profile audit"
  ON public.psw_profile_audit FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "PSWs view own audit"
  ON public.psw_profile_audit FOR SELECT
  TO authenticated
  USING (psw_email = (auth.jwt() ->> 'email'));

-- Allow authenticated PSWs to insert their own self-service audit entries
CREATE POLICY "PSWs insert own audit"
  ON public.psw_profile_audit FOR INSERT
  TO authenticated
  WITH CHECK (psw_email = (auth.jwt() ->> 'email'));

-- 4. RPC: approve a pending update (admin only)
CREATE OR REPLACE FUNCTION public.admin_approve_psw_update(p_update_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin text;
  v_update record;
  v_new jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  SELECT * INTO v_update FROM public.psw_pending_updates WHERE id = p_update_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Pending update not found or already processed'; END IF;

  v_new := v_update.new_value;

  -- Apply the new value to psw_profiles based on field_name
  IF v_update.field_name = 'police_check' THEN
    UPDATE public.psw_profiles
    SET police_check_url = v_new ->> 'url',
        police_check_name = v_new ->> 'name',
        police_check_date = NULLIF(v_new ->> 'date','')::date,
        expired_due_to_police_check = false,
        updated_at = now()
    WHERE id = v_update.psw_id;
  ELSIF v_update.field_name = 'gov_id' THEN
    UPDATE public.psw_profiles
    SET gov_id_url = v_new ->> 'url',
        gov_id_type = COALESCE(v_new ->> 'type', gov_id_type),
        gov_id_status = 'verified',
        gov_id_reviewed_at = now(),
        gov_id_reviewed_by = v_admin,
        updated_at = now()
    WHERE id = v_update.psw_id;
  ELSIF v_update.field_name = 'psw_cert' THEN
    UPDATE public.psw_profiles
    SET psw_cert_url = v_new ->> 'url',
        psw_cert_name = v_new ->> 'name',
        psw_cert_status = 'verified',
        psw_cert_reviewed_at = now(),
        psw_cert_reviewed_by = v_admin,
        updated_at = now()
    WHERE id = v_update.psw_id;
  END IF;

  UPDATE public.psw_pending_updates
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = v_admin,
      review_note = p_note
  WHERE id = p_update_id;

  INSERT INTO public.psw_profile_audit (psw_id, psw_email, field_name, old_value, new_value, change_type, performed_by, note)
  SELECT v_update.psw_id, p.email, v_update.field_name, v_update.old_value, v_update.new_value,
         'admin_approved', v_admin, p_note
  FROM public.psw_profiles p WHERE p.id = v_update.psw_id;
END;
$$;

-- 5. RPC: reject a pending update (admin only)
CREATE OR REPLACE FUNCTION public.admin_reject_psw_update(p_update_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin text;
  v_update record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  SELECT * INTO v_update FROM public.psw_pending_updates WHERE id = p_update_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Pending update not found or already processed'; END IF;

  UPDATE public.psw_pending_updates
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = v_admin,
      review_note = p_note
  WHERE id = p_update_id;

  INSERT INTO public.psw_profile_audit (psw_id, psw_email, field_name, old_value, new_value, change_type, performed_by, note)
  SELECT v_update.psw_id, p.email, v_update.field_name, v_update.old_value, v_update.new_value,
         'admin_rejected', v_admin, p_note
  FROM public.psw_profiles p WHERE p.id = v_update.psw_id;
END;
$$;