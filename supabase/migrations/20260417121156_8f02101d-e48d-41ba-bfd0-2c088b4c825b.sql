ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS final_billable_hours numeric,
  ADD COLUMN IF NOT EXISTS suggested_billable_hours numeric,
  ADD COLUMN IF NOT EXISTS billing_adjustment_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_adjustment_handled_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_adjustment_handled_by text,
  ADD COLUMN IF NOT EXISTS billing_note text,
  ADD COLUMN IF NOT EXISTS adjustment_invoice_id uuid,
  ADD COLUMN IF NOT EXISTS stripe_adjustment_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_adjustment_status text,
  ADD COLUMN IF NOT EXISTS adjustment_status text,
  ADD COLUMN IF NOT EXISTS adjustment_amount numeric,
  ADD COLUMN IF NOT EXISTS adjustment_charged_at timestamptz,
  ADD COLUMN IF NOT EXISTS adjustment_charged_by text,
  ADD COLUMN IF NOT EXISTS adjustment_failure_reason text;

CREATE INDEX IF NOT EXISTS idx_bookings_billing_adjustment_required
  ON public.bookings(billing_adjustment_required)
  WHERE billing_adjustment_required = true;