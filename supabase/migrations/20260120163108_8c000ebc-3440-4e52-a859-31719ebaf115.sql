-- Create PSW banking table for direct deposit information
CREATE TABLE public.psw_banking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  psw_id UUID NOT NULL REFERENCES public.psw_profiles(id) ON DELETE CASCADE,
  account_number TEXT,
  transit_number TEXT,
  institution_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(psw_id)
);

-- Enable Row Level Security
ALTER TABLE public.psw_banking ENABLE ROW LEVEL SECURITY;

-- PSWs can view and update their own banking info
CREATE POLICY "PSWs can view their own banking info"
ON public.psw_banking
FOR SELECT
USING (
  psw_id IN (
    SELECT id FROM public.psw_profiles 
    WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

CREATE POLICY "PSWs can insert their own banking info"
ON public.psw_banking
FOR INSERT
WITH CHECK (
  psw_id IN (
    SELECT id FROM public.psw_profiles 
    WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

CREATE POLICY "PSWs can update their own banking info"
ON public.psw_banking
FOR UPDATE
USING (
  psw_id IN (
    SELECT id FROM public.psw_profiles 
    WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

-- Admins can read all banking info (for payroll processing)
CREATE POLICY "Admins can read all banking info"
ON public.psw_banking
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_psw_banking_updated_at
BEFORE UPDATE ON public.psw_banking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();