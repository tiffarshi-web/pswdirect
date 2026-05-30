CREATE OR REPLACE FUNCTION public.get_psw_entry_payment_status(p_psw_id uuid)
 RETURNS TABLE(entry_id uuid, scheduled_date date, task_name text, hours_worked numeric, hourly_rate numeric, total_owed numeric, paid_amount numeric, remaining_amount numeric, status text, requires_admin_review boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH total_paid AS (
    SELECT COALESCE(SUM(po.amount_paid), 0)::numeric AS amount
    FROM public.payouts po
    WHERE po.psw_id = p_psw_id
      AND po.voided_at IS NULL
  ),
  eligible_entries AS (
    SELECT
      pe.id,
      pe.scheduled_date,
      pe.task_name,
      pe.hours_worked,
      pe.hourly_rate,
      pe.total_owed,
      pe.status,
      pe.requires_admin_review,
      SUM(CASE WHEN pe.requires_admin_review = false THEN pe.total_owed ELSE 0 END) OVER (
        ORDER BY pe.scheduled_date ASC, pe.created_at ASC, pe.id ASC
      ) AS eligible_cumulative_earned
    FROM public.payroll_entries pe
    WHERE pe.psw_id = p_psw_id::text
      AND NOT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id::text = pe.shift_id
          AND (b.status = 'cancelled' OR b.cancelled_at IS NOT NULL)
      )
  ),
  calculated AS (
    SELECT
      e.*,
      CASE
        WHEN e.requires_admin_review THEN COALESCE((
          SELECT SUM(pel.amount_applied)
          FROM public.payout_entry_links pel
          JOIN public.payouts po ON po.id = pel.payout_id
          WHERE pel.payroll_entry_id = e.id
            AND po.voided_at IS NULL
        ), 0)
        ELSE LEAST(
          e.total_owed,
          GREATEST((SELECT amount FROM total_paid) - (e.eligible_cumulative_earned - e.total_owed), 0)
        )
      END AS computed_paid
    FROM eligible_entries e
  )
  SELECT
    c.id AS entry_id,
    c.scheduled_date,
    c.task_name,
    c.hours_worked,
    c.hourly_rate,
    c.total_owed,
    c.computed_paid AS paid_amount,
    GREATEST(c.total_owed - c.computed_paid, 0) AS remaining_amount,
    CASE
      WHEN c.requires_admin_review = false AND c.computed_paid + 0.005 >= c.total_owed THEN 'cleared'
      ELSE c.status
    END AS status,
    c.requires_admin_review
  FROM calculated c
  ORDER BY c.scheduled_date ASC;
$function$;