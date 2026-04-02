
-- Function to get VSC expiry status for a PSW
CREATE OR REPLACE FUNCTION public.get_vsc_status(p_police_check_date date)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_police_check_date IS NULL THEN 'no_date'
    WHEN (p_police_check_date + INTERVAL '1 year') < CURRENT_DATE THEN 'expired'
    WHEN (p_police_check_date + INTERVAL '1 year') <= (CURRENT_DATE + INTERVAL '40 days') THEN 'expiring_soon'
    ELSE 'active'
  END;
$$;

-- Function to auto-expire PSWs with expired VSC and log audit
CREATE OR REPLACE FUNCTION public.auto_expire_vsc_psws()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_psw record;
BEGIN
  FOR v_psw IN
    SELECT id, first_name, last_name, email, police_check_date
    FROM public.psw_profiles
    WHERE vetting_status = 'approved'
      AND police_check_date IS NOT NULL
      AND (police_check_date + INTERVAL '1 year') < CURRENT_DATE
  LOOP
    -- Move to pending
    UPDATE public.psw_profiles
    SET vetting_status = 'pending',
        vetting_notes = COALESCE(vetting_notes || E'\n', '') || 
          '[AUTO] VSC expired on ' || to_char(v_psw.police_check_date + INTERVAL '1 year', 'YYYY-MM-DD') || 
          '. PSW must upload a new VSC.',
        vetting_updated_at = now(),
        expired_due_to_police_check = true,
        approved_at = NULL,
        updated_at = now()
    WHERE id = v_psw.id;

    -- Audit trail
    INSERT INTO public.psw_status_audit (psw_id, psw_name, psw_email, action, reason, performed_by)
    VALUES (
      v_psw.id,
      v_psw.first_name || ' ' || v_psw.last_name,
      v_psw.email,
      'vsc_auto_expired',
      'VSC expired (issued ' || to_char(v_psw.police_check_date, 'YYYY-MM-DD') || ', expired ' || to_char(v_psw.police_check_date + INTERVAL '1 year', 'YYYY-MM-DD') || ')',
      'system'
    );

    -- Create notification
    INSERT INTO public.notifications (user_email, title, body, type)
    VALUES (
      v_psw.email,
      '⚠️ VSC Expired – Action Required',
      'Your Vulnerable Sector Check has expired. Please upload a new VSC to continue receiving shifts.',
      'vsc_expired'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Function to get PSWs with expiring VSC (within 40 days)
CREATE OR REPLACE FUNCTION public.get_expiring_vsc_psws()
RETURNS TABLE(id uuid, first_name text, last_name text, email text, police_check_date date, days_until_expiry integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.first_name, p.last_name, p.email, p.police_check_date,
         ((p.police_check_date + INTERVAL '1 year')::date - CURRENT_DATE)::integer as days_until_expiry
  FROM public.psw_profiles p
  WHERE p.vetting_status = 'approved'
    AND p.police_check_date IS NOT NULL
    AND (p.police_check_date + INTERVAL '1 year') > CURRENT_DATE
    AND (p.police_check_date + INTERVAL '1 year') <= (CURRENT_DATE + INTERVAL '40 days')
  ORDER BY days_until_expiry ASC;
$$;
