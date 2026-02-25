
-- Fix app_settings: drop restrictive public SELECT, recreate as permissive
DROP POLICY IF EXISTS "Settings are publicly readable" ON public.app_settings;
CREATE POLICY "Settings are publicly readable"
  ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Fix service_tasks: drop restrictive public SELECT, recreate as permissive
DROP POLICY IF EXISTS "Anyone can read service tasks" ON public.service_tasks;
CREATE POLICY "Anyone can read service tasks"
  ON public.service_tasks
  FOR SELECT
  TO anon, authenticated
  USING (true);
