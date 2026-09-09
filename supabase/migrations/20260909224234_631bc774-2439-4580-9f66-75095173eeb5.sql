-- Performance indexes for the hottest booking scans (dispatch escalation,
-- admin dashboards, caregiver job lists). Read-path only; no data changes.

CREATE INDEX IF NOT EXISTS idx_bookings_status_scheduled_date
  ON public.bookings (status, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_bookings_open_dispatch
  ON public.bookings (scheduled_date, created_at)
  WHERE status = 'pending' AND psw_assigned IS NULL AND is_test_data = false;

CREATE INDEX IF NOT EXISTS idx_bookings_psw_assigned_date
  ON public.bookings (psw_assigned, scheduled_date)
  WHERE psw_assigned IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date
  ON public.bookings (scheduled_date);
