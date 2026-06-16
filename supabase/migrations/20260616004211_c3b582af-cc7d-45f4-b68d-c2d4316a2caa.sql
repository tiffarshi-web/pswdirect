
-- Security hardening: standardize psw-documents storage policies.
-- Owner = auth.uid() folder OR psw_profiles.id folder (resolved by JWT email).
-- Removes redundant duplicate policies that created an inconsistent matrix.

-- Drop overlapping/duplicate PSW policies (admin policies preserved separately)
DROP POLICY IF EXISTS "PSW delete own folder" ON storage.objects;
DROP POLICY IF EXISTS "PSW own documents insert" ON storage.objects;
DROP POLICY IF EXISTS "PSW own documents read" ON storage.objects;
DROP POLICY IF EXISTS "PSW read own folder" ON storage.objects;
DROP POLICY IF EXISTS "PSW update own folder" ON storage.objects;
DROP POLICY IF EXISTS "PSW upload own folder" ON storage.objects;
DROP POLICY IF EXISTS "PSWs can read own psw-profile folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own psw documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own psw documents" ON storage.objects;

-- Helper: does the first folder segment belong to the current user
-- (either via auth.uid() or via their linked psw_profiles.id)?
CREATE OR REPLACE FUNCTION public.is_own_psw_folder(_path text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (storage.foldername(_path))[1] = COALESCE((auth.uid())::text, '')
    OR (storage.foldername(_path))[1] IN (
      SELECT (p.id)::text
      FROM public.psw_profiles p
      WHERE p.email = (auth.jwt() ->> 'email')
    );
$$;

-- Canonical PSW policies (ownership by auth.uid() OR psw_profiles.id-via-email)
CREATE POLICY "PSW read own psw-documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'psw-documents' AND public.is_own_psw_folder(name));

CREATE POLICY "PSW insert own psw-documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'psw-documents' AND public.is_own_psw_folder(name));

CREATE POLICY "PSW update own psw-documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'psw-documents' AND public.is_own_psw_folder(name))
  WITH CHECK (bucket_id = 'psw-documents' AND public.is_own_psw_folder(name));

CREATE POLICY "PSW delete own psw-documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'psw-documents' AND public.is_own_psw_folder(name));
