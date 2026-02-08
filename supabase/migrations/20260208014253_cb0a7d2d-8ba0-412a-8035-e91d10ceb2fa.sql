-- Part 1: Update the vetting_status constraint to include flagged and deactivated
ALTER TABLE psw_profiles 
DROP CONSTRAINT IF EXISTS psw_profiles_vetting_status_check;

ALTER TABLE psw_profiles 
ADD CONSTRAINT psw_profiles_vetting_status_check 
CHECK (vetting_status = ANY (ARRAY[
  'pending'::text, 
  'approved'::text, 
  'rejected'::text, 
  'flagged'::text, 
  'deactivated'::text
]));

-- Part 2: Create cascade delete function for safe PSW removal
CREATE OR REPLACE FUNCTION public.delete_psw_cascade(p_psw_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete location logs (references psw_id as UUID)
  DELETE FROM location_logs WHERE psw_id = p_psw_id;
  
  -- Delete audit trail (references psw_id as UUID)
  DELETE FROM psw_status_audit WHERE psw_id = p_psw_id;
  
  -- Delete payroll entries (uses TEXT psw_id)
  DELETE FROM payroll_entries WHERE psw_id = p_psw_id::text;
  
  -- psw_banking has CASCADE on FK - will auto-delete
  -- Now delete the PSW profile
  DELETE FROM psw_profiles WHERE id = p_psw_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;