CREATE OR REPLACE FUNCTION public.postal_fsa(p_postal text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN regexp_replace(COALESCE(p_postal, ''), '\s+', '', 'g') ~* '^[A-Z]\d[A-Z]'
      THEN upper(left(regexp_replace(p_postal, '\s+', '', 'g'), 3))
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.mask_service_address(p_address text, p_postal text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_city text;
  v_fsa  text;
  v_parts text[];
  v_m text[];
  v_out text;
BEGIN
  IF COALESCE(btrim(p_address), '') = '' AND COALESCE(btrim(p_postal), '') = '' THEN
    RETURN NULL;
  END IF;

  v_parts := string_to_array(COALESCE(p_address, ''), ',');
  v_city := btrim(COALESCE(v_parts[2], ''));
  IF v_city = '' OR v_city ~* '^(ON|Ontario|Canada)$' THEN
    v_city := btrim(COALESCE(v_parts[1], ''));
  END IF;

  IF v_city ~ '\d'
     OR v_city ~* '(^|\s)(apt|unit|suite|ste|#)(\s|$)'
     OR v_city ~* '(^|\s)(st|street|ave|avenue|rd|road|dr|drive|cres|crescent|blvd|boulevard|way|lane|ln|court|crt|ct|pl|place|trail|terr|hwy|highway)\.?(\s|$)'
  THEN
    v_city := '';
  END IF;

  v_fsa := public.postal_fsa(NULLIF(btrim(p_postal), ''));
  IF v_fsa IS NULL THEN
    v_m := regexp_match(COALESCE(p_address, ''), '([A-Za-z]\d[A-Za-z])\s?\d[A-Za-z]\d');
    v_fsa := upper(v_m[1]);
  END IF;

  v_out := NULLIF(v_city, '');
  IF v_out IS NOT NULL THEN
    v_out := v_out || ', ON';
  END IF;
  IF v_fsa IS NOT NULL THEN
    v_out := COALESCE(v_out || ' · ', '') || v_fsa || ' area';
  END IF;

  RETURN COALESCE(v_out, 'Service area details available after acceptance');
END;
$$;

GRANT EXECUTE ON FUNCTION public.mask_service_address(text, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.postal_fsa(text) TO PUBLIC;