// Realtime-aware count of available jobs visible to the current PSW.
// Drives the red badge on the "Jobs" tab.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAvailableJobsCount = (pswId: string | undefined) => {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    // Clear any previous PSW's count immediately on account switch/logout.
    setCount(0);
    if (!pswId) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        // No radius passed — the server reads the authoritative
        // active_service_radius itself, exactly like the jobs feed does.
        const { data, error } = await (supabase as any).rpc(
          "count_available_jobs_for_psw",
          { p_psw_id: pswId },
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

    // Polling fallback every 60s + focus / foreground / online refresh
    const interval = setInterval(refresh, 60_000);
    const onFocus = () => refresh();
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pswId]);

  return count;
};
