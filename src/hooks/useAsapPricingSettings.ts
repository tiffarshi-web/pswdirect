// Hook to manage ASAP/Rush pricing settings with Supabase persistence
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Defaults matching businessConfig.ts
const DEFAULT_ASAP_ENABLED = true;
const DEFAULT_ASAP_MULTIPLIER = 1.25;

interface AsapPricingSettings {
  enabled: boolean;
  multiplier: number;
}

export const useAsapPricingSettings = () => {
  const [settings, setSettings] = useState<AsapPricingSettings>({
    enabled: DEFAULT_ASAP_ENABLED,
    multiplier: DEFAULT_ASAP_MULTIPLIER,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch settings from Supabase
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["asap_pricing_enabled", "asap_multiplier"]);

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((row) => {
        settingsMap[row.setting_key] = row.setting_value;
      });

      setSettings({
        enabled: settingsMap["asap_pricing_enabled"] === "true",
        multiplier: parseFloat(settingsMap["asap_multiplier"]) || DEFAULT_ASAP_MULTIPLIER,
      });
    } catch (error) {
      console.error("Error fetching ASAP pricing settings:", error);
      // Fall back to defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("asap_pricing_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_settings",
        },
        (payload) => {
          const key = payload.new.setting_key;
          const value = payload.new.setting_value;

          if (key === "asap_pricing_enabled") {
            setSettings((prev) => ({ ...prev, enabled: value === "true" }));
          } else if (key === "asap_multiplier") {
            setSettings((prev) => ({ ...prev, multiplier: parseFloat(value) || DEFAULT_ASAP_MULTIPLIER }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update enabled setting
  const setAsapEnabled = useCallback(async (enabled: boolean): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ setting_value: enabled ? "true" : "false", updated_at: new Date().toISOString() })
        .eq("setting_key", "asap_pricing_enabled");

      if (error) throw error;

      setSettings((prev) => ({ ...prev, enabled }));
      toast.success(`Rush pricing ${enabled ? "enabled" : "disabled"}`);
      return true;
    } catch (error) {
      console.error("Error updating ASAP enabled:", error);
      toast.error("Failed to update rush pricing status");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Update multiplier setting
  const setAsapMultiplier = useCallback(async (multiplier: number): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ setting_value: multiplier.toString(), updated_at: new Date().toISOString() })
        .eq("setting_key", "asap_multiplier");

      if (error) throw error;

      setSettings((prev) => ({ ...prev, multiplier }));
      toast.success(`Rush multiplier updated to ${Math.round((multiplier - 1) * 100)}%`);
      return true;
    } catch (error) {
      console.error("Error updating ASAP multiplier:", error);
      toast.error("Failed to update rush multiplier");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    enabled: settings.enabled,
    multiplier: settings.multiplier,
    isLoading,
    isSaving,
    setAsapEnabled,
    setAsapMultiplier,
    refresh: loadSettings,
  };
};
