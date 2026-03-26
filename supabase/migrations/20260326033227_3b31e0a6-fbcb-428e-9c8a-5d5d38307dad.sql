ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_note text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS manually_marked_paid_by text;