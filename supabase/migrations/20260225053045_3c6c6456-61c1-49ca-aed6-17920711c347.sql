
-- Add Government ID columns to psw_profiles
ALTER TABLE public.psw_profiles
  ADD COLUMN IF NOT EXISTS gov_id_type TEXT NOT NULL DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS gov_id_url TEXT,
  ADD COLUMN IF NOT EXISTS gov_id_status TEXT NOT NULL DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS gov_id_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gov_id_reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS gov_id_notes TEXT;

-- Make psw-documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'psw-documents';

-- Drop existing storage policies on psw-documents objects
DROP POLICY IF EXISTS "PSW can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "PSW can read own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin can read all documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read psw-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read psw-documents" ON storage.objects;

-- PSW can upload to their own folder
CREATE POLICY "PSW upload own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'psw-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- PSW can read their own folder
CREATE POLICY "PSW read own folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'psw-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admin can read all documents
CREATE POLICY "Admin read all psw-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'psw-documents'
  AND (public.is_admin() OR public.has_role(auth.uid(), 'admin'))
);

-- Service role / edge functions can do anything (implicit via service_role key)
-- Allow edge functions to upload on behalf of users (they use service role)
CREATE POLICY "Service upload psw-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'psw-documents'
  AND (public.is_admin() OR public.has_role(auth.uid(), 'admin'))
);
