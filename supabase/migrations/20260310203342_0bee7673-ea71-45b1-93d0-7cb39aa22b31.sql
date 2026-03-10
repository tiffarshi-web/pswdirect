-- Add PSW certificate verification columns
ALTER TABLE public.psw_profiles
  ADD COLUMN IF NOT EXISTS psw_cert_url text,
  ADD COLUMN IF NOT EXISTS psw_cert_status text NOT NULL DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS psw_cert_name text,
  ADD COLUMN IF NOT EXISTS psw_cert_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS psw_cert_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS psw_cert_notes text;

-- Drop and recreate the view with new trust indicator columns
DROP VIEW IF EXISTS public.psw_public_directory;

CREATE VIEW public.psw_public_directory AS
SELECT
  id,
  first_name,
  last_name,
  home_city,
  years_experience,
  languages,
  gender,
  profile_photo_url,
  certifications,
  vetting_status,
  gov_id_status,
  psw_cert_status,
  hscpoa_number
FROM public.psw_profiles
WHERE vetting_status = 'approved';