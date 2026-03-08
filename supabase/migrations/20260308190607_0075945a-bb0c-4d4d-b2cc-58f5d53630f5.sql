ALTER TABLE public.psw_profiles ADD COLUMN IF NOT EXISTS experience_conditions text[] DEFAULT '{}';
ALTER TABLE public.psw_profiles ADD COLUMN IF NOT EXISTS certifications_list text[] DEFAULT '{}';