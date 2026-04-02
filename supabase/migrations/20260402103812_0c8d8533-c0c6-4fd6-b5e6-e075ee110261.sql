
ALTER TABLE public.psw_status_audit DROP CONSTRAINT psw_status_audit_action_check;
ALTER TABLE public.psw_status_audit ADD CONSTRAINT psw_status_audit_action_check 
  CHECK (action = ANY (ARRAY['activated', 'flagged', 'deactivated', 'reinstated', 'vsc_auto_expired', 'vsc_warning_sent']));
