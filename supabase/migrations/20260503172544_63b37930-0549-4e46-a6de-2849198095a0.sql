
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_recovery_alerted_at timestamptz;

CREATE OR REPLACE FUNCTION public.alert_admins_on_stale_incomplete_payments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_admin_email text;
  v_count integer := 0;
BEGIN
  FOR v_row IN
    SELECT id, booking_code, client_name, client_email, client_phone, total,
           scheduled_date, start_time, stripe_payment_intent_id, payment_status, created_at
      FROM public.bookings
     WHERE status = 'awaiting_payment'
       AND COALESCE(payment_status, 'awaiting_payment') IN
           ('awaiting_payment','payment_failed','payment_cancelled','payment_expired')
       AND created_at < now() - interval '5 minutes'
       AND payment_recovery_alerted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 100
  LOOP
    FOR v_admin_email IN
      SELECT DISTINCT email FROM (
        SELECT lower(email) AS email FROM public.admin_invitations
          WHERE status = 'accepted' AND accepted_at IS NOT NULL AND expires_at > now()
        UNION
        SELECT lower(au.email) FROM auth.users au
          JOIN public.user_roles ur ON ur.user_id = au.id
          WHERE ur.role = 'admin' AND au.email IS NOT NULL
      ) e WHERE email IS NOT NULL AND email <> ''
    LOOP
      INSERT INTO public.notifications (user_email, title, body, type)
      VALUES (
        v_admin_email,
        '⚠️ Incomplete payment >5 min',
        'Booking ' || COALESCE(v_row.booking_code, v_row.id::text)
          || COALESCE(' · ' || v_row.client_name, '')
          || COALESCE(' · $' || to_char(v_row.total, 'FM999990.00'), '')
          || ' has been awaiting payment for >5 minutes. Review in Orders → Incomplete Payments.',
        'incomplete_payment_alert'
      );
    END LOOP;

    UPDATE public.bookings
       SET payment_recovery_alerted_at = now()
     WHERE id = v_row.id;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Schedule every 5 minutes (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('alert-admins-stale-incomplete-payments');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'alert-admins-stale-incomplete-payments',
  '*/5 * * * *',
  $$ SELECT public.alert_admins_on_stale_incomplete_payments(); $$
);
