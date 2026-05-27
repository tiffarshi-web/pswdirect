
-- =========================================================================
-- PSW SELF-EDIT HARDENING & STORAGE FIX
-- 1. Allow PSWs to UPDATE/DELETE objects in their own psw-documents folder
--    (needed for profile-photo replacement via upsert).
-- 2. Replace the over-permissive "PSWs can update their own profile" policy
--    with one that has a WITH CHECK guard so PSWs cannot self-modify
--    admin-controlled fields (vetting, lifecycle, police-check, audit).
-- =========================================================================

-- 1. STORAGE: PSWs can UPDATE/DELETE files in their own folder
DROP POLICY IF EXISTS "PSW update own folder" ON storage.objects;
CREATE POLICY "PSW update own folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'psw-documents' AND (storage.foldername(name))[1] = (auth.uid())::text)
  WITH CHECK (bucket_id = 'psw-documents' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "PSW delete own folder" ON storage.objects;
CREATE POLICY "PSW delete own folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'psw-documents' AND (storage.foldername(name))[1] = (auth.uid())::text);

-- 2. PSW PROFILE: guard sensitive fields on self-update via trigger
CREATE OR REPLACE FUNCTION public.guard_psw_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Admins can change anything
  v_is_admin := public.is_admin();
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Only the PSW themselves reaches here (RLS already restricted to own row).
  -- Block changes to fields that must remain admin-controlled.
  IF NEW.vetting_status IS DISTINCT FROM OLD.vetting_status THEN
    NEW.vetting_status := OLD.vetting_status;
  END IF;
  IF NEW.vetting_notes IS DISTINCT FROM OLD.vetting_notes THEN
    NEW.vetting_notes := OLD.vetting_notes;
  END IF;
  IF NEW.vetting_updated_at IS DISTINCT FROM OLD.vetting_updated_at THEN
    NEW.vetting_updated_at := OLD.vetting_updated_at;
  END IF;
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    NEW.approved_at := OLD.approved_at;
  END IF;
  IF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    NEW.lifecycle_status := OLD.lifecycle_status;
  END IF;
  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    NEW.archived_at := OLD.archived_at;
  END IF;
  IF NEW.archived_by IS DISTINCT FROM OLD.archived_by THEN
    NEW.archived_by := OLD.archived_by;
  END IF;
  IF NEW.archive_reason IS DISTINCT FROM OLD.archive_reason THEN
    NEW.archive_reason := OLD.archive_reason;
  END IF;
  IF NEW.expired_due_to_police_check IS DISTINCT FROM OLD.expired_due_to_police_check THEN
    NEW.expired_due_to_police_check := OLD.expired_due_to_police_check;
  END IF;
  -- Police check fields must be admin-approved through psw_pending_updates
  IF NEW.police_check_url IS DISTINCT FROM OLD.police_check_url THEN
    NEW.police_check_url := OLD.police_check_url;
  END IF;
  IF NEW.police_check_name IS DISTINCT FROM OLD.police_check_name THEN
    NEW.police_check_name := OLD.police_check_name;
  END IF;
  IF NEW.police_check_date IS DISTINCT FROM OLD.police_check_date THEN
    NEW.police_check_date := OLD.police_check_date;
  END IF;
  -- Identity must not be self-changed
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    NEW.id := OLD.id;
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    NEW.email := OLD.email;
  END IF;
  IF NEW.psw_number IS DISTINCT FROM OLD.psw_number THEN
    NEW.psw_number := OLD.psw_number;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_psw_self_update ON public.psw_profiles;
CREATE TRIGGER trg_guard_psw_self_update
BEFORE UPDATE ON public.psw_profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_psw_self_update();
