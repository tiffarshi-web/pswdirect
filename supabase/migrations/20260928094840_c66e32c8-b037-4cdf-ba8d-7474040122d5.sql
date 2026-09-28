CREATE OR REPLACE FUNCTION public.set_payout_province()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.province IS NULL THEN
    SELECT p.province INTO NEW.province FROM public.psw_profiles p WHERE p.id::text = NEW.psw_id::text;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.set_payout_province() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_set_payout_province ON public.payouts;
CREATE TRIGGER trg_set_payout_province BEFORE INSERT ON public.payouts
FOR EACH ROW EXECUTE FUNCTION public.set_payout_province();

CREATE OR REPLACE FUNCTION public.admin_earning_review_queue()
 RETURNS TABLE(entry_id uuid, psw_id text, provider_name text, provider_type text, booking_id uuid, booking_code text, service text, service_date date, province text, scheduled_minutes integer, recorded_minutes integer, location_verified text, care_sheet_status text, incident boolean, wrong_day_review boolean, rate_cents integer, gross_cents integer, adjustments_cents integer, final_cents integer, earning_status text, legacy_status text, submitted_at timestamp with time zone, age_days numeric, paid_cents integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
  SELECT pe.id, pe.psw_id, pe.psw_name, COALESCE(pe.provider_type,'psw'),
         pe.booking_id, b.booking_code, pe.task_name, pe.scheduled_date,
         COALESCE(pe.province, b.service_province, 'ON'),
         pe.scheduled_minutes, pe.payable_minutes,
         CASE
           WHEN b.id IS NULL THEN 'unknown'
           WHEN COALESCE(b.verification_status, '') = 'awaiting_review' THEN 'awaiting_review'
           WHEN b.checked_in_at IS NOT NULL THEN 'verified'
           ELSE 'unknown'
         END,
         COALESCE(b.care_sheet_status, 'unknown'),
         COALESCE(b.care_sheet_flagged, false),
         COALESCE(b.wrong_day_review_required, false),
         pe.rate_cents, pe.gross_cents, COALESCE(pe.adjustments_cents,0),
         COALESCE(pe.gross_cents,0) + COALESCE(pe.adjustments_cents,0),
         pe.earning_status::text, pe.status,
         COALESCE(pe.submitted_for_review_at, pe.completed_at, pe.created_at),
         ROUND(EXTRACT(EPOCH FROM (now() - COALESCE(pe.submitted_for_review_at, pe.completed_at, pe.created_at))) / 86400.0, 1),
         COALESCE((SELECT ROUND(SUM(l.amount_applied) * 100)::int
                   FROM public.payout_entry_links l JOIN public.payouts po ON po.id = l.payout_id
                   WHERE l.payroll_entry_id = pe.id AND po.voided_at IS NULL), 0)
  FROM public.payroll_entries pe
  LEFT JOIN public.bookings b ON b.id = pe.booking_id
  ORDER BY COALESCE(pe.submitted_for_review_at, pe.completed_at, pe.created_at) ASC;
END;
$function$;