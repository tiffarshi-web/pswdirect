-- Add admin full-access policies to all admin-managed tables

-- ============ PSW_PROFILES ============
-- Drop existing admin policy if exists
DROP POLICY IF EXISTS "Admins can read all PSW profiles" ON public.psw_profiles;
DROP POLICY IF EXISTS "Admins can update all PSW profiles" ON public.psw_profiles;
DROP POLICY IF EXISTS "Admins can delete PSW profiles" ON public.psw_profiles;

-- Admin can SELECT all PSW profiles
CREATE POLICY "Admins can read all PSW profiles" 
ON public.psw_profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Admin can UPDATE all PSW profiles
CREATE POLICY "Admins can update all PSW profiles" 
ON public.psw_profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Admin can DELETE PSW profiles
CREATE POLICY "Admins can delete PSW profiles" 
ON public.psw_profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- ============ SERVICE_TASKS ============
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage service tasks" ON public.service_tasks;
DROP POLICY IF EXISTS "Admins can read all service tasks" ON public.service_tasks;
DROP POLICY IF EXISTS "Admins can insert service tasks" ON public.service_tasks;
DROP POLICY IF EXISTS "Admins can update service tasks" ON public.service_tasks;
DROP POLICY IF EXISTS "Admins can delete service tasks" ON public.service_tasks;

-- Admin can SELECT all service tasks
CREATE POLICY "Admins can read all service tasks" 
ON public.service_tasks 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Admin can INSERT service tasks
CREATE POLICY "Admins can insert service tasks" 
ON public.service_tasks 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can UPDATE service tasks
CREATE POLICY "Admins can update service tasks" 
ON public.service_tasks 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Admin can DELETE service tasks
CREATE POLICY "Admins can delete service tasks" 
ON public.service_tasks 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- ============ BOOKINGS ============
-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can read all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can insert bookings" ON public.bookings;

-- Admin can SELECT all bookings
CREATE POLICY "Admins can read all bookings" 
ON public.bookings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Admin can UPDATE all bookings
CREATE POLICY "Admins can update all bookings" 
ON public.bookings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Admin can INSERT bookings
CREATE POLICY "Admins can insert bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can DELETE bookings
CREATE POLICY "Admins can delete bookings" 
ON public.bookings 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- ============ PAYROLL_ENTRIES ============
-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can read all payroll entries" ON public.payroll_entries;
DROP POLICY IF EXISTS "Admins can update payroll entries" ON public.payroll_entries;
DROP POLICY IF EXISTS "Admins can insert payroll entries" ON public.payroll_entries;
DROP POLICY IF EXISTS "Admins can delete payroll entries" ON public.payroll_entries;

-- Admin can SELECT all payroll entries
CREATE POLICY "Admins can read all payroll entries" 
ON public.payroll_entries 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Admin can UPDATE payroll entries
CREATE POLICY "Admins can update payroll entries" 
ON public.payroll_entries 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Admin can INSERT payroll entries
CREATE POLICY "Admins can insert payroll entries" 
ON public.payroll_entries 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can DELETE payroll entries
CREATE POLICY "Admins can delete payroll entries" 
ON public.payroll_entries 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- ============ PRICING_SETTINGS ============
-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can manage pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Admins can read pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Admins can update pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Admins can insert pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Admins can delete pricing settings" ON public.pricing_settings;

-- Admin can SELECT all pricing settings
CREATE POLICY "Admins can read pricing settings" 
ON public.pricing_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Admin can UPDATE pricing settings
CREATE POLICY "Admins can update pricing settings" 
ON public.pricing_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Admin can INSERT pricing settings
CREATE POLICY "Admins can insert pricing settings" 
ON public.pricing_settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can DELETE pricing settings
CREATE POLICY "Admins can delete pricing settings" 
ON public.pricing_settings 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- ============ PRICING_CONFIGS ============
-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can manage pricing configs" ON public.pricing_configs;
DROP POLICY IF EXISTS "Admins can read all pricing configs" ON public.pricing_configs;
DROP POLICY IF EXISTS "Admins can update pricing configs" ON public.pricing_configs;
DROP POLICY IF EXISTS "Admins can insert pricing configs" ON public.pricing_configs;
DROP POLICY IF EXISTS "Admins can delete pricing configs" ON public.pricing_configs;

-- Admin can SELECT all pricing configs
CREATE POLICY "Admins can read all pricing configs" 
ON public.pricing_configs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Admin can UPDATE pricing configs
CREATE POLICY "Admins can update pricing configs" 
ON public.pricing_configs 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Admin can INSERT pricing configs
CREATE POLICY "Admins can insert pricing configs" 
ON public.pricing_configs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can DELETE pricing configs
CREATE POLICY "Admins can delete pricing configs" 
ON public.pricing_configs 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- ============ CLIENT_PROFILES ============
-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can read all client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Admins can update client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Admins can delete client profiles" ON public.client_profiles;

-- Admin can SELECT all client profiles
CREATE POLICY "Admins can read all client profiles" 
ON public.client_profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Admin can UPDATE client profiles
CREATE POLICY "Admins can update client profiles" 
ON public.client_profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Admin can DELETE client profiles
CREATE POLICY "Admins can delete client profiles" 
ON public.client_profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- ============ REFUND_LOGS ============
-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can manage refund logs" ON public.refund_logs;
DROP POLICY IF EXISTS "Admins can read all refund logs" ON public.refund_logs;
DROP POLICY IF EXISTS "Admins can update refund logs" ON public.refund_logs;
DROP POLICY IF EXISTS "Admins can delete refund logs" ON public.refund_logs;

-- Admin can SELECT all refund logs
CREATE POLICY "Admins can read all refund logs" 
ON public.refund_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Admin can UPDATE refund logs
CREATE POLICY "Admins can update refund logs" 
ON public.refund_logs 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Admin can DELETE refund logs
CREATE POLICY "Admins can delete refund logs" 
ON public.refund_logs 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- ============ EMAIL_LOGS ============
-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can read all email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Admins can update email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Admins can delete email logs" ON public.email_logs;

-- Admin can SELECT all email logs
CREATE POLICY "Admins can read all email logs" 
ON public.email_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Admin can UPDATE email logs
CREATE POLICY "Admins can update email logs" 
ON public.email_logs 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Admin can DELETE email logs
CREATE POLICY "Admins can delete email logs" 
ON public.email_logs 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- ============ PSW_BANKING ============
-- Existing policy already allows admins to read - just add update/delete
DROP POLICY IF EXISTS "Admins can update banking info" ON public.psw_banking;
DROP POLICY IF EXISTS "Admins can delete banking info" ON public.psw_banking;

-- Admin can UPDATE banking info
CREATE POLICY "Admins can update banking info" 
ON public.psw_banking 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Admin can DELETE banking info
CREATE POLICY "Admins can delete banking info" 
ON public.psw_banking 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));