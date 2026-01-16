-- Drop existing restrictive policies for pricing_settings
DROP POLICY IF EXISTS "Authenticated users can insert pricing settings" ON pricing_settings;
DROP POLICY IF EXISTS "Authenticated users can update pricing settings" ON pricing_settings;
DROP POLICY IF EXISTS "Authenticated users can delete pricing settings" ON pricing_settings;

-- Create permissive policies for pricing_settings
CREATE POLICY "Anyone can insert pricing settings" 
ON pricing_settings FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update pricing settings" 
ON pricing_settings FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete pricing settings" 
ON pricing_settings FOR DELETE 
USING (true);

-- Drop existing restrictive policies for payroll_entries
DROP POLICY IF EXISTS "Authenticated users can insert payroll entries" ON payroll_entries;
DROP POLICY IF EXISTS "Authenticated users can update payroll entries" ON payroll_entries;

-- Create permissive policies for payroll_entries
CREATE POLICY "Anyone can insert payroll entries" 
ON payroll_entries FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update payroll entries" 
ON payroll_entries FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete payroll entries" 
ON payroll_entries FOR DELETE 
USING (true);