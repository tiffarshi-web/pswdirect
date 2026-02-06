-- Add archived_to_accounting_at timestamp to track when orders are archived to accounting
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS archived_to_accounting_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add stripe_payment_intent_id index for faster lookups in accounting
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_payment_intent 
ON public.bookings(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

-- Add index for faster accounting queries
CREATE INDEX IF NOT EXISTS idx_bookings_archived_accounting 
ON public.bookings(archived_to_accounting_at) 
WHERE archived_to_accounting_at IS NOT NULL;