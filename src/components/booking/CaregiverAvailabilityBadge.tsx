// Trust badge for the client's area. Uses aggregate-only coverage evidence:
// no caregiver counts, identities or distances are shown, and availability is
// never promised (a visit is confirmed only when a caregiver accepts).

import { useEffect, useState } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCoverageInventory, CITY_CENTERS } from "@/lib/nearbyPSWs";
import { fetchActiveServiceRadius } from "@/lib/serviceRadiusStore";

interface CaregiverAvailabilityBadgeProps {
  postalCode?: string;
  city?: string;
  className?: string;
}

const STATIC_MESSAGE = "Vetted caregivers across Ontario";

export const CaregiverAvailabilityBadge = ({ postalCode, city, className = "" }: CaregiverAvailabilityBadgeProps) => {
  const [covered, setCovered] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const coords = async (): Promise<{ lat: number; lng: number } | null> => {
      const pc = postalCode?.trim();
      if (pc && pc.length >= 6) {
        try {
          const { data } = await supabase.functions.invoke("geocode-address", { body: { address: pc, country: "CA" } });
          const lat = (data as any)?.lat; const lng = (data as any)?.lng;
          if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
        } catch { /* fall through */ }
      }
      const c = city?.trim() ? CITY_CENTERS[city.trim()] : undefined;
      return c ? { lat: c.lat, lng: c.lng } : null;
    };
    (async () => {
      const at = await coords();
      if (!at) return;
      const inv = await getCoverageInventory(at.lat, at.lng, await fetchActiveServiceRadius());
      if (!cancelled) setCovered(inv ? inv.hasCoverage : null);
    })();
    return () => { cancelled = true; };
  }, [postalCode, city]);

  return (
    <div className={`flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30 ${className}`} role="status" aria-live="polite">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
        {covered ? <Users className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> : <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />}
      </span>
      <div className="flex flex-col leading-tight">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          {covered ? "Vetted caregivers on our roster near you" : STATIC_MESSAGE}
        </p>
        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">A visit is confirmed only when a caregiver accepts</p>
      </div>
    </div>
  );
};

export default CaregiverAvailabilityBadge;
