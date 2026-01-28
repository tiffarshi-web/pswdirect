// Hook to manage active service radius state
import { useState, useEffect, useCallback } from "react";
import { 
  fetchActiveServiceRadius, 
  updateActiveServiceRadius,
  DEFAULT_SERVICE_RADIUS_KM 
} from "@/lib/serviceRadiusStore";
import { supabase } from "@/integrations/supabase/client";

export const useActiveServiceRadius = () => {
  const [radius, setRadius] = useState<number>(DEFAULT_SERVICE_RADIUS_KM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch the current radius on mount
  const loadRadius = useCallback(async () => {
    setIsLoading(true);
    const currentRadius = await fetchActiveServiceRadius();
    setRadius(currentRadius);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadRadius();
  }, [loadRadius]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("active_service_radius_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_settings",
          filter: "setting_key=eq.active_service_radius",
        },
        (payload) => {
          const newRadius = parseInt(payload.new.setting_value, 10);
          if (!isNaN(newRadius)) {
            setRadius(newRadius);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update the radius
  const setActiveRadius = useCallback(async (newRadius: number): Promise<boolean> => {
    setIsSaving(true);
    const success = await updateActiveServiceRadius(newRadius);
    if (success) {
      setRadius(newRadius);
    }
    setIsSaving(false);
    return success;
  }, []);

  return {
    radius,
    isLoading,
    isSaving,
    setActiveRadius,
    refreshRadius: loadRadius,
  };
};
