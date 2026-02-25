-- Enforce one banking record per PSW
ALTER TABLE public.psw_banking ADD CONSTRAINT psw_banking_psw_id_unique UNIQUE (psw_id);