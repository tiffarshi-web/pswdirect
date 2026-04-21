-- 1. Freeze psw_assigned once a booking has been completed
CREATE OR REPLACE FUNCTION public.freeze_psw_on_completed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only enforce when the OLD row was already completed
  IF OLD.status = 'completed' THEN
    -- Block changes to psw_assigned on a completed booking.
    -- (Admins must first revert status off 'completed' to reassign — intentional.)
    IF COALESCE(NEW.psw_assigned, '') <> COALESCE(OLD.psw_assigned, '') THEN
      RAISE EXCEPTION
        'Cannot change psw_assigned on a completed booking (booking_code=%). Revert status first.',
        OLD.booking_code
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_freeze_psw_on_completed ON public.bookings;
CREATE TRIGGER trg_freeze_psw_on_completed
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.freeze_psw_on_completed();

-- 2. Reconcile PSW display names (trim trailing whitespace seen in production data)
UPDATE public.psw_profiles
SET first_name = btrim(first_name),
    last_name  = btrim(last_name)
WHERE first_name <> btrim(first_name) OR last_name <> btrim(last_name);

-- 3. Refresh denormalized booking display name from current psw_profiles (only for assigned bookings)
UPDATE public.bookings b
SET psw_first_name = btrim(p.first_name),
    updated_at = b.updated_at  -- preserve timestamp; trigger will set it anyway
FROM public.psw_profiles p
WHERE b.psw_assigned IS NOT NULL
  AND b.psw_assigned <> ''
  AND p.id::text = b.psw_assigned
  AND COALESCE(b.psw_first_name, '') <> btrim(p.first_name);