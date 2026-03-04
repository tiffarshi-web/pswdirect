
-- 1. Ensure the bucket is PRIVATE (public = false)
UPDATE storage.buckets SET public = false WHERE id = 'psw-documents';

-- 2. Drop any existing permissive policies on this bucket
DROP POLICY IF EXISTS "PSW own documents read" ON storage.objects;
DROP POLICY IF EXISTS "PSW own documents insert" ON storage.objects;
DROP POLICY IF EXISTS "Admin read all psw documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin insert psw documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin update psw documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete psw documents" ON storage.objects;

-- 3. PSWs can READ their own documents (folder = their auth.uid)
CREATE POLICY "PSW own documents read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'psw-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. PSWs can INSERT (upload) into their own folder
CREATE POLICY "PSW own documents insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'psw-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. Admins can READ all documents in the bucket
CREATE POLICY "Admin read all psw documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'psw-documents'
    AND public.is_admin()
  );

-- 6. Admins can INSERT documents
CREATE POLICY "Admin insert psw documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'psw-documents'
    AND public.is_admin()
  );

-- 7. Admins can UPDATE documents
CREATE POLICY "Admin update psw documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'psw-documents'
    AND public.is_admin()
  );

-- 8. Admins can DELETE documents
CREATE POLICY "Admin delete psw documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'psw-documents'
    AND public.is_admin()
  );
