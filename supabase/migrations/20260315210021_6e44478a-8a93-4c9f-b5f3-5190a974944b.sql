
-- Create versioned document storage table
CREATE TABLE public.psw_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psw_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_by_admin UUID,
  verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  CONSTRAINT valid_document_type CHECK (document_type IN ('psw_certificate', 'police_check', 'gov_id', 'profile_photo', 'vehicle_photo')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'superseded'))
);

-- Enable RLS
ALTER TABLE public.psw_documents ENABLE ROW LEVEL SECURITY;

-- PSWs can view their own documents
CREATE POLICY "PSWs can view own documents"
ON public.psw_documents FOR SELECT
TO public
USING (
  psw_id IN (
    SELECT id FROM public.psw_profiles WHERE email = (auth.jwt() ->> 'email')
  )
);

-- PSWs can insert their own documents
CREATE POLICY "PSWs can insert own documents"
ON public.psw_documents FOR INSERT
TO public
WITH CHECK (
  psw_id IN (
    SELECT id FROM public.psw_profiles WHERE email = (auth.jwt() ->> 'email')
  )
);

-- Admins can read all documents
CREATE POLICY "Admins can read all documents"
ON public.psw_documents FOR SELECT
TO public
USING (is_admin() OR has_role(auth.uid(), 'admin'));

-- Admins can update documents (for verification)
CREATE POLICY "Admins can update documents"
ON public.psw_documents FOR UPDATE
TO public
USING (is_admin() OR has_role(auth.uid(), 'admin'));

-- Admins can delete documents
CREATE POLICY "Admins can delete documents"
ON public.psw_documents FOR DELETE
TO public
USING (is_admin() OR has_role(auth.uid(), 'admin'));

-- Service role can insert (for edge function during signup)
CREATE POLICY "Service role can insert documents"
ON public.psw_documents FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Index for efficient lookups
CREATE INDEX idx_psw_documents_psw_id ON public.psw_documents(psw_id);
CREATE INDEX idx_psw_documents_type_version ON public.psw_documents(psw_id, document_type, version_number DESC);
