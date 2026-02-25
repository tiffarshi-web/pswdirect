
-- Create a wrapper function to get next PSW number from the sequence
CREATE OR REPLACE FUNCTION nextval_psw_number()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT nextval('psw_number_seq')::integer;
$$;
