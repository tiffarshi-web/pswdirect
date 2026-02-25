-- Schema hardening: enforce NOT NULL on psw_banking financial columns
ALTER TABLE public.psw_banking ALTER COLUMN account_number SET NOT NULL;
ALTER TABLE public.psw_banking ALTER COLUMN transit_number SET NOT NULL;
ALTER TABLE public.psw_banking ALTER COLUMN institution_number SET NOT NULL;