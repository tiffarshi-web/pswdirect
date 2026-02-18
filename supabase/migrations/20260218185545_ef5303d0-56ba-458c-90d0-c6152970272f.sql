-- Allow authenticated users to insert their own 'psw' role during signup
CREATE POLICY "Users can insert own psw role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND role = 'psw'
);
