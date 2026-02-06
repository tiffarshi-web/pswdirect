-- Drop existing restrictive admin policies and recreate as PERMISSIVE
-- This ensures admins have full access to all tables

-- ============ BOOKINGS TABLE ============
DROP POLICY IF EXISTS "Admins can read all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;

CREATE POLICY "Admins can read all bookings" ON public.bookings
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert bookings" ON public.bookings
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all bookings" ON public.bookings
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bookings" ON public.bookings
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ PSW_PROFILES TABLE ============
DROP POLICY IF EXISTS "Admins can read all PSW profiles" ON public.psw_profiles;
DROP POLICY IF EXISTS "Admins can insert PSW profiles" ON public.psw_profiles;
DROP POLICY IF EXISTS "Admins can update all PSW profiles" ON public.psw_profiles;
DROP POLICY IF EXISTS "Admins can delete PSW profiles" ON public.psw_profiles;

CREATE POLICY "Admins can read all PSW profiles" ON public.psw_profiles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert PSW profiles" ON public.psw_profiles
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all PSW profiles" ON public.psw_profiles
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete PSW profiles" ON public.psw_profiles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ CLIENT_PROFILES TABLE ============
DROP POLICY IF EXISTS "Admins can read all client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Admins can insert client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Admins can update client profiles" ON public.client_profiles;
DROP POLICY IF EXISTS "Admins can delete client profiles" ON public.client_profiles;

CREATE POLICY "Admins can read all client profiles" ON public.client_profiles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert client profiles" ON public.client_profiles
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update client profiles" ON public.client_profiles
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete client profiles" ON public.client_profiles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ PAYROLL_ENTRIES TABLE ============
DROP POLICY IF EXISTS "Admins can read all payroll entries" ON public.payroll_entries;
DROP POLICY IF EXISTS "Admins can insert payroll entries" ON public.payroll_entries;
DROP POLICY IF EXISTS "Admins can update payroll entries" ON public.payroll_entries;
DROP POLICY IF EXISTS "Admins can delete payroll entries" ON public.payroll_entries;

CREATE POLICY "Admins can read all payroll entries" ON public.payroll_entries
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert payroll entries" ON public.payroll_entries
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payroll entries" ON public.payroll_entries
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payroll entries" ON public.payroll_entries
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ SERVICE_TASKS TABLE ============
DROP POLICY IF EXISTS "Admins can read all service tasks" ON public.service_tasks;
DROP POLICY IF EXISTS "Admins can insert service tasks" ON public.service_tasks;
DROP POLICY IF EXISTS "Admins can update service tasks" ON public.service_tasks;
DROP POLICY IF EXISTS "Admins can delete service tasks" ON public.service_tasks;

CREATE POLICY "Admins can read all service tasks" ON public.service_tasks
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert service tasks" ON public.service_tasks
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update service tasks" ON public.service_tasks
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete service tasks" ON public.service_tasks
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ APP_SETTINGS TABLE ============
DROP POLICY IF EXISTS "Admins can read all app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can delete app settings" ON public.app_settings;

CREATE POLICY "Admins can read all app settings" ON public.app_settings
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert app settings" ON public.app_settings
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app settings" ON public.app_settings
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete app settings" ON public.app_settings
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ PRICING_SETTINGS TABLE ============
DROP POLICY IF EXISTS "Admins can read pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Admins can insert pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Admins can update pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Admins can delete pricing settings" ON public.pricing_settings;

CREATE POLICY "Admins can read pricing settings" ON public.pricing_settings
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pricing settings" ON public.pricing_settings
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pricing settings" ON public.pricing_settings
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pricing settings" ON public.pricing_settings
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ PRICING_CONFIGS TABLE ============
DROP POLICY IF EXISTS "Admins can read all pricing configs" ON public.pricing_configs;
DROP POLICY IF EXISTS "Admins can insert pricing configs" ON public.pricing_configs;
DROP POLICY IF EXISTS "Admins can update pricing configs" ON public.pricing_configs;
DROP POLICY IF EXISTS "Admins can delete pricing configs" ON public.pricing_configs;

CREATE POLICY "Admins can read all pricing configs" ON public.pricing_configs
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pricing configs" ON public.pricing_configs
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pricing configs" ON public.pricing_configs
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pricing configs" ON public.pricing_configs
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ USER_ROLES TABLE ============
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ EMAIL_LOGS TABLE ============
DROP POLICY IF EXISTS "Admins can read all email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Admins can insert email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Admins can update email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Admins can delete email logs" ON public.email_logs;

CREATE POLICY "Admins can read all email logs" ON public.email_logs
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert email logs" ON public.email_logs
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update email logs" ON public.email_logs
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete email logs" ON public.email_logs
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ REFUND_LOGS TABLE ============
DROP POLICY IF EXISTS "Admins can read all refund logs" ON public.refund_logs;
DROP POLICY IF EXISTS "Admins can insert refund logs" ON public.refund_logs;
DROP POLICY IF EXISTS "Admins can update refund logs" ON public.refund_logs;
DROP POLICY IF EXISTS "Admins can delete refund logs" ON public.refund_logs;

CREATE POLICY "Admins can read all refund logs" ON public.refund_logs
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert refund logs" ON public.refund_logs
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update refund logs" ON public.refund_logs
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete refund logs" ON public.refund_logs
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ LOCATION_LOGS TABLE ============
DROP POLICY IF EXISTS "Admins can read all locations" ON public.location_logs;
DROP POLICY IF EXISTS "Admins can insert location logs" ON public.location_logs;
DROP POLICY IF EXISTS "Admins can update location logs" ON public.location_logs;
DROP POLICY IF EXISTS "Admins can delete location logs" ON public.location_logs;

CREATE POLICY "Admins can read all locations" ON public.location_logs
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert location logs" ON public.location_logs
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update location logs" ON public.location_logs
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete location logs" ON public.location_logs
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ PSW_BANKING TABLE ============
DROP POLICY IF EXISTS "Admins can read all banking info" ON public.psw_banking;
DROP POLICY IF EXISTS "Admins can insert banking info" ON public.psw_banking;
DROP POLICY IF EXISTS "Admins can update banking info" ON public.psw_banking;
DROP POLICY IF EXISTS "Admins can delete banking info" ON public.psw_banking;

CREATE POLICY "Admins can read all banking info" ON public.psw_banking
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert banking info" ON public.psw_banking
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update banking info" ON public.psw_banking
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete banking info" ON public.psw_banking
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ ADMIN_INVITATIONS TABLE ============
DROP POLICY IF EXISTS "Admins can view invitations" ON public.admin_invitations;
DROP POLICY IF EXISTS "Admins can insert invitations" ON public.admin_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.admin_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.admin_invitations;

CREATE POLICY "Admins can view invitations" ON public.admin_invitations
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert invitations" ON public.admin_invitations
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invitations" ON public.admin_invitations
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invitations" ON public.admin_invitations
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));