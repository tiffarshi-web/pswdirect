-- Add 'psw' and 'client' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'psw';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';