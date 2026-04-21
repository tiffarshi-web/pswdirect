-- 1. Add lifecycle_status column with audit fields
ALTER TABLE public.psw_profiles
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by text,
  ADD COLUMN IF NOT EXISTS archive_reason text;

-- 2. Constrain values
ALTER TABLE public.psw_profiles
  DROP CONSTRAINT IF EXISTS psw_profiles_lifecycle_status_check;
ALTER TABLE public.psw_profiles
  ADD CONSTRAINT psw_profiles_lifecycle_status_check
  CHECK (lifecycle_status IN ('active', 'archived', 'banned'));

-- 3. Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_psw_profiles_lifecycle_status
  ON public.psw_profiles(lifecycle_status);

-- 4. Backfill: map existing deactivated PSWs to banned (preserve history)
UPDATE public.psw_profiles
SET lifecycle_status = 'banned'
WHERE vetting_status = 'deactivated'
  AND lifecycle_status = 'active';

-- 5. Archive a PSW
CREATE OR REPLACE FUNCTION public.admin_archive_psw(
  p_psw_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin text;
  v_psw record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  SELECT id, first_name, last_name, email
  INTO v_psw
  FROM public.psw_profiles WHERE id = p_psw_id;
  IF v_psw IS NULL THEN RAISE EXCEPTION 'PSW not found'; END IF;

  UPDATE public.psw_profiles
  SET lifecycle_status = 'archived',
      archived_at = now(),
      archived_by = v_admin,
      archive_reason = p_reason,
      updated_at = now()
  WHERE id = p_psw_id;

  INSERT INTO public.psw_status_audit (psw_id, psw_name, psw_email, action, reason, performed_by)
  VALUES (p_psw_id, v_psw.first_name || ' ' || v_psw.last_name, v_psw.email,
          'archived', p_reason, v_admin);
END;
$$;

-- 6. Restore an archived PSW
CREATE OR REPLACE FUNCTION public.admin_restore_psw(p_psw_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin text;
  v_psw record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  SELECT id, first_name, last_name, email, lifecycle_status
  INTO v_psw
  FROM public.psw_profiles WHERE id = p_psw_id;
  IF v_psw IS NULL THEN RAISE EXCEPTION 'PSW not found'; END IF;
  IF v_psw.lifecycle_status = 'active' THEN RETURN; END IF;

  UPDATE public.psw_profiles
  SET lifecycle_status = 'active',
      archived_at = NULL,
      archived_by = NULL,
      archive_reason = NULL,
      updated_at = now()
  WHERE id = p_psw_id;

  INSERT INTO public.psw_status_audit (psw_id, psw_name, psw_email, action, reason, performed_by)
  VALUES (p_psw_id, v_psw.first_name || ' ' || v_psw.last_name, v_psw.email,
          'restored_to_active', 'Restored from ' || v_psw.lifecycle_status, v_admin);
END;
$$;

-- 7. Ban a PSW (separate from archive)
CREATE OR REPLACE FUNCTION public.admin_ban_psw(
  p_psw_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin text;
  v_psw record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  SELECT id, first_name, last_name, email
  INTO v_psw
  FROM public.psw_profiles WHERE id = p_psw_id;
  IF v_psw IS NULL THEN RAISE EXCEPTION 'PSW not found'; END IF;

  UPDATE public.psw_profiles
  SET lifecycle_status = 'banned',
      vetting_status = 'deactivated',
      banned_at = now(),
      vetting_updated_at = now(),
      updated_at = now()
  WHERE id = p_psw_id;

  INSERT INTO public.psw_status_audit (psw_id, psw_name, psw_email, action, reason, performed_by)
  VALUES (p_psw_id, v_psw.first_name || ' ' || v_psw.last_name, v_psw.email,
          'banned', p_reason, v_admin);
END;
$$;

-- 8. Unban (with confirmation handled in UI)
CREATE OR REPLACE FUNCTION public.admin_unban_psw(p_psw_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin text;
  v_psw record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  v_admin := COALESCE(auth.jwt() ->> 'email', 'admin');

  SELECT id, first_name, last_name, email
  INTO v_psw
  FROM public.psw_profiles WHERE id = p_psw_id;
  IF v_psw IS NULL THEN RAISE EXCEPTION 'PSW not found'; END IF;

  UPDATE public.psw_profiles
  SET lifecycle_status = 'active',
      vetting_status = 'approved',
      banned_at = NULL,
      flag_count = 0,
      flagged_at = NULL,
      archived_at = NULL,
      archived_by = NULL,
      archive_reason = NULL,
      vetting_updated_at = now(),
      updated_at = now()
  WHERE id = p_psw_id;

  INSERT INTO public.psw_status_audit (psw_id, psw_name, psw_email, action, reason, performed_by)
  VALUES (p_psw_id, v_psw.first_name || ' ' || v_psw.last_name, v_psw.email,
          'unbanned', 'Restored from banned to active', v_admin);
END;
$$;

-- 9. Update get_nearby_psws to exclude archived/banned from dispatch
CREATE OR REPLACE FUNCTION public.get_nearby_psws(
  p_lat numeric, p_lng numeric, p_radius_km numeric DEFAULT 50
)
RETURNS TABLE(
  id uuid, first_name text, last_name text, home_city text,
  home_lat numeric, home_lng numeric, languages text[],
  gender text, years_experience text, profile_photo_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.home_city, p.home_lat, p.home_lng,
         p.languages, p.gender, p.years_experience, p.profile_photo_url
  FROM public.psw_profiles p
  WHERE p.vetting_status = 'approved'
    AND COALESCE(p.lifecycle_status, 'active') = 'active'
    AND p.home_lat IS NOT NULL
    AND p.home_lng IS NOT NULL
    AND (
      p.police_check_date IS NULL
      OR (p.police_check_date + INTERVAL '1 year') >= CURRENT_DATE
    )
    AND (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(p.home_lat)) *
        cos(radians(p.home_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(p.home_lat))
      )
    ) <= p_radius_km;
$$;