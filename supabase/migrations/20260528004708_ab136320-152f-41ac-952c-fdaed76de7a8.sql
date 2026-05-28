
-- 1. Harden is_admin() to rely only on user_roles (one-time bootstrap via invitations writes to user_roles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role(auth.uid(), 'admin');
$function$;

-- 2. Restrict message_templates public read policy. Edge functions use service role.
DROP POLICY IF EXISTS "Anyone can read enabled templates" ON public.message_templates;

-- 3. Add explicit PSW SELECT policy for bookings (assigned shifts + available pending shifts)
DROP POLICY IF EXISTS "PSW can select assigned or available bookings" ON public.bookings;
CREATE POLICY "PSW can select assigned or available bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  -- Assigned PSW can read their own bookings
  (psw_assigned IN (
    SELECT (p.id)::text
    FROM public.psw_profiles p
    WHERE p.email = (auth.jwt() ->> 'email')
  ))
  OR
  -- Approved PSWs can browse pending (unassigned) bookings to claim
  (
    status = 'pending'
    AND psw_assigned IS NULL
    AND EXISTS (
      SELECT 1 FROM public.psw_profiles p
      WHERE p.email = (auth.jwt() ->> 'email')
        AND p.vetting_status = 'approved'
    )
  )
);
