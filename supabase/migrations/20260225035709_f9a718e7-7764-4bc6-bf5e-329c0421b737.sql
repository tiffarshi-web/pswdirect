
-- =============================================
-- PART 1: Booking Code Sequence + Trigger
-- =============================================

-- 1A. Create sequence for booking codes
CREATE SEQUENCE IF NOT EXISTS booking_code_seq START WITH 1;

-- 1B. Create formatting function
CREATE OR REPLACE FUNCTION format_booking_code(n bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'CDT-' || lpad(n::text, 6, '0');
$$;

-- 1C. Create trigger function
CREATE OR REPLACE FUNCTION assign_booking_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.booking_code IS NULL OR NEW.booking_code = '' THEN
    NEW.booking_code := format_booking_code(nextval('booking_code_seq'));
  END IF;
  RETURN NEW;
END;
$$;

-- 1D. Create trigger on bookings table
CREATE TRIGGER trg_assign_booking_code
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION assign_booking_code();

-- 1E. Add UNIQUE constraint on booking_code (no duplicates exist)
ALTER TABLE bookings ADD CONSTRAINT bookings_booking_code_unique UNIQUE (booking_code);

-- =============================================
-- PART 2: PSW Number Column + Sequence + Backfill
-- =============================================

-- 2A. Add psw_number column
ALTER TABLE psw_profiles ADD COLUMN psw_number integer;

-- 2B. Add UNIQUE constraint
ALTER TABLE psw_profiles ADD CONSTRAINT psw_profiles_psw_number_unique UNIQUE (psw_number);

-- 2C. Backfill existing approved PSWs (ordered by approved_at)
-- Using a CTE to assign sequential numbers starting at 1001
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY approved_at ASC) + 1000 AS new_number
  FROM psw_profiles
  WHERE vetting_status = 'approved'
    AND psw_number IS NULL
)
UPDATE psw_profiles
SET psw_number = numbered.new_number
FROM numbered
WHERE psw_profiles.id = numbered.id;

-- 2D. Create sequence starting after max assigned number
-- Max will be 1011 (11 approved PSWs: 1001-1011)
CREATE SEQUENCE IF NOT EXISTS psw_number_seq START WITH 1012;

-- 2E. Create display formatting function
CREATE OR REPLACE FUNCTION format_psw_number(n integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'PSW-' || n::text;
$$;
