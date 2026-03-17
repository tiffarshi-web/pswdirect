
-- Backfill: parse street_number and street_name from patient_address for existing bookings
-- that have NULL street_number and street_name.
-- Only updates rows where we can safely parse a leading number from the address.
-- Normalizes common street suffixes to abbreviated form.

UPDATE public.bookings
SET
  street_number = TRIM(BOTH FROM (regexp_match(split_part(patient_address, ',', 1), '^\s*(\d+[A-Za-z]?(?:-\d+)?)\s'))[1]),
  street_name = TRIM(BOTH FROM
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    INITCAP(
                      regexp_replace(
                        substring(split_part(patient_address, ',', 1) from '^\s*\d+[A-Za-z]?(?:-\d+)?\s+(.+)$'),
                        '\s+', ' ', 'g'
                      )
                    ),
                  '\mRoad\M', 'Rd', 'gi'),
                '\mStreet\M', 'St', 'gi'),
              '\mAvenue\M', 'Ave', 'gi'),
            '\mBoulevard\M', 'Blvd', 'gi'),
          '\mDrive\M', 'Dr', 'gi'),
        '\mCourt\M', 'Ct', 'gi'),
      '\mCrescent\M', 'Cres', 'gi'),
    '\mLane\M', 'Ln', 'gi')
  )
WHERE street_number IS NULL
  AND street_name IS NULL
  AND patient_address IS NOT NULL
  AND patient_address ~ '^\s*\d+[A-Za-z]?(?:-\d+)?\s+\S';
