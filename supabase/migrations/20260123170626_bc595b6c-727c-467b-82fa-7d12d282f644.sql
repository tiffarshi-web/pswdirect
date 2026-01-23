-- Add Stripe payment tracking columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS refund_amount numeric,
ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS refund_reason text;

-- Create refund_logs table for persistent audit trail
CREATE TABLE IF NOT EXISTS refund_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id text NOT NULL,
  booking_code text,
  client_name text NOT NULL,
  client_email text NOT NULL,
  amount numeric NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  stripe_refund_id text,
  processed_at timestamp with time zone,
  processed_by text,
  is_dry_run boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on refund_logs
ALTER TABLE refund_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for refund_logs (admin access)
CREATE POLICY "Anyone can read refund logs" ON refund_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert refund logs" ON refund_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update refund logs" ON refund_logs FOR UPDATE USING (true);