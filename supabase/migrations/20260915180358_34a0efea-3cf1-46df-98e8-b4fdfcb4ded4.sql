DROP POLICY IF EXISTS "Public can read safe app settings" ON public.app_settings;
CREATE POLICY "Public can read safe app settings"
ON public.app_settings
FOR SELECT
USING (
  setting_key = ANY (ARRAY[
    'office_number',
    'active_service_radius',
    'asap_lead_time_minutes',
    'asap_multiplier',
    'asap_pricing_enabled',
    'category_rates',
    'category_rates_v2',
    'flexible_hours_enabled',
    'stripe_publishable_key'
  ])
);