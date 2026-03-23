-- Remove the duplicate unique index (keep the constraint-based one: invoices_booking_id_invoice_type_key)
DROP INDEX IF EXISTS public.invoices_booking_type_uniq;