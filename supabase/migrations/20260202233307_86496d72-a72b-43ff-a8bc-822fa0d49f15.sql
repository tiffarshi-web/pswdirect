-- Drop the existing profiles view and recreate it correctly
DROP VIEW IF EXISTS public.profiles;

-- Compatibility view for legacy code expecting public.profiles
-- Maps to public.client_profiles
CREATE VIEW public.profiles AS
SELECT
  id,
  user_id,
  created_at,
  updated_at,
  email,
  full_name,
  first_name,
  phone,
  default_address,
  default_postal_code
FROM public.client_profiles;

-- Ensure view has proper permissions
GRANT SELECT ON public.profiles TO anon, authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';