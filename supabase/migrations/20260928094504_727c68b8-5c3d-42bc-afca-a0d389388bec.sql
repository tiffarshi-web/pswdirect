CREATE OR REPLACE FUNCTION public.enforce_checkin_service_date()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_today date;
BEGIN
  IF NEW.checked_in_at IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.checked_in_at IS NOT NULL THEN RETURN NEW; END IF;
  -- No overrides: workers and office alike must correct the date first (Wrong Day correction).
  v_today := public.province_local_today(NEW.service_province);
  IF NEW.scheduled_date IS NULL OR NEW.scheduled_date <> v_today THEN
    RAISE EXCEPTION 'wrong_service_date: scheduled %, local today %', NEW.scheduled_date, v_today
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_checkin_service_date() FROM PUBLIC, anon, authenticated;