-- Ensure canonical admin helper exists in public schema
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_invitations
    WHERE email = (auth.jwt() ->> 'email')
      AND status = 'accepted'
      AND accepted_at IS NOT NULL
      AND expires_at > now()
  )
  OR public.has_role(auth.uid(), 'admin');
$function$;

-- Normalize all policies to use schema-qualified public.is_admin()
DO $$
DECLARE
  r record;
  role_list text;
  create_sql text;
  replaced_qual text;
  replaced_with_check text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') ~ '(^|[^.])is_admin\('
        OR COALESCE(with_check, '') ~ '(^|[^.])is_admin\('
      )
  LOOP
    replaced_qual := CASE WHEN r.qual IS NULL THEN NULL ELSE replace(r.qual, 'is_admin()', 'public.is_admin()') END;
    replaced_with_check := CASE WHEN r.with_check IS NULL THEN NULL ELSE replace(r.with_check, 'is_admin()', 'public.is_admin()') END;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    SELECT string_agg(quote_ident(role_name), ', ') INTO role_list
    FROM unnest(r.roles) AS role_name;

    IF role_list IS NULL OR role_list = '' THEN
      role_list := 'public';
    END IF;

    create_sql := format(
      'CREATE POLICY %I ON %I.%I %s FOR %s TO %s',
      r.policyname,
      r.schemaname,
      r.tablename,
      CASE WHEN r.permissive = 'RESTRICTIVE' THEN 'AS RESTRICTIVE' ELSE '' END,
      r.cmd,
      role_list
    );

    IF replaced_qual IS NOT NULL THEN
      create_sql := create_sql || format(' USING (%s)', replaced_qual);
    END IF;

    IF replaced_with_check IS NOT NULL THEN
      create_sql := create_sql || format(' WITH CHECK (%s)', replaced_with_check);
    END IF;

    EXECUTE create_sql;
  END LOOP;
END $$;

-- Bookings: remove all legacy policies and recreate strict set
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admin can select all bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Client can select own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid())
  OR (client_email = (auth.jwt() ->> 'email'))
);

CREATE POLICY "Assigned PSW can select assigned bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  psw_assigned IN (
    SELECT p.id::text
    FROM public.psw_profiles p
    WHERE p.email = (auth.jwt() ->> 'email')
  )
);

CREATE POLICY "Client can insert own bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid())
  OR (client_email = (auth.jwt() ->> 'email'))
);

CREATE POLICY "Client can update own bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  (user_id = auth.uid())
  OR (client_email = (auth.jwt() ->> 'email'))
)
WITH CHECK (
  (user_id = auth.uid())
  OR (client_email = (auth.jwt() ->> 'email'))
);

CREATE POLICY "Admin can update all bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- PSW banking: remove all legacy policies and recreate strict set
ALTER TABLE public.psw_banking ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'psw_banking'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.psw_banking', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admin can select all banking"
ON public.psw_banking
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admin can update all banking"
ON public.psw_banking
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "PSW can select own banking"
ON public.psw_banking
FOR SELECT
TO authenticated
USING (
  psw_id IN (
    SELECT p.id
    FROM public.psw_profiles p
    WHERE p.email = (auth.jwt() ->> 'email')
  )
);

CREATE POLICY "PSW can update own banking"
ON public.psw_banking
FOR UPDATE
TO authenticated
USING (
  psw_id IN (
    SELECT p.id
    FROM public.psw_profiles p
    WHERE p.email = (auth.jwt() ->> 'email')
  )
)
WITH CHECK (
  psw_id IN (
    SELECT p.id
    FROM public.psw_profiles p
    WHERE p.email = (auth.jwt() ->> 'email')
  )
);