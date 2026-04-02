
-- Function to send VSC expiry warnings (40 days before), idempotent
CREATE OR REPLACE FUNCTION public.send_vsc_expiry_warnings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_psw record;
  v_already_notified boolean;
BEGIN
  FOR v_psw IN
    SELECT p.id, p.first_name, p.last_name, p.email, p.police_check_date,
           ((p.police_check_date + INTERVAL '1 year')::date - CURRENT_DATE)::integer as days_until_expiry
    FROM public.psw_profiles p
    WHERE p.vetting_status = 'approved'
      AND p.police_check_date IS NOT NULL
      AND (p.police_check_date + INTERVAL '1 year') > CURRENT_DATE
      AND (p.police_check_date + INTERVAL '1 year') <= (CURRENT_DATE + INTERVAL '40 days')
  LOOP
    -- Check if we already sent a warning in the last 7 days
    SELECT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_email = v_psw.email
        AND type = 'vsc_expiring_soon'
        AND created_at > (now() - INTERVAL '7 days')
    ) INTO v_already_notified;

    IF NOT v_already_notified THEN
      INSERT INTO public.notifications (user_email, title, body, type)
      VALUES (
        v_psw.email,
        '⚠️ VSC Expiring Soon',
        'Your Vulnerable Sector Check expires in ' || v_psw.days_until_expiry || ' days (on ' || 
          to_char(v_psw.police_check_date + INTERVAL '1 year', 'Mon DD, YYYY') || 
          '). Please upload a new VSC before it expires to continue receiving shifts.',
        'vsc_expiring_soon'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Combined daily check function
CREATE OR REPLACE FUNCTION public.daily_vsc_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_expired integer;
  v_warned integer;
BEGIN
  v_expired := public.auto_expire_vsc_psws();
  v_warned := public.send_vsc_expiry_warnings();
  
  RETURN jsonb_build_object(
    'expired_count', v_expired,
    'warned_count', v_warned,
    'run_at', now()
  );
END;
$$;
