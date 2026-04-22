-- Add review request tracking + auto-trigger after completion email
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS review_request_email_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bookings_review_request_email_sent_at
  ON public.bookings(review_request_email_sent_at);

-- Trigger function: fires when completion_email_sent_at is set
CREATE OR REPLACE FUNCTION public.notify_client_review_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when completion_email_sent_at transitions from NULL to a value
  IF NEW.completion_email_sent_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.completion_email_sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Dedup
  IF NEW.review_request_email_sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Skip refunded / cancelled
  IF COALESCE(NEW.was_refunded, false) = true OR NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  IF NEW.client_email IS NULL OR NEW.client_email = '' THEN
    RETURN NEW;
  END IF;

  PERFORM public._invoke_edge_function(
    'send-review-request-email',
    jsonb_build_object('booking_id', NEW.id)
  );

  NEW.review_request_email_sent_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_review_request ON public.bookings;
CREATE TRIGGER trg_notify_client_review_request
  BEFORE UPDATE OF completion_email_sent_at ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_review_request();