-- Repair the shared PSW identity lookup used by job acceptance, check-in,
-- care-sheet drafts and sign-out.

CREATE OR REPLACE FUNCTION public.current_psw_profile_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id::text
  FROM public.psw_profiles p
  WHERE lower(btrim(p.email)) = lower(btrim(COALESCE(auth.jwt() ->> 'email', '')))
  ORDER BY p.created_at ASC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_psw_profile_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_psw_profile_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_approved_psw()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.psw_profiles p
    WHERE lower(btrim(p.email)) = lower(btrim(COALESCE(auth.jwt() ->> 'email', '')))
      AND p.vetting_status = 'approved'
      AND COALESCE(p.lifecycle_status, 'active') = 'active'
  )
$$;

REVOKE ALL ON FUNCTION public.is_approved_psw() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_approved_psw() TO authenticated, service_role;

DROP POLICY IF EXISTS "Assigned PSW can update own booking" ON public.bookings;

CREATE POLICY "Assigned PSW can update own booking"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  psw_assigned IS NOT NULL
  AND psw_assigned = public.current_psw_profile_id()
)
WITH CHECK (
  psw_assigned IS NOT NULL
  AND psw_assigned = public.current_psw_profile_id()
);

COMMENT ON FUNCTION public.current_psw_profile_id() IS
  'Returns the authenticated caller psw_profiles.id using normalized email matching. Shared identity source for claim refetch, PSW-safe booking reads, check-in, care-sheet drafts and sign-out.';
