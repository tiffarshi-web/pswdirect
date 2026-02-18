
-- Create the psw-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('psw-documents', 'psw-documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Authenticated users can upload to their own folder
CREATE POLICY "Users can upload own psw documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'psw-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Users can read their own files
CREATE POLICY "Users can read own psw documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'psw-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Admins can read all psw documents
CREATE POLICY "Admins can read all psw documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'psw-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- RLS: Public can read profile photos (bucket is public, so public URLs work)
-- The bucket is set to public so getPublicUrl works for profile photos

-- RLS: Admins can delete psw documents
CREATE POLICY "Admins can delete psw documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'psw-documents'
  AND public.has_role(auth.uid(), 'admin')
);
