-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETE SUPABASE SCHEMA FOR PROJECT: hriqxfwsvqyrcnqjsbv
-- Generated for PSW Direct application
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- INSTRUCTIONS:
-- 1. Create a NEW Lovable project (do NOT use current one)
-- 2. In Lovable, go to Settings → Connectors → Supabase
-- 3. Connect to your project: hriqxfwsvqyrcnqjsbv
-- 4. Run this SQL in Supabase SQL Editor (in order, section by section)
-- 5. Copy your app code to the new Lovable project
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: ENUM TYPES
-- ═══════════════════════════════════════════════════════════════════════════

-- App role enum for user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'psw', 'client');


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to update PSW updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_psw_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to delete PSW with cascade
CREATE OR REPLACE FUNCTION public.delete_psw_cascade(p_psw_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete location logs (references psw_id as UUID)
  DELETE FROM location_logs WHERE psw_id = p_psw_id;
  
  -- Delete audit trail (references psw_id as UUID)
  DELETE FROM psw_status_audit WHERE psw_id = p_psw_id;
  
  -- Delete payroll entries (uses TEXT psw_id)
  DELETE FROM payroll_entries WHERE psw_id = p_psw_id::text;
  
  -- psw_banking has CASCADE on FK - will auto-delete
  -- Now delete the PSW profile
  DELETE FROM psw_profiles WHERE id = p_psw_id;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: CORE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- User roles table
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- App settings table
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL,
  setting_value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Pricing configs table
CREATE TABLE public.pricing_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_hourly_rate numeric NOT NULL DEFAULT 35.00,
  toronto_surge_rate numeric NOT NULL DEFAULT 45.00,
  hospital_discharge_fee numeric NOT NULL DEFAULT 75.00,
  doctor_visit_fee numeric NOT NULL DEFAULT 55.00,
  psw_urban_bonus numeric NOT NULL DEFAULT 15.00,
  minimum_booking_fee numeric NOT NULL DEFAULT 25.00,
  overtime_block_minutes integer NOT NULL DEFAULT 15,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Pricing settings table
CREATE TABLE public.pricing_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_name text NOT NULL,
  psw_hourly_rate numeric NOT NULL DEFAULT 22.00,
  client_hourly_rate numeric NOT NULL DEFAULT 35.00,
  surcharge_flat numeric DEFAULT 0.00,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Service tasks table
CREATE TABLE public.service_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_name text NOT NULL,
  included_minutes integer NOT NULL DEFAULT 30,
  base_cost numeric NOT NULL DEFAULT 35.00,
  legacy_extra_charge numeric NOT NULL DEFAULT 0.00,
  is_hospital_doctor boolean NOT NULL DEFAULT false,
  service_category text NOT NULL DEFAULT 'standard',
  requires_discharge_upload boolean NOT NULL DEFAULT false,
  apply_hst boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default service tasks
INSERT INTO public.service_tasks (task_name, included_minutes, base_cost, is_hospital_doctor, service_category, requires_discharge_upload, apply_hst) VALUES
  ('Personal Care', 45, 35.00, false, 'standard', false, false),
  ('Companionship Visit', 60, 32.00, false, 'standard', false, false),
  ('Meal Preparation', 30, 30.00, false, 'standard', false, false),
  ('Medication Reminders', 15, 35.00, false, 'standard', false, false),
  ('Light Housekeeping', 30, 28.00, false, 'standard', false, true),
  ('Transportation Assistance', 45, 38.00, false, 'standard', false, true),
  ('Respite Care', 60, 40.00, false, 'standard', false, false),
  ('Doctor Appointment Escort', 60, 38.00, true, 'doctor-appointment', false, true),
  ('Hospital Pick-up/Drop-off (Discharge)', 90, 50.00, true, 'hospital-discharge', true, true);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: PROFILE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- PSW profiles table
CREATE TABLE public.psw_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  gender text,
  home_postal_code text,
  home_city text,
  profile_photo_url text,
  profile_photo_name text,
  hscpoa_number text,
  police_check_url text,
  police_check_name text,
  police_check_date date,
  languages text[] DEFAULT ARRAY['en'],
  vetting_status text DEFAULT 'pending',
  vetting_notes text,
  vetting_updated_at timestamp with time zone,
  expired_due_to_police_check boolean DEFAULT false,
  years_experience text,
  certifications text,
  has_own_transport text,
  license_plate text,
  available_shifts text,
  vehicle_disclaimer jsonb,
  vehicle_photo_url text,
  vehicle_photo_name text,
  applied_at timestamp with time zone DEFAULT now(),
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Client profiles table
CREATE TABLE public.client_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  first_name text,
  phone text,
  default_address text,
  default_postal_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Profiles VIEW (read-only UNION of psw_profiles + client_profiles)
CREATE OR REPLACE VIEW public.profiles
WITH (security_invoker = on)
AS
SELECT
  id,
  NULL::uuid AS user_id,
  email,
  first_name || ' ' || last_name AS full_name,
  first_name,
  phone,
  NULL::text AS default_address,
  home_postal_code AS default_postal_code,
  created_at,
  updated_at
FROM public.psw_profiles
UNION ALL
SELECT
  id,
  user_id,
  email,
  full_name,
  first_name,
  phone,
  default_address,
  default_postal_code,
  created_at,
  updated_at
FROM public.client_profiles;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: BOOKING & OPERATIONAL TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Bookings table
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_code text NOT NULL,
  user_id uuid,
  client_email text NOT NULL,
  client_name text NOT NULL,
  client_phone text,
  client_address text NOT NULL,
  client_postal_code text,
  patient_name text NOT NULL,
  patient_address text NOT NULL,
  patient_postal_code text,
  patient_relationship text,
  service_type text[] NOT NULL,
  scheduled_date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  hours numeric NOT NULL,
  hourly_rate numeric NOT NULL,
  subtotal numeric NOT NULL,
  surge_amount numeric DEFAULT 0,
  total numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'invoice-pending',
  psw_assigned text,
  psw_first_name text,
  psw_photo_url text,
  psw_vehicle_photo_url text,
  psw_license_plate text,
  special_notes text,
  preferred_languages text[],
  preferred_gender text,
  pickup_address text,
  pickup_postal_code text,
  dropoff_address text,
  is_asap boolean DEFAULT false,
  is_transport_booking boolean DEFAULT false,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  overtime_payment_intent_id text,
  overtime_minutes integer,
  care_sheet jsonb,
  care_sheet_psw_name text,
  care_sheet_submitted_at timestamp with time zone,
  manual_check_in boolean DEFAULT false,
  manual_check_out boolean DEFAULT false,
  manual_override_at timestamp with time zone,
  manual_override_by text,
  manual_override_reason text,
  was_refunded boolean DEFAULT false,
  refund_amount numeric,
  refund_reason text,
  refunded_at timestamp with time zone,
  archived_to_accounting_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Location logs table
CREATE TABLE public.location_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  psw_id uuid NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- PSW banking table
CREATE TABLE public.psw_banking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  psw_id uuid NOT NULL REFERENCES public.psw_profiles(id) ON DELETE CASCADE,
  account_number text,
  transit_number text,
  institution_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(psw_id)
);

-- Payroll entries table
CREATE TABLE public.payroll_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id text NOT NULL,
  psw_id text NOT NULL,
  psw_name text NOT NULL,
  task_name text NOT NULL,
  scheduled_date date NOT NULL,
  hours_worked numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL,
  surcharge_applied numeric DEFAULT 0,
  total_owed numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  cleared_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Refund logs table
CREATE TABLE public.refund_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id text NOT NULL,
  booking_code text,
  client_name text NOT NULL,
  client_email text NOT NULL,
  amount numeric NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  stripe_refund_id text,
  processed_by text,
  processed_at timestamp with time zone,
  is_dry_run boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: ADMIN & AUDIT TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Admin invitations table
CREATE TABLE public.admin_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  invite_token text NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- PSW status audit table
CREATE TABLE public.psw_status_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  psw_id uuid NOT NULL,
  psw_name text NOT NULL,
  psw_email text NOT NULL,
  action text NOT NULL,
  reason text,
  performed_by text NOT NULL DEFAULT 'admin',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Email logs table
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body text,
  template_id text,
  template_name text,
  status text DEFAULT 'sent',
  error_message text,
  metadata jsonb DEFAULT '{}',
  is_recalled boolean DEFAULT false,
  recall_reason text,
  recalled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7: ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psw_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psw_banking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psw_status_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- USER_ROLES POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- APP_SETTINGS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Settings are publicly readable" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can read all app settings" ON public.app_settings
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings" ON public.app_settings
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert app settings" ON public.app_settings
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings" ON public.app_settings
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app settings" ON public.app_settings
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete app settings" ON public.app_settings
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- PRICING_CONFIGS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Anyone can read pricing configs" ON public.pricing_configs
  FOR SELECT USING (true);

CREATE POLICY "Admins can read all pricing configs" ON public.pricing_configs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pricing configs" ON public.pricing_configs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pricing configs" ON public.pricing_configs
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pricing configs" ON public.pricing_configs
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- PRICING_SETTINGS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Anyone can read pricing settings" ON public.pricing_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can read pricing settings" ON public.pricing_settings
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pricing settings" ON public.pricing_settings
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pricing settings" ON public.pricing_settings
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pricing settings" ON public.pricing_settings
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- SERVICE_TASKS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Anyone can read service tasks" ON public.service_tasks
  FOR SELECT USING (true);

CREATE POLICY "Admins can read all service tasks" ON public.service_tasks
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert service tasks" ON public.service_tasks
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update service tasks" ON public.service_tasks
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete service tasks" ON public.service_tasks
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- PSW_PROFILES POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Allow PSW profile application signup" ON public.psw_profiles
  FOR INSERT WITH CHECK ((auth.jwt() IS NULL) OR (email = (auth.jwt() ->> 'email')));

CREATE POLICY "PSWs can view their own profile" ON public.psw_profiles
  FOR SELECT USING (email = (auth.jwt() ->> 'email'));

CREATE POLICY "Anyone can view approved PSW first names and photos" ON public.psw_profiles
  FOR SELECT USING (vetting_status = 'approved');

CREATE POLICY "PSWs can update their own profile" ON public.psw_profiles
  FOR UPDATE USING (email = (auth.jwt() ->> 'email'));

CREATE POLICY "Admins can read all PSW profiles" ON public.psw_profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert PSW profiles" ON public.psw_profiles
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all PSW profiles" ON public.psw_profiles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete PSW profiles" ON public.psw_profiles
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- CLIENT_PROFILES POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Clients can view their own profile" ON public.client_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Clients can insert their own profile" ON public.client_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clients can update their own profile" ON public.client_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all client profiles" ON public.client_profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert client profiles" ON public.client_profiles
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update client profiles" ON public.client_profiles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete client profiles" ON public.client_profiles
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- BOOKINGS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Allow guest bookings with email" ON public.bookings
  FOR INSERT WITH CHECK ((client_email IS NOT NULL) AND (client_email <> ''));

CREATE POLICY "Clients can create bookings" ON public.bookings
  FOR INSERT WITH CHECK ((user_id = auth.uid()) OR (client_email = (auth.jwt() ->> 'email')));

CREATE POLICY "Clients can view their own bookings" ON public.bookings
  FOR SELECT USING ((user_id = auth.uid()) OR (client_email = (auth.jwt() ->> 'email')));

CREATE POLICY "PSWs can view assigned bookings" ON public.bookings
  FOR SELECT USING (psw_assigned IN (
    SELECT id::text FROM psw_profiles WHERE email = (auth.jwt() ->> 'email')
  ));

CREATE POLICY "PSWs can update assigned bookings" ON public.bookings
  FOR UPDATE
  USING (psw_assigned IN (SELECT id::text FROM psw_profiles WHERE email = (auth.jwt() ->> 'email')))
  WITH CHECK (psw_assigned IN (SELECT id::text FROM psw_profiles WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Admins can read all bookings" ON public.bookings
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert bookings" ON public.bookings
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all bookings" ON public.bookings
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bookings" ON public.bookings
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- LOCATION_LOGS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "PSWs can insert their own locations" ON public.location_logs
  FOR INSERT WITH CHECK (psw_id IN (
    SELECT id FROM psw_profiles WHERE email = (auth.jwt() ->> 'email')
  ));

CREATE POLICY "PSWs can read their own locations" ON public.location_logs
  FOR SELECT USING (psw_id IN (
    SELECT id FROM psw_profiles WHERE email = (auth.jwt() ->> 'email')
  ));

CREATE POLICY "Clients can read locations for their bookings" ON public.location_logs
  FOR SELECT USING (booking_id IN (
    SELECT id FROM bookings WHERE client_email = (auth.jwt() ->> 'email')
  ));

CREATE POLICY "Admins can read all locations" ON public.location_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert location logs" ON public.location_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update location logs" ON public.location_logs
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete location logs" ON public.location_logs
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- PSW_BANKING POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "PSWs can view their own banking info" ON public.psw_banking
  FOR SELECT USING (psw_id IN (
    SELECT id FROM psw_profiles WHERE email = (auth.jwt() ->> 'email')
  ));

CREATE POLICY "PSWs can insert their own banking info" ON public.psw_banking
  FOR INSERT WITH CHECK (psw_id IN (
    SELECT id FROM psw_profiles WHERE email = (auth.jwt() ->> 'email')
  ));

CREATE POLICY "PSWs can update their own banking info" ON public.psw_banking
  FOR UPDATE USING (psw_id IN (
    SELECT id FROM psw_profiles WHERE email = (auth.jwt() ->> 'email')
  ));

CREATE POLICY "Admins can read all banking info" ON public.psw_banking
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert banking info" ON public.psw_banking
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update banking info" ON public.psw_banking
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete banking info" ON public.psw_banking
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- PAYROLL_ENTRIES POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "PSWs can view their own payroll entries" ON public.payroll_entries
  FOR SELECT USING (psw_id IN (
    SELECT id::text FROM psw_profiles WHERE email = (auth.jwt() ->> 'email')
  ));

CREATE POLICY "Admins can read all payroll entries" ON public.payroll_entries
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert payroll entries" ON public.payroll_entries
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payroll entries" ON public.payroll_entries
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payroll entries" ON public.payroll_entries
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- REFUND_LOGS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Admins can read all refund logs" ON public.refund_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert refund logs" ON public.refund_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update refund logs" ON public.refund_logs
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete refund logs" ON public.refund_logs
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- ADMIN_INVITATIONS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Anyone can read invitation by token" ON public.admin_invitations
  FOR SELECT USING (true);

CREATE POLICY "Admins can view invitations" ON public.admin_invitations
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert invitations" ON public.admin_invitations
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invitations" ON public.admin_invitations
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invitations" ON public.admin_invitations
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- PSW_STATUS_AUDIT POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Admins can view all audit logs" ON public.psw_status_audit
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create audit logs" ON public.psw_status_audit
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- EMAIL_LOGS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY "Users can view their own email logs" ON public.email_logs
  FOR SELECT USING (recipient_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Admins can read all email logs" ON public.email_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert email logs" ON public.email_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert email logs" ON public.email_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update email logs" ON public.email_logs
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete email logs" ON public.email_logs
  FOR DELETE USING (has_role(auth.uid(), 'admin'));


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8: TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Create triggers for updated_at columns
CREATE TRIGGER update_psw_profiles_updated_at
  BEFORE UPDATE ON public.psw_profiles
  FOR EACH ROW EXECUTE FUNCTION update_psw_updated_at();

CREATE TRIGGER update_client_profiles_updated_at
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_psw_banking_updated_at
  BEFORE UPDATE ON public.psw_banking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_entries_updated_at
  BEFORE UPDATE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_configs_updated_at
  BEFORE UPDATE ON public.pricing_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_settings_updated_at
  BEFORE UPDATE ON public.pricing_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_tasks_updated_at
  BEFORE UPDATE ON public.service_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 9: INITIAL ADMIN SETUP (OPTIONAL)
-- ═══════════════════════════════════════════════════════════════════════════

-- After creating your first admin user via Auth, run this to grant admin role:
-- INSERT INTO public.user_roles (user_id, role) VALUES ('YOUR-ADMIN-USER-UUID', 'admin');


-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! Your Supabase project is now configured for PSW Direct.
-- ═══════════════════════════════════════════════════════════════════════════
