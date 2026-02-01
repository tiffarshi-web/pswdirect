-- Add admin full-access policies to app_settings table
DROP POLICY IF EXISTS "Admins can read all app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can delete app settings" ON public.app_settings;

-- Admin can SELECT all app settings
CREATE POLICY "Admins can read all app settings" 
ON public.app_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Admin can INSERT app settings
CREATE POLICY "Admins can insert app settings" 
ON public.app_settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can UPDATE app settings
CREATE POLICY "Admins can update app settings" 
ON public.app_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Admin can DELETE app settings
CREATE POLICY "Admins can delete app settings" 
ON public.app_settings 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Add admin INSERT policy for psw_banking (missing)
DROP POLICY IF EXISTS "Admins can insert banking info" ON public.psw_banking;

CREATE POLICY "Admins can insert banking info" 
ON public.psw_banking 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add admin INSERT policy for client_profiles (missing)
DROP POLICY IF EXISTS "Admins can insert client profiles" ON public.client_profiles;

CREATE POLICY "Admins can insert client profiles" 
ON public.client_profiles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add admin INSERT policy for psw_profiles (missing)
DROP POLICY IF EXISTS "Admins can insert PSW profiles" ON public.psw_profiles;

CREATE POLICY "Admins can insert PSW profiles" 
ON public.psw_profiles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add admin INSERT policy for email_logs (missing)
DROP POLICY IF EXISTS "Admins can insert email logs" ON public.email_logs;

CREATE POLICY "Admins can insert email logs" 
ON public.email_logs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add admin INSERT policy for refund_logs (missing)
DROP POLICY IF EXISTS "Admins can insert refund logs" ON public.refund_logs;

CREATE POLICY "Admins can insert refund logs" 
ON public.refund_logs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add admin policies for location_logs
DROP POLICY IF EXISTS "Admins can insert location logs" ON public.location_logs;
DROP POLICY IF EXISTS "Admins can update location logs" ON public.location_logs;
DROP POLICY IF EXISTS "Admins can delete location logs" ON public.location_logs;

CREATE POLICY "Admins can insert location logs" 
ON public.location_logs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update location logs" 
ON public.location_logs 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete location logs" 
ON public.location_logs 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));