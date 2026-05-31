
-- 1. Remove privilege-escalation: users can no longer self-assign psw role
DROP POLICY IF EXISTS "Users can insert own psw role" ON public.user_roles;

-- 2. Restrict psw_profiles non-admin policies to authenticated role only
DROP POLICY IF EXISTS "PSWs can view their own profile" ON public.psw_profiles;
CREATE POLICY "PSWs can view their own profile"
  ON public.psw_profiles
  FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "PSWs can update their own profile" ON public.psw_profiles;
CREATE POLICY "PSWs can update their own profile"
  ON public.psw_profiles
  FOR UPDATE
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- Also tighten admin policies on psw_profiles from public->authenticated (defense in depth)
DROP POLICY IF EXISTS "Admins can read all PSW profiles" ON public.psw_profiles;
CREATE POLICY "Admins can read all PSW profiles"
  ON public.psw_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert PSW profiles" ON public.psw_profiles;
CREATE POLICY "Admins can insert PSW profiles"
  ON public.psw_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all PSW profiles" ON public.psw_profiles;
CREATE POLICY "Admins can update all PSW profiles"
  ON public.psw_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete PSW profiles" ON public.psw_profiles;
CREATE POLICY "Admins can delete PSW profiles"
  ON public.psw_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin() OR has_role(auth.uid(), 'admin'::app_role));
