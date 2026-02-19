// Hook to manage ASAP/Rush pricing settings with Supabase persistence
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Defaults matching businessConfig.ts
const DEFAULT_ASAP_ENABLED = true;
const DEFAULT_ASAP_MULTIPLIER = 1.25;
const DEFAULT_ASAP_LEAD_TIME = 30; // minutes

interface AsapPricingSettings {
  enabled: boolean;
  multiplier: number;
  leadTimeMinutes: number;
}

export const useAsapPricingSettings = () => {
  const [settings, setSettings] = useState<AsapPricingSettings>({
    enabled: DEFAULT_ASAP_ENABLED,
    multiplier: DEFAULT_ASAP_MULTIPLIER,
    leadTimeMinutes: DEFAULT_ASAP_LEAD_TIME,
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
        .in("setting_key", ["asap_pricing_enabled", "asap_multiplier", "asap_lead_time_minutes"]);

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((row) => {
        settingsMap[row.setting_key] = row.setting_value;
      });

      setSettings({
        enabled: settingsMap["asap_pricing_enabled"] === "true",
        multiplier: parseFloat(settingsMap["asap_multiplier"]) || DEFAULT_ASAP_MULTIPLIER,
        leadTimeMinutes: parseInt(settingsMap["asap_lead_time_minutes"]) || DEFAULT_ASAP_LEAD_TIME,
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

  // Safety timeout: if loading never resolves (network/RLS issue), unblock after 5s
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

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
          } else if (key === "asap_lead_time_minutes") {
            setSettings((prev) => ({ ...prev, leadTimeMinutes: parseInt(value) || DEFAULT_ASAP_LEAD_TIME }));
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

  // Update lead time setting
  const setAsapLeadTime = useCallback(async (minutes: number): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ setting_value: minutes.toString(), updated_at: new Date().toISOString() })
        .eq("setting_key", "asap_lead_time_minutes");

      if (error) throw error;

      setSettings((prev) => ({ ...prev, leadTimeMinutes: minutes }));
      toast.success(`Rush lead time updated to ${minutes} minutes`);
      return true;
    } catch (error) {
      console.error("Error updating ASAP lead time:", error);
      toast.error("Failed to update rush lead time");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    enabled: settings.enabled,
    multiplier: settings.multiplier,
    leadTimeMinutes: settings.leadTimeMinutes,
    isLoading,
    isSaving,
    setAsapEnabled,
    setAsapMultiplier,
    setAsapLeadTime,
    refresh: loadSettings,
  };
};
