// Hook for fetching location logs from Supabase
// Used by client and admin views to display PSW location

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LocationLog {
  id: string;
  booking_id: string;
  psw_id: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

interface UseLocationLogsOptions {
  bookingId?: string;
  pswId?: string;
  limit?: number;
  refreshIntervalMs?: number;
  enabled?: boolean;
}

export const useLocationLogs = ({
  bookingId,
  pswId,
  limit = 10,
  refreshIntervalMs = 60000, // Default 60 seconds
  enabled = true,
}: UseLocationLogsOptions) => {
  const [logs, setLogs] = useState<LocationLog[]>([]);
  const [latestLog, setLatestLog] = useState<LocationLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!enabled || (!bookingId && !pswId)) {
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("location_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (bookingId) {
        query = query.eq("booking_id", bookingId);
      }

      if (pswId) {
        query = query.eq("psw_id", pswId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("Error fetching location logs:", fetchError);
        setError(fetchError.message);
      } else {
        setLogs(data || []);
        setLatestLog(data && data.length > 0 ? data[0] : null);
        setError(null);
      }
    } catch (err) {
      console.error("Location logs fetch error:", err);
      setError("Failed to fetch location data");
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, pswId, limit, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh interval
  useEffect(() => {
    if (!enabled || refreshIntervalMs <= 0) return;

    const interval = setInterval(fetchLogs, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchLogs, refreshIntervalMs, enabled]);

  // Real-time subscription for live updates
  useEffect(() => {
    if (!enabled || (!bookingId && !pswId)) return;

    const channel = supabase
      .channel(`location-logs-${bookingId || pswId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "location_logs",
          ...(bookingId && { filter: `booking_id=eq.${bookingId}` }),
        },
        (payload) => {
          const newLog = payload.new as LocationLog;
          setLogs((prev) => [newLog, ...prev.slice(0, limit - 1)]);
          setLatestLog(newLog);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, pswId, limit, enabled]);

  return {
    logs,
    latestLog,
    isLoading,
    error,
    refetch: fetchLogs,
  };
};

export default useLocationLogs;
