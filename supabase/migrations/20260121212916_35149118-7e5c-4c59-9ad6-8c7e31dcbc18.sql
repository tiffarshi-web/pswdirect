-- Add missing columns to service_tasks table to match TaskConfig interface
ALTER TABLE public.service_tasks
ADD COLUMN IF NOT EXISTS base_cost numeric NOT NULL DEFAULT 35.00,
ADD COLUMN IF NOT EXISTS is_hospital_doctor boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS service_category text NOT NULL DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS requires_discharge_upload boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS apply_hst boolean NOT NULL DEFAULT false;

-- Rename existing columns to match the interface
ALTER TABLE public.service_tasks RENAME COLUMN allotted_time_minutes TO included_minutes;
ALTER TABLE public.service_tasks RENAME COLUMN extra_charge TO legacy_extra_charge;

-- Update existing data to set reasonable defaults based on task names
UPDATE public.service_tasks SET
  is_hospital_doctor = CASE 
    WHEN task_name ILIKE '%hospital%' OR task_name ILIKE '%doctor%' THEN true 
    ELSE false 
  END,
  service_category = CASE
    WHEN task_name ILIKE '%hospital%' OR task_name ILIKE '%discharge%' THEN 'hospital-discharge'
    WHEN task_name ILIKE '%doctor%' THEN 'doctor-appointment'
    ELSE 'standard'
  END,
  requires_discharge_upload = CASE
    WHEN task_name ILIKE '%discharge%' THEN true
    ELSE false
  END,
  apply_hst = CASE
    WHEN task_name ILIKE '%housekeeping%' OR task_name ILIKE '%transportation%' OR task_name ILIKE '%hospital%' OR task_name ILIKE '%doctor%' THEN true
    ELSE false
  END;