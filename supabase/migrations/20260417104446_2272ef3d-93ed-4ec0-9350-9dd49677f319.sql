UPDATE public.payroll_entries
SET payable_hours_override = 2.0,
    hours_worked = 2.0,
    total_owed = ROUND((2.0 * hourly_rate)::numeric, 2),
    requires_admin_review = false,
    reviewed_by_admin = 'admin (manual: +1hr Thursday)',
    reviewed_at = now(),
    payroll_review_note = COALESCE(payroll_review_note || E'\n', '') || 'Admin added 1 extra hour for Thursday April 16',
    updated_at = now()
WHERE id = 'ff1e2458-4ea2-470c-b9f3-6962c38d766f';