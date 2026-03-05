-- Must DROP then CREATE to remove columns from view
DROP VIEW IF EXISTS public.psw_public_directory;
CREATE VIEW public.psw_public_directory AS
SELECT
  id,
  first_name,
  last_name,
  home_city,
  languages,
  gender,
  years_experience,
  profile_photo_url,
  certifications,
  vetting_status
FROM public.psw_profiles
WHERE vetting_status = 'approved';

-- Create SECURITY DEFINER RPC for distance matching (used by booking flow)
CREATE OR REPLACE FUNCTION public.get_nearby_psws(p_lat numeric, p_lng numeric, p_radius_km numeric DEFAULT 50)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  home_city text,
  home_lat numeric,
  home_lng numeric,
  languages text[],
  gender text,
  years_experience text,
  profile_photo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.home_city, p.home_lat, p.home_lng,
         p.languages, p.gender, p.years_experience, p.profile_photo_url
  FROM public.psw_profiles p
  WHERE p.vetting_status = 'approved'
    AND p.home_lat IS NOT NULL
    AND p.home_lng IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(p.home_lat)) *
        cos(radians(p.home_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(p.home_lat))
      )
    ) <= p_radius_km;
$$;

-- Fix unserved_orders token-based SELECT: add expiration check
DROP POLICY IF EXISTS "Anyone can read by payment_link_token" ON public.unserved_orders;
CREATE POLICY "Anyone can read by valid payment_link_token"
ON public.unserved_orders
FOR SELECT
USING (
  payment_link_token IS NOT NULL
  AND payment_link_token <> ''
  AND (pending_expires_at IS NULL OR pending_expires_at > now())
);

-- Fix admin_invitations: drop overly broad read policy if exists
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.admin_invitations;