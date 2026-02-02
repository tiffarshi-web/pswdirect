-- Ensure compatibility with legacy/live queries expecting public.profiles
-- We map it to the existing client_profiles table.

CREATE OR REPLACE VIEW public.profiles
WITH (security_invoker=on) AS
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

-- Refresh PostgREST schema cache so the new view is visible immediately
NOTIFY pgrst, 'reload schema';
