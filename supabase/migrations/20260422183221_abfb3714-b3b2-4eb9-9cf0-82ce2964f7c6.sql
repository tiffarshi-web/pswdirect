
-- ============================================================================
-- Backend-only triggers for remaining transactional emails.
-- All use the *_email_sent_at columns added in the previous migration for
-- idempotency. Triggers are BEFORE so we can stamp the timestamp atomically.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. BOOKING CONFIRMATION (on INSERT)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_client_on_booking_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.booking_confirmation_sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.client_email IS NULL OR NEW.client_email = '' THEN
    RETURN NEW;
  END IF;

  -- Don't confirm cancelled rows
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  PERFORM public._invoke_edge_function(
    'send-booking-confirmation-email',
    jsonb_build_object('booking_id', NEW.id)
  );

  NEW.booking_confirmation_sent_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_on_booking_created ON public.bookings;
CREATE TRIGGER trg_notify_client_on_booking_created
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_on_booking_created();

-- ---------------------------------------------------------------------------
-- 2. PAYMENT SUCCESS (when payment_status -> 'paid')
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_client_on_payment_success()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_status IS DISTINCT FROM 'paid' THEN
    RETURN NEW;
  END IF;
  IF OLD.payment_status = 'paid' THEN
    RETURN NEW;
  END IF;
  IF NEW.payment_success_email_sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.client_email IS NULL OR NEW.client_email = '' THEN
    RETURN NEW;
  END IF;

  PERFORM public._invoke_edge_function(
    'send-payment-success-email',
    jsonb_build_object('booking_id', NEW.id)
  );

  NEW.payment_success_email_sent_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_on_payment_success ON public.bookings;
CREATE TRIGGER trg_notify_client_on_payment_success
BEFORE UPDATE OF payment_status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_on_payment_success();

-- ---------------------------------------------------------------------------
-- 3. COMPLETION EMAIL + auto-trigger invoice & care sheet on completion
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_client_on_order_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Completion summary email
  IF NEW.completion_email_sent_at IS NULL
     AND NEW.client_email IS NOT NULL AND NEW.client_email <> '' THEN
    PERFORM public._invoke_edge_function(
      'send-completion-email',
      jsonb_build_object('booking_id', NEW.id)
    );
    NEW.completion_email_sent_at := now();
  END IF;

  -- Auto care-sheet email when sheet is already submitted at completion time
  IF NEW.care_sheet_sent_at IS NULL
     AND NEW.care_sheet_status = 'submitted'
     AND NEW.client_email IS NOT NULL AND NEW.client_email <> '' THEN
    PERFORM public._invoke_edge_function(
      'send-care-sheet-email',
      jsonb_build_object('booking_id', NEW.id)
    );
    NEW.care_sheet_sent_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_on_order_completed ON public.bookings;
CREATE TRIGGER trg_notify_client_on_order_completed
BEFORE UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_on_order_completed();

-- ---------------------------------------------------------------------------
-- 4. CARE SHEET — fire when care_sheet_status becomes 'submitted'
--    (covers the path where care sheet is finalized AFTER completion)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_client_on_care_sheet_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.care_sheet_status IS DISTINCT FROM 'submitted' THEN
    RETURN NEW;
  END IF;
  IF OLD.care_sheet_status = 'submitted' THEN
    RETURN NEW;
  END IF;
  IF NEW.care_sheet_sent_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.client_email IS NULL OR NEW.client_email = '' THEN
    RETURN NEW;
  END IF;

  PERFORM public._invoke_edge_function(
    'send-care-sheet-email',
    jsonb_build_object('booking_id', NEW.id)
  );

  NEW.care_sheet_sent_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_on_care_sheet_submitted ON public.bookings;
CREATE TRIGGER trg_notify_client_on_care_sheet_submitted
BEFORE UPDATE OF care_sheet_status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_on_care_sheet_submitted();

-- ---------------------------------------------------------------------------
-- 5. INVOICE — fire when an invoice row is inserted (or updated to generated/paid)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_client_on_invoice_generated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_already_sent timestamptz;
  v_client_email text;
BEGIN
  -- Only fire for client invoices (not internal payroll/adjustment invoices)
  IF NEW.invoice_type IS DISTINCT FROM 'client_invoice' THEN
    RETURN NEW;
  END IF;

  -- Document must actually be ready
  IF NEW.document_status NOT IN ('generated', 'paid', 'sent') THEN
    RETURN NEW;
  END IF;

  -- Check the booking-level dedup flag
  SELECT b.invoice_sent_at, b.client_email
    INTO v_already_sent, v_client_email
  FROM public.bookings b
  WHERE b.id = NEW.booking_id;

  IF v_already_sent IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF v_client_email IS NULL OR v_client_email = '' THEN
    RETURN NEW;
  END IF;

  PERFORM public._invoke_edge_function(
    'send-invoice-email',
    jsonb_build_object('booking_id', NEW.booking_id, 'invoice_id', NEW.id)
  );

  -- Stamp the booking so we don't double-send
  UPDATE public.bookings
     SET invoice_sent_at = now()
   WHERE id = NEW.booking_id
     AND invoice_sent_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_on_invoice_generated_ins ON public.invoices;
CREATE TRIGGER trg_notify_client_on_invoice_generated_ins
AFTER INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_on_invoice_generated();

DROP TRIGGER IF EXISTS trg_notify_client_on_invoice_generated_upd ON public.invoices;
CREATE TRIGGER trg_notify_client_on_invoice_generated_upd
AFTER UPDATE OF document_status ON public.invoices
FOR EACH ROW
WHEN (OLD.document_status IS DISTINCT FROM NEW.document_status)
EXECUTE FUNCTION public.notify_client_on_invoice_generated();

-- ---------------------------------------------------------------------------
-- 6. PSW REASSIGNMENT — fire when psw_assigned changes from one non-null
--    PSW to a different non-null PSW (after initial assignment).
--    Initial assignment continues to be handled by trg_notify_client_on_psw_assignment.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_client_on_psw_reassigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Must be a true reassignment: both old and new are non-empty AND different
  IF OLD.psw_assigned IS NULL OR OLD.psw_assigned = '' THEN
    RETURN NEW; -- this is initial assignment, handled elsewhere
  END IF;
  IF NEW.psw_assigned IS NULL OR NEW.psw_assigned = '' THEN
    RETURN NEW; -- unassignment, not a reassignment email
  END IF;
  IF NEW.psw_assigned = OLD.psw_assigned THEN
    RETURN NEW; -- no change
  END IF;

  -- Don't email on cancelled / completed
  IF NEW.status IN ('cancelled', 'completed') THEN
    RETURN NEW;
  END IF;

  IF NEW.client_email IS NULL OR NEW.client_email = '' THEN
    RETURN NEW;
  END IF;

  PERFORM public._invoke_edge_function(
    'send-psw-reassigned-email',
    jsonb_build_object(
      'booking_id', NEW.id,
      'previous_psw_id', OLD.psw_assigned,
      'new_psw_id', NEW.psw_assigned
    )
  );

  -- Always overwrite — every reassignment gets a fresh timestamp.
  NEW.psw_reassigned_email_sent_at := now();
  -- Keep the assignment dedup column in sync so the original assignment trigger
  -- doesn't re-fire on top of us.
  NEW.psw_assigned_email_sent_for := NEW.psw_assigned;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_on_psw_reassigned ON public.bookings;
CREATE TRIGGER trg_notify_client_on_psw_reassigned
BEFORE UPDATE OF psw_assigned ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_on_psw_reassigned();

-- Also keep psw_assigned_email_sent_at in sync with the existing assignment
-- trigger (so the audit column reflects when the FIRST assignment email fired).
CREATE OR REPLACE FUNCTION public.stamp_psw_assigned_email_sent_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- First-time assignment: OLD.psw_assigned is null/empty, NEW is non-empty
  IF (OLD.psw_assigned IS NULL OR OLD.psw_assigned = '')
     AND NEW.psw_assigned IS NOT NULL AND NEW.psw_assigned <> ''
     AND NEW.psw_assigned_email_sent_at IS NULL
  THEN
    NEW.psw_assigned_email_sent_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_psw_assigned_email_sent_at ON public.bookings;
CREATE TRIGGER trg_stamp_psw_assigned_email_sent_at
BEFORE UPDATE OF psw_assigned ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.stamp_psw_assigned_email_sent_at();
