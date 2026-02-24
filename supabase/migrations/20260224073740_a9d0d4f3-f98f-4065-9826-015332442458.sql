
-- Remove the overly permissive insert policy and keep only admin insert
DROP POLICY IF EXISTS "Anyone can insert transactional email log" ON public.transactional_email_log;
