-- Create psw_profiles table for database-backed PSW accounts
CREATE TABLE public.psw_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('female', 'male', 'other', 'prefer-not-to-say')),
  home_postal_code TEXT,
  home_city TEXT,
  profile_photo_url TEXT,
  profile_photo_name TEXT,
  hscpoa_number TEXT,
  police_check_url TEXT,
  police_check_name TEXT,
  police_check_date DATE,
  languages TEXT[] DEFAULT ARRAY['en'],
  vetting_status TEXT DEFAULT 'pending' CHECK (vetting_status IN ('pending', 'approved', 'rejected')),
  vetting_updated_at TIMESTAMPTZ,
  vetting_notes TEXT,
  expired_due_to_police_check BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  years_experience TEXT,
  certifications TEXT,
  has_own_transport TEXT,
  license_plate TEXT,
  available_shifts TEXT,
  vehicle_disclaimer JSONB,
  applied_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.psw_profiles ENABLE ROW LEVEL SECURITY;

-- Public read access for approved PSWs (for job board display)
CREATE POLICY "Anyone can view approved PSW first names and photos" 
ON public.psw_profiles 
FOR SELECT 
USING (vetting_status = 'approved');

-- PSWs can view their own full profile
CREATE POLICY "PSWs can view their own profile" 
ON public.psw_profiles 
FOR SELECT 
USING (email = auth.jwt() ->> 'email');

-- Allow public insert for new PSW signups (before they have an auth account)
CREATE POLICY "Anyone can create a PSW profile application" 
ON public.psw_profiles 
FOR INSERT 
WITH CHECK (true);

-- PSWs can update their own profile
CREATE POLICY "PSWs can update their own profile" 
ON public.psw_profiles 
FOR UPDATE 
USING (email = auth.jwt() ->> 'email');

-- Add care_sheet columns to bookings table
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS care_sheet JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS care_sheet_submitted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS care_sheet_psw_name TEXT DEFAULT NULL;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_psw_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_psw_profiles_updated_at
BEFORE UPDATE ON public.psw_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_psw_updated_at();

-- Create index for email lookup (for login)
CREATE INDEX idx_psw_profiles_email ON public.psw_profiles(email);

-- Create index for phone lookup (for login)
CREATE INDEX idx_psw_profiles_phone ON public.psw_profiles(phone);

-- Create index for vetting status (for admin queries)
CREATE INDEX idx_psw_profiles_vetting_status ON public.psw_profiles(vetting_status);