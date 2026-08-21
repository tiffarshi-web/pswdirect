ALTER TABLE public.psw_profiles
  ADD COLUMN IF NOT EXISTS home_street_address text,
  ADD COLUMN IF NOT EXISTS home_unit text,
  ADD COLUMN IF NOT EXISTS home_province text;

CREATE OR REPLACE FUNCTION public.psw_update_own_address(
  p_street_address text,
  p_unit text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_lat numeric,
  p_lng numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old record;
  v_street text := btrim(coalesce(p_street_address, ''));
  v_unit text := nullif(btrim(coalesce(p_unit, '')), '');
  v_city text := btrim(coalesce(p_city, ''));
  v_prov text := upper(btrim(coalesce(p_province, '')));
  v_postal text := upper(regexp_replace(coalesce(p_postal_code, ''), '\s+', '', 'g'));
  v_geocoded boolean := (p_lat IS NOT NULL AND p_lng IS NOT NULL AND p_lat <> 0 AND p_lng <> 0);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, email, home_city, home_postal_code, home_lat, home_lng
    INTO v_old
  FROM public.psw_profiles
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No caregiver profile for this account';
  END IF;

  IF v_street = '' OR length(v_street) < 4 THEN
    RAISE EXCEPTION 'Street address is required';
  END IF;
  IF v_city = '' THEN
    RAISE EXCEPTION 'City is required';
  END IF;
  IF v_prov !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'Province is required';
  END IF;
  IF v_postal !~ '^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$' THEN
    RAISE EXCEPTION 'Invalid Canadian postal code';
  END IF;

  v_postal := substr(v_postal, 1, 3) || ' ' || substr(v_postal, 4, 3);

  UPDATE public.psw_profiles
  SET home_street_address = v_street,
      home_unit = v_unit,
      home_city = v_city,
      home_province = v_prov,
      home_postal_code = v_postal,
      home_lat = CASE WHEN v_geocoded THEN p_lat ELSE home_lat END,
      home_lng = CASE WHEN v_geocoded THEN p_lng ELSE home_lng END
  WHERE id = v_uid;

  INSERT INTO public.psw_profile_audit (
    psw_id, psw_email, field_name, old_value, new_value, change_type, performed_by, note
  ) VALUES (
    v_uid,
    v_old.email,
    'home_address',
    jsonb_build_object('city', v_old.home_city, 'postal_code', v_old.home_postal_code),
    jsonb_build_object('city', v_city, 'postal_code', v_postal, 'province', v_prov, 'geocoded', v_geocoded),
    'self_service_address_update',
    'psw:' || v_uid::text,
    'Caregiver self-service address update'
  );

  RETURN jsonb_build_object(
    'success', true,
    'city', v_city,
    'province', v_prov,
    'postal_code', v_postal,
    'geocoded', v_geocoded
  );
END;
$$;

REVOKE ALL ON FUNCTION public.psw_update_own_address(text, text, text, text, text, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psw_update_own_address(text, text, text, text, text, numeric, numeric) TO authenticated;