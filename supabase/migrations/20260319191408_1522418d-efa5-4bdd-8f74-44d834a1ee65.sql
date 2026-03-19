-- Fix: PSW storage read policy - files stored under psw_profiles.id but old policies check auth.uid()
-- Add policy matching PSW profile ID folder

CREATE POLICY "PSWs can read own psw-profile folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'psw-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM public.psw_profiles p
    WHERE p.email = (auth.jwt() ->> 'email')
  )
);