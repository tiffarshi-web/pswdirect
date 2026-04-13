-- Create care_recipients table
CREATE TABLE public.care_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  relationship TEXT,
  default_address TEXT,
  postal_code TEXT,
  city TEXT,
  province TEXT DEFAULT 'ON',
  buzzer_code TEXT,
  entry_instructions TEXT,
  care_notes TEXT,
  mobility_notes TEXT,
  special_instructions TEXT,
  preferred_languages TEXT[] DEFAULT ARRAY['en']::TEXT[],
  preferred_gender TEXT DEFAULT 'no-preference',
  is_self BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.care_recipients ENABLE ROW LEVEL SECURITY;

-- Client policies
CREATE POLICY "Clients can view own recipients"
ON public.care_recipients FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Clients can create own recipients"
ON public.care_recipients FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clients can update own recipients"
ON public.care_recipients FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Clients can delete own recipients"
ON public.care_recipients FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can manage all recipients"
ON public.care_recipients FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_care_recipients_updated_at
BEFORE UPDATE ON public.care_recipients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookup
CREATE INDEX idx_care_recipients_user_id ON public.care_recipients(user_id);