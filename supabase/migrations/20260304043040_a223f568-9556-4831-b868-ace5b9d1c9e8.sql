
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (is_admin() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service functions can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can read all notifications"
ON public.notifications FOR SELECT
USING (is_admin() OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_notifications_user_email ON public.notifications(user_email);
CREATE INDEX idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;

-- Update admin_clear_payout to insert notification
CREATE OR REPLACE FUNCTION public.admin_clear_payout(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_psw_id uuid;
  v_total numeric;
  v_psw_email text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get payout details
  SELECT psw_id, total_amount INTO v_psw_id, v_total
  FROM public.payout_requests
  WHERE id = p_request_id AND status = 'payout_ready';

  IF v_psw_id IS NULL THEN
    RETURN;
  END IF;

  -- Update payout request
  UPDATE public.payout_requests
  SET status = 'cleared', cleared_at = now()
  WHERE id = p_request_id AND status = 'payout_ready';

  -- Update payroll entries
  UPDATE public.payroll_entries
  SET status = 'cleared', cleared_at = now()
  WHERE payout_request_id = p_request_id;

  -- Get PSW email for notification
  SELECT email INTO v_psw_email FROM public.psw_profiles WHERE id = v_psw_id;

  -- Insert payday notification
  IF v_psw_email IS NOT NULL THEN
    INSERT INTO public.notifications (user_email, title, body, type)
    VALUES (
      v_psw_email,
      '💰 Payday from PSW Direct',
      '💰 Payday from PSW Direct: $' || ROUND(v_total, 2) || ' has been marked paid on ' || to_char(now() AT TIME ZONE 'America/Toronto', 'Mon DD, YYYY') || '. Thanks for helping families.',
      'payout_paid'
    );
  END IF;
END;
$$;

-- Also add notification on approve
CREATE OR REPLACE FUNCTION public.admin_approve_payout(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_psw_id uuid;
  v_total numeric;
  v_psw_email text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT psw_id, total_amount INTO v_psw_id, v_total
  FROM public.payout_requests
  WHERE id = p_request_id AND status = 'requested';

  UPDATE public.payout_requests
  SET status = 'approved', approved_at = now()
  WHERE id = p_request_id AND status = 'requested';

  IF v_psw_id IS NOT NULL THEN
    SELECT email INTO v_psw_email FROM public.psw_profiles WHERE id = v_psw_id;
    IF v_psw_email IS NOT NULL THEN
      INSERT INTO public.notifications (user_email, title, body, type)
      VALUES (
        v_psw_email,
        '✅ Payout Approved',
        'Your payout request for $' || ROUND(v_total, 2) || ' has been approved and is being processed.',
        'payout_approved'
      );
    END IF;
  END IF;
END;
$$;
