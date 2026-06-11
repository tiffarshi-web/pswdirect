// Admin map provider feature flag.
// Reads/writes `admin_map_provider` key in public.app_settings.
// Default: 'leaflet'. Admin can flip to 'google' once Google renderer is QA'd.
// Schema unchanged — uses the existing key/value app_settings table.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminMapProvider = "leaflet" | "google";
const SETTING_KEY = "admin_map_provider";
const DEFAULT_PROVIDER: AdminMapProvider = "leaflet";

export const useAdminMapProvider = () => {
  const [provider, setProviderState] = useState<AdminMapProvider>(DEFAULT_PROVIDER);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", SETTING_KEY)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data?.setting_value === "google") {
        setProviderState("google");
      } else {
        setProviderState("leaflet");
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setProvider = useCallback(async (next: AdminMapProvider) => {
    setIsSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { setting_key: SETTING_KEY, setting_value: next, updated_at: new Date().toISOString() },
        { onConflict: "setting_key" }
      );
    setIsSaving(false);
    if (!error) setProviderState(next);
    return !error;
  }, []);

  return { provider, isLoading, isSaving, setProvider };
};
