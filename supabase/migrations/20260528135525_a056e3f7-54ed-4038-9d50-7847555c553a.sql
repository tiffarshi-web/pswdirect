-- Exclude cancelled bookings from PSW earnings calculations.
-- A payroll_entries row whose shift_id matches a booking with status='cancelled'
-- (or a non-null cancelled_at) is excluded from both per-entry status and the summary.

CREATE OR REPLACE FUNCTION public.get_psw_entry_payment_status(p_psw_id uuid)
 RETURNS TABLE(entry_id uuid, scheduled_date date, task_name text, hours_worked numeric, hourly_rate numeric, total_owed numeric, paid_amount numeric, remaining_amount numeric, status text, requires_admin_review boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    pe.id AS entry_id,
    pe.scheduled_date,
    pe.task_name,
    pe.hours_worked,
    pe.hourly_rate,
    pe.total_owed,
    COALESCE((
      SELECT SUM(pel.amount_applied)
      FROM public.payout_entry_links pel
      JOIN public.payouts po ON po.id = pel.payout_id
      WHERE pel.payroll_entry_id = pe.id
        AND po.voided_at IS NULL
    ), 0) AS paid_amount,
    pe.total_owed - COALESCE((
      SELECT SUM(pel.amount_applied)
      FROM public.payout_entry_links pel
      JOIN public.payouts po ON po.id = pel.payout_id
      WHERE pel.payroll_entry_id = pe.id
        AND po.voided_at IS NULL
    ), 0) AS remaining_amount,
    pe.status,
    pe.requires_admin_review
  FROM public.payroll_entries pe
  WHERE pe.psw_id = p_psw_id::text
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id::text = pe.shift_id
        AND (b.status = 'cancelled' OR b.cancelled_at IS NOT NULL)
    )
  ORDER BY pe.scheduled_date ASC;
$function$;

CREATE OR REPLACE FUNCTION public.get_psw_payout_summary(p_psw_id uuid)
 RETURNS TABLE(total_earned numeric, total_paid numeric, outstanding_balance numeric, last_payout_at timestamp with time zone, payout_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE((
      SELECT SUM(pe.total_owed) FROM public.payroll_entries pe
      WHERE pe.psw_id = p_psw_id::text
        AND NOT EXISTS (
          SELECT 1 FROM public.bookings b
          WHERE b.id::text = pe.shift_id
            AND (b.status = 'cancelled' OR b.cancelled_at IS NOT NULL)
        )
    ), 0) AS total_earned,
    COALESCE((
      SELECT SUM(po.amount_paid) FROM public.payouts po
      WHERE po.psw_id = p_psw_id
        AND po.voided_at IS NULL
    ), 0) AS total_paid,
    COALESCE((
      SELECT SUM(pe.total_owed) FROM public.payroll_entries pe
      WHERE pe.psw_id = p_psw_id::text
        AND NOT EXISTS (
          SELECT 1 FROM public.bookings b
          WHERE b.id::text = pe.shift_id
            AND (b.status = 'cancelled' OR b.cancelled_at IS NOT NULL)
        )
    ), 0) - COALESCE((
      SELECT SUM(po.amount_paid) FROM public.payouts po
      WHERE po.psw_id = p_psw_id
        AND po.voided_at IS NULL
    ), 0) AS outstanding_balance,
    (SELECT MAX(po.paid_at) FROM public.payouts po
      WHERE po.psw_id = p_psw_id AND po.voided_at IS NULL) AS last_payout_at,
    (SELECT COUNT(*)::int FROM public.payouts po
      WHERE po.psw_id = p_psw_id AND po.voided_at IS NULL) AS payout_count;
$function$;