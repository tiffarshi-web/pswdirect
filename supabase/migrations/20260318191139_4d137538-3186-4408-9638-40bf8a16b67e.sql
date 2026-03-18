-- Drop the overly restrictive status check constraint
ALTER TABLE public.payroll_entries DROP CONSTRAINT IF EXISTS payroll_entries_status_check;

-- Add corrected constraint that includes all valid workflow statuses
ALTER TABLE public.payroll_entries ADD CONSTRAINT payroll_entries_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'cleared'::text, 'payout_ready'::text]));

-- Recreate the trigger to ensure it exists
DROP TRIGGER IF EXISTS trg_sync_booking_to_payroll ON public.bookings;

CREATE TRIGGER trg_sync_booking_to_payroll
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_payroll_sync();