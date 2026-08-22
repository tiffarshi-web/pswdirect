CREATE OR REPLACE FUNCTION public.guard_psw_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Trusted contexts: admins, and internal/system callers with no end-user
  -- session (cron jobs, SECURITY DEFINER maintenance routines, service role).
  -- RLS already prevents anonymous clients from reaching this table.
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Identity
  NEW.id := OLD.id;
  NEW.email := OLD.email;
  NEW.psw_number := OLD.psw_number;

  -- Vetting / lifecycle
  NEW.vetting_status := OLD.vetting_status;
  NEW.vetting_notes := OLD.vetting_notes;
  NEW.vetting_updated_at := OLD.vetting_updated_at;
  NEW.approved_at := OLD.approved_at;
  NEW.rejected_at := OLD.rejected_at;
  NEW.rejection_reasons := OLD.rejection_reasons;
  NEW.rejection_notes := OLD.rejection_notes;
  NEW.lifecycle_status := OLD.lifecycle_status;
  NEW.archived_at := OLD.archived_at;
  NEW.archived_by := OLD.archived_by;
  NEW.archive_reason := OLD.archive_reason;
  NEW.banned_at := OLD.banned_at;
  NEW.flagged_at := OLD.flagged_at;
  NEW.flag_count := OLD.flag_count;
  NEW.cancel_count := OLD.cancel_count;
  NEW.last_status_change_at := OLD.last_status_change_at;
  NEW.first_job_completed_at := OLD.first_job_completed_at;
  NEW.applied_at := OLD.applied_at;
  NEW.resubmitted_at := OLD.resubmitted_at;
  NEW.expired_due_to_police_check := OLD.expired_due_to_police_check;
  NEW.is_test := OLD.is_test;

  -- Police check: admin-approved via psw_pending_updates only
  NEW.police_check_url := OLD.police_check_url;
  NEW.police_check_name := OLD.police_check_name;
  NEW.police_check_date := OLD.police_check_date;

  -- Government ID review fields
  NEW.gov_id_url := OLD.gov_id_url;
  NEW.gov_id_status := OLD.gov_id_status;
  NEW.gov_id_notes := OLD.gov_id_notes;
  NEW.gov_id_reviewed_at := OLD.gov_id_reviewed_at;
  NEW.gov_id_reviewed_by := OLD.gov_id_reviewed_by;

  -- PSW certificate review fields
  NEW.psw_cert_status := OLD.psw_cert_status;
  NEW.psw_cert_notes := OLD.psw_cert_notes;
  NEW.psw_cert_reviewed_at := OLD.psw_cert_reviewed_at;
  NEW.psw_cert_reviewed_by := OLD.psw_cert_reviewed_by;

  RETURN NEW;
END;
$function$;