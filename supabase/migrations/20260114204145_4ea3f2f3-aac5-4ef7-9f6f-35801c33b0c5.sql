-- Create pricing_configs table (singleton - only one row)
CREATE TABLE public.pricing_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 35.00,
  toronto_surge_rate NUMERIC(10,2) NOT NULL DEFAULT 45.00,
  hospital_discharge_fee NUMERIC(10,2) NOT NULL DEFAULT 75.00,
  doctor_visit_fee NUMERIC(10,2) NOT NULL DEFAULT 55.00,
  psw_urban_bonus NUMERIC(10,2) NOT NULL DEFAULT 15.00,
  minimum_booking_fee NUMERIC(10,2) NOT NULL DEFAULT 25.00,
  overtime_block_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_tasks table
CREATE TABLE public.service_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_name TEXT NOT NULL,
  allotted_time_minutes INTEGER NOT NULL DEFAULT 30,
  extra_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.pricing_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tasks ENABLE ROW LEVEL SECURITY;

-- Pricing configs: anyone can read, only authenticated users can update (admin check in app)
CREATE POLICY "Anyone can read pricing configs"
  ON public.pricing_configs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update pricing configs"
  ON public.pricing_configs FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert pricing configs"
  ON public.pricing_configs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Service tasks: anyone can read, authenticated users can manage
CREATE POLICY "Anyone can read service tasks"
  ON public.service_tasks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert service tasks"
  ON public.service_tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update service tasks"
  ON public.service_tasks FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete service tasks"
  ON public.service_tasks FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Insert default pricing config
INSERT INTO public.pricing_configs (base_hourly_rate, toronto_surge_rate, hospital_discharge_fee, doctor_visit_fee, psw_urban_bonus, minimum_booking_fee)
VALUES (35.00, 45.00, 75.00, 55.00, 15.00, 25.00);

-- Insert default service tasks
INSERT INTO public.service_tasks (task_name, allotted_time_minutes, extra_charge) VALUES
  ('Bathing & Personal Hygiene', 30, 0.00),
  ('Meal Preparation', 45, 0.00),
  ('Medication Reminders', 15, 0.00),
  ('Light Housekeeping', 30, 0.00),
  ('Mobility Assistance', 20, 0.00),
  ('Companionship', 60, 0.00);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_pricing_configs_updated_at
  BEFORE UPDATE ON public.pricing_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_tasks_updated_at
  BEFORE UPDATE ON public.service_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();