REVOKE ALL ON FUNCTION public.enforce_checkin_service_date() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.province_local_today(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.province_local_today(text) TO service_role;
REVOKE ALL ON FUNCTION public.check_in_to_shift(uuid,double precision,double precision,text,boolean,double precision,double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_in_to_shift(uuid,double precision,double precision,text,boolean,double precision,double precision) TO authenticated;