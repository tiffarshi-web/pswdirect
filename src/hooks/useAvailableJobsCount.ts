// Realtime-aware count of available jobs visible to the current PSW.
// Drives the red badge on the "Jobs" tab.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchActiveServiceRadius } from "@/lib/serviceRadiusStore";

export const useAvailableJobsCount = (pswId: string | undefined) => {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (!pswId) {
      setCount(0);
      return;
    }
    let cancelled = false;

    const refresh = async () => {
      try {
        const radius = await fetchActiveServiceRadius();
        const { data, error } = await (supabase as any).rpc(
          "count_available_jobs_for_psw",
          { p_psw_id: pswId, p_radius_km: radius },
        );
        if (cancelled) return;
        if (error) {
          console.warn("count_available_jobs_for_psw failed:", error);
          return;
        }
        setCount(typeof data === "number" ? data : 0);
      } catch (e) {
        console.warn("available jobs count error:", e);
      }
    };

    refresh();

    // Realtime: re-count whenever bookings change
    const channel = supabase
      .channel(`available-jobs-count-${pswId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => { refresh(); },
      )
      .subscribe();

    // Polling fallback every 60s
    const interval = setInterval(refresh, 60_000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [pswId]);

  return count;
};
