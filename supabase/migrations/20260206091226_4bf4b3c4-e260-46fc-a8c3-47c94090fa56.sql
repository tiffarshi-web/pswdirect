-- Add overtime tracking fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN overtime_minutes integer DEFAULT NULL,
ADD COLUMN overtime_payment_intent_id text DEFAULT NULL;

-- Add index for filtering overtime bookings
CREATE INDEX idx_bookings_payment_status ON public.bookings(payment_status);

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.overtime_minutes IS 'Actual minutes worked over scheduled end time (null if no overtime)';
COMMENT ON COLUMN public.bookings.overtime_payment_intent_id IS 'Stripe PaymentIntent ID for the overtime charge (null if no overtime)';