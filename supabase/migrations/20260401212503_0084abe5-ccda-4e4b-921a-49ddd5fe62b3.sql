-- Create recurring_schedules table
CREATE TABLE public.recurring_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_booking_id UUID NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  end_type TEXT NOT NULL DEFAULT 'never',
  max_occurrences INTEGER,
  end_date DATE,
  occurrences_created INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  payer_snapshot JSONB,
  same_day_time BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage recurring schedules"
ON public.recurring_schedules
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add columns to bookings table for recurring linkage
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS parent_schedule_id UUID REFERENCES public.recurring_schedules(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- Trigger for updated_at
CREATE TRIGGER update_recurring_schedules_updated_at
BEFORE UPDATE ON public.recurring_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();