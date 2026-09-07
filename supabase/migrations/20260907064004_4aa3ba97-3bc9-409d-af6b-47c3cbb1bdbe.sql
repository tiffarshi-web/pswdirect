CREATE OR REPLACE FUNCTION public.block_financial_records_for_test_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_is_test boolean := false;
BEGIN
  IF (TG_TABLE_NAME = 'payroll_entries') THEN
    v_booking_id := NEW.shift_id;
  ELSE
    v_booking_id := NEW.booking_id;
  END IF;

  IF v_booking_id IS NOT NULL THEN
    SELECT COALESCE(b.is_test_data, false) INTO v_is_test
    FROM public.bookings b WHERE b.id = v_booking_id;
  END IF;

  -- QA/test bookings must never create financial records. Silently skip the
  -- row instead of raising, so QA can complete a full end-to-end shift
  -- walkthrough without producing payroll, payouts or invoices.
  IF COALESCE(v_is_test, false) = true THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;