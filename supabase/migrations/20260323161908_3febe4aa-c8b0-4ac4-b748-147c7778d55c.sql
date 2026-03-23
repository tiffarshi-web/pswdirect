
-- Add missing columns to invoices table for full invoice system
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS rush_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS duration_hours numeric,
  ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS document_status text NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS refund_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_status text;

-- Create invoice number sequence
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1;

-- Unique constraint for upsert safety (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_booking_id_invoice_type_key'
  ) THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_booking_id_invoice_type_key UNIQUE (booking_id, invoice_type);
  END IF;
END $$;

-- Function to generate invoice numbers in format PSW-INV-YYYY-#####
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 'PSW-INV-' || EXTRACT(YEAR FROM now())::text || '-' || lpad(nextval('invoice_number_seq')::text, 5, '0');
$$;
