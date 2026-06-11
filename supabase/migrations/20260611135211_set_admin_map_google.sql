INSERT INTO public.app_settings (setting_key, setting_value, updated_at)
VALUES ('admin_map_provider', 'google', now())
ON CONFLICT (setting_key) DO UPDATE SET setting_value = 'google', updated_at = now();
