-- Authoritative PSW pay calculation (integer cents, $21/hr default)
CREATE OR REPLACE FUNCTION public.psw_pay_cents(p_minutes numeric, p_rate numeric DEFAULT 21)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (round(GREATEST(coalesce(p_minutes, 0), 0) * coalesce(NULLIF(p_rate, 0), 21) * 100 / 60))::int;
$$;

-- Server-side estimated pay for every booking a PSW can see (eligible + assigned).
-- Duration = confirmed booked duration only. Never derived from client price,
-- taxes, parking, transport fees, tips or Stripe amounts.
CREATE OR REPLACE FUNCTION public.psw_pay_estimates(p_psw_id uuid DEFAULT NULL)
RETURNS TABLE(booking_id uuid, booked_minutes integer, psw_pay_rate numeric, psw_pay_cents integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (SELECT coalesce(p_psw_id, auth.uid()) AS psw_id),
  visible AS (
    SELECT b.id
    FROM public.bookings b, me
    WHERE b.status NOT IN ('archived', 'cancelled')
      AND b.psw_assigned = me.psw_id::text
    UNION
    SELECT e.booking_id
    FROM me, public.psw_eligible_booking_ids(me.psw_id) e
  ),
  dur AS (
    SELECT b.id,
           GREATEST(
             round(coalesce(
               NULLIF(b.hours, 0) * 60,
               (EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60)
                 + CASE WHEN b.end_time < b.start_time THEN 1440 ELSE 0 END,
               0
             ))::int,
             0
           ) AS minutes,
           coalesce(NULLIF(b.psw_pay_rate, 0), 21)::numeric AS rate
    FROM public.bookings b
    WHERE b.id IN (SELECT id FROM visible)
  )
  SELECT d.id, d.minutes, d.rate, public.psw_pay_cents(d.minutes, d.rate)
  FROM dur d;
$$;

GRANT EXECUTE ON FUNCTION public.psw_pay_cents(numeric, numeric) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.psw_pay_estimates(uuid) TO authenticated, service_role;