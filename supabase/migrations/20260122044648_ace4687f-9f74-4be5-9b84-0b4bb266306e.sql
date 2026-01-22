-- Add pickup postal code column for PSW geofencing at hospital/clinic locations
-- Drop-off uses existing patient_postal_code field (patient's home address)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS pickup_postal_code text;