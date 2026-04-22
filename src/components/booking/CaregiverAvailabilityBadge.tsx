// Trust badge showing caregivers available near the client's location
// Renders a static fallback message and upgrades to a live count when
// a postal code or city is provided.

import { useEffect, useState } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getNearbyPSWsByCity } from "@/lib/nearbyPSWs";
import { fetchActiveServiceRadius } from "@/lib/serviceRadiusStore";

interface CaregiverAvailabilityBadgeProps {
  /** Client postal code (e.g. "K8N 1A1"). Used for the most accurate count. */
  postalCode?: string;
  /** Optional city fallback when no postal code is available yet. */
  city?: string;
  className?: string;
}

const STATIC_MESSAGE = "Caregivers available near you";

export const CaregiverAvailabilityBadge = ({
  postalCode,
  city,
  className = "",
}: CaregiverAvailabilityBadgeProps) => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadByPostalCode = async (pc: string): Promise<number | null> => {
      try {
        // Geocode the postal code via the existing geocoding helper
        const { data } = await supabase.functions.invoke("geocode-address", {
          body: { address: pc, country: "CA" },
        });
        const lat = (data as any)?.lat;
        const lng = (data as any)?.lng;
        if (typeof lat !== "number" || typeof lng !== "number") return null;

        const radius = await fetchActiveServiceRadius();
        const { data: psws, error } = await supabase.rpc("get_nearby_psws", {
          p_lat: lat,
          p_lng: lng,
          p_radius_km: radius,
        });
        if (error || !psws) return null;
        return (psws as any[]).length;
      } catch {
        return null;
      }
    };

    const run = async () => {
      let result: number | null = null;
      const pc = postalCode?.trim();
      if (pc && pc.length >= 6) {
        result = await loadByPostalCode(pc);
      }
      if (result === null && city && city.trim().length >= 2) {
        try {
          const psws = await getNearbyPSWsByCity(city.trim());
          result = psws.length;
        } catch {
          result = null;
        }
      }
      if (!cancelled) setCount(result);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [postalCode, city]);

  const hasLiveCount = typeof count === "number" && count > 0;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
        {hasLiveCount ? (
          <Users className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
        ) : (
          <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
        )}
      </span>
      <div className="flex flex-col leading-tight">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          {hasLiveCount
            ? `${count} caregiver${count === 1 ? "" : "s"} available in your area`
            : STATIC_MESSAGE}
        </p>
        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
          Verified, vetted, and ready to help
        </p>
      </div>
    </div>
  );
};

export default CaregiverAvailabilityBadge;
