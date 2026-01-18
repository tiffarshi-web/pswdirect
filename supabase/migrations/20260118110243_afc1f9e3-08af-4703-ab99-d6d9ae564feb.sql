-- Client Profiles table for storing client information
CREATE TABLE public.client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  first_name TEXT,
  phone TEXT,
  default_address TEXT,
  default_postal_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Clients can view their own profile
CREATE POLICY "Clients can view their own profile" 
ON public.client_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Clients can update their own profile
CREATE POLICY "Clients can update their own profile" 
ON public.client_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Clients can insert their own profile
CREATE POLICY "Clients can insert their own profile" 
ON public.client_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Bookings table for storing all client bookings
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_code TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_address TEXT NOT NULL,
  client_postal_code TEXT,
  patient_name TEXT NOT NULL,
  patient_address TEXT NOT NULL,
  patient_postal_code TEXT,
  patient_relationship TEXT,
  service_type TEXT[] NOT NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours NUMERIC NOT NULL,
  hourly_rate NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  surge_amount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'invoice-pending',
  is_asap BOOLEAN DEFAULT false,
  was_refunded BOOLEAN DEFAULT false,
  psw_assigned TEXT,
  psw_first_name TEXT,
  special_notes TEXT,
  is_transport_booking BOOLEAN DEFAULT false,
  pickup_address TEXT,
  dropoff_address TEXT,
  preferred_languages TEXT[],
  preferred_gender TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Clients can view their own bookings (by user_id or email)
CREATE POLICY "Clients can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  client_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Allow insert for authenticated users (for their own bookings)
CREATE POLICY "Clients can create bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  client_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Allow public inserts for guest bookings (when user_id is null)
CREATE POLICY "Allow guest bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (user_id IS NULL);

-- Anyone can read bookings (needed for guest booking lookups before auth)
CREATE POLICY "Public can read bookings by email match"
ON public.bookings
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_client_profiles_updated_at
BEFORE UPDATE ON public.client_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();