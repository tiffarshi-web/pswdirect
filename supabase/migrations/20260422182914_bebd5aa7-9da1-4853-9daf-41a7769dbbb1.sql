
-- Add email audit/tracking timestamp columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_success_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS psw_assigned_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS psw_reassigned_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS order_updated_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS order_cancelled_email_sent_at timestamptz,
  -- refund_email_sent_at already exists from prior migration; add only if missing
  ADD COLUMN IF NOT EXISTS refund_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS care_sheet_sent_at timestamptz;

COMMENT ON COLUMN public.bookings.booking_confirmation_sent_at IS 'Timestamp set when the order received / booking confirmation email was sent to the client. Used to prevent duplicate sends.';
COMMENT ON COLUMN public.bookings.payment_success_email_sent_at IS 'Timestamp set when the payment success / receipt email was sent. Used to prevent duplicate sends.';
COMMENT ON COLUMN public.bookings.psw_assigned_email_sent_at IS 'Timestamp set when the initial PSW assignment email was sent. Used to prevent duplicate sends on the first assignment.';
COMMENT ON COLUMN public.bookings.psw_reassigned_email_sent_at IS 'Timestamp set whenever the PSW is changed (reassignment). Reset/updated on every PSW change so a new email is always sent.';
COMMENT ON COLUMN public.bookings.order_updated_email_sent_at IS 'Timestamp set when an order update email was last sent. Used together with order_update_email_sent_signature for change-based deduplication.';
COMMENT ON COLUMN public.bookings.order_cancelled_email_sent_at IS 'Timestamp set when the order cancellation email was sent. Prevents duplicate cancellation emails.';
COMMENT ON COLUMN public.bookings.refund_email_sent_at IS 'Timestamp set when the refund confirmation email was sent. Prevents duplicate refund emails.';
COMMENT ON COLUMN public.bookings.completion_email_sent_at IS 'Timestamp set when the shift completion email was sent to the client. Prevents duplicate completion emails.';
COMMENT ON COLUMN public.bookings.invoice_sent_at IS 'Timestamp set when the invoice email/document was delivered to the client. Prevents duplicate invoice sends.';
COMMENT ON COLUMN public.bookings.care_sheet_sent_at IS 'Timestamp set when the completed care sheet was emailed to the client. Prevents duplicate care sheet sends.';

-- Helpful indexes for audit/debugging queries (partial: only rows with timestamps)
CREATE INDEX IF NOT EXISTS idx_bookings_booking_confirmation_sent_at
  ON public.bookings (booking_confirmation_sent_at)
  WHERE booking_confirmation_sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_psw_assigned_email_sent_at
  ON public.bookings (psw_assigned_email_sent_at)
  WHERE psw_assigned_email_sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_completion_email_sent_at
  ON public.bookings (completion_email_sent_at)
  WHERE completion_email_sent_at IS NOT NULL;
