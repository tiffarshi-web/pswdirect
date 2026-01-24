-- Add vehicle photo columns to psw_profiles table
ALTER TABLE public.psw_profiles ADD COLUMN IF NOT EXISTS vehicle_photo_url TEXT;
ALTER TABLE public.psw_profiles ADD COLUMN IF NOT EXISTS vehicle_photo_name TEXT;