-- Add tracking column for the post-completion rebook nudge
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS rebook_nudge_sent_at timestamptz;

COMMENT ON COLUMN public.bookings.rebook_nudge_sent_at IS
  'Timestamp set when the post-completion rebook nudge (push + email) was sent. Prevents duplicates.';

CREATE INDEX IF NOT EXISTS idx_bookings_rebook_nudge_sent_at
  ON public.bookings (rebook_nudge_sent_at)
  WHERE rebook_nudge_sent_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- POST-COMPLETION REBOOK NUDGE
-- Sends an in-app notification + email shortly after order completion,
-- inviting the client to rebook in seconds with a deep link to the
-- one-click rebook flow.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_client_rebook_nudge_on_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_first_name text;
BEGIN
  -- Only fire once per booking, only on transition into 'completed'
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;
  IF NEW.rebook_nudge_sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.client_email IS NULL OR NEW.client_email = '' THEN
    RETURN NEW;
  END IF;

  v_first_name := COALESCE(NULLIF(NEW.client_first_name, ''), split_part(NEW.client_name, ' ', 1));

  -- 1) In-app push notification (consumed by useNotifications hook)
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_email = NEW.client_email
      AND type = 'rebook_nudge'
      AND body LIKE '%' || NEW.booking_code || '%'
  ) THEN
    INSERT INTO public.notifications (user_email, title, body, type)
    VALUES (
      NEW.client_email,
      '💙 Need care again?',
      'Book your next visit in seconds. Tap to rebook (Ref ' || NEW.booking_code || ').',
      'rebook_nudge'
    );
  END IF;

  -- 2) Email nudge via dedicated edge function
  PERFORM public._invoke_edge_function(
    'send-rebook-nudge-email',
    jsonb_build_object(
      'booking_id', NEW.id,
      'client_email', NEW.client_email,
      'client_first_name', v_first_name,
      'booking_code', NEW.booking_code
    )
  );

  NEW.rebook_nudge_sent_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_rebook_nudge ON public.bookings;
CREATE TRIGGER trg_notify_client_rebook_nudge
BEFORE UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_rebook_nudge_on_completed();