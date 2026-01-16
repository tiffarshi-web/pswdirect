-- Create pricing_settings table for dynamic task-based pricing
CREATE TABLE public.pricing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_name TEXT NOT NULL UNIQUE,
  psw_hourly_rate NUMERIC NOT NULL DEFAULT 22.00,
  client_hourly_rate NUMERIC NOT NULL DEFAULT 35.00,
  surcharge_flat NUMERIC DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payroll_entries table for tracking PSW payments
CREATE TABLE public.payroll_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id TEXT NOT NULL,
  psw_id TEXT NOT NULL,
  psw_name TEXT NOT NULL,
  task_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  hours_worked NUMERIC NOT NULL DEFAULT 0,
  hourly_rate NUMERIC NOT NULL,
  surcharge_applied NUMERIC DEFAULT 0,
  total_owed NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cleared')),
  cleared_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pricing_settings
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- Policies for pricing_settings
CREATE POLICY "Anyone can read pricing settings"
ON public.pricing_settings FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert pricing settings"
ON public.pricing_settings FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update pricing settings"
ON public.pricing_settings FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete pricing settings"
ON public.pricing_settings FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Enable RLS on payroll_entries
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

-- Policies for payroll_entries
CREATE POLICY "Anyone can read payroll entries"
ON public.payroll_entries FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert payroll entries"
ON public.payroll_entries FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update payroll entries"
ON public.payroll_entries FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Insert default pricing settings
INSERT INTO public.pricing_settings (task_name, psw_hourly_rate, client_hourly_rate, surcharge_flat) VALUES
  ('General Care', 22.00, 35.00, 0),
  ('Personal Care', 24.00, 38.00, 0),
  ('Hospital Pick-up', 28.00, 45.00, 15.00),
  ('Hospital Discharge', 30.00, 55.00, 25.00),
  ('Doctor Visit', 26.00, 42.00, 10.00),
  ('Respite Care', 22.00, 35.00, 0),
  ('Companionship', 20.00, 32.00, 0),
  ('Meal Prep', 22.00, 35.00, 0),
  ('Light Housekeeping', 20.00, 32.00, 0),
  ('Medication Reminders', 22.00, 35.00, 0);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_pricing_settings_updated_at
BEFORE UPDATE ON public.pricing_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_entries_updated_at
BEFORE UPDATE ON public.payroll_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();