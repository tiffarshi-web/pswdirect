// Keeps the caregiver's verified location current for nearby-shift matching.
//
// Foreground only: the position is refreshed when the app is opened or brought
// back to the front, never in the background. Push notifications rely on the
// most recently saved position; when that has expired the caregiver is asked to
// open the app and refresh.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getShiftLocation, currentPermission, requestPermission } from "@/mobile/native/geolocationService";
import {
  fetchDispatchLocationSettings,
  isLocationFresh,
  locationAgeHours,
  recordVerifiedLocation,
  describeLocationRejection,
  DEFAULT_LOCATION_MAX_AGE_HOURS,
} from "@/lib/dispatchLocation";

export type VerifiedLocationStatus =
  | "idle"
  | "refreshing"
  | "ok"
  | "stale"
  | "denied"
  | "unavailable"
  | "rejected";

interface UseVerifiedLocationOptions {
  /** Caregiver profile id; nothing runs until it is known. */
  pswId: string | null | undefined;
  /** Refresh automatically when the tab/app becomes visible. Default true. */
  autoRefresh?: boolean;
}

export const useVerifiedLocation = ({ pswId, autoRefresh = true }: UseVerifiedLocationOptions) => {
  const [status, setStatus] = useState<VerifiedLocationStatus>("idle");
  const [recordedAt, setRecordedAt] = useState<string | null>(null);
  const [maxAgeHours, setMaxAgeHours] = useState<number>(DEFAULT_LOCATION_MAX_AGE_HOURS);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    fetchDispatchLocationSettings().then((s) => setMaxAgeHours(s.maxAgeHours));
  }, []);

  // Read the last saved position (RLS: caregivers only ever see their own row).
  const loadSaved = useCallback(async () => {
    if (!pswId) return;
    const { data } = await supabase
      .from("psw_verified_locations")
      .select("recorded_at")
      .eq("psw_id", pswId)
      .maybeSingle();
    const saved = data?.recorded_at ?? null;
    setRecordedAt(saved);
    setStatus((prev) =>
      prev === "denied" || prev === "unavailable"
        ? prev
        : isLocationFresh(saved, maxAgeHours)
          ? "ok"
          : "stale",
    );
  }, [pswId, maxAgeHours]);

  const refresh = useCallback(
    async (opts?: { prompt?: boolean }) => {
      if (!pswId || inFlight.current) return;
      inFlight.current = true;
      setStatus("refreshing");
      setMessage(null);
      try {
        let permission = await currentPermission();
        if (permission === "prompt" && opts?.prompt) permission = await requestPermission();
        if (permission === "denied") {
          setStatus("denied");
          setMessage(
            "Location is off for PSW Direct. Turn it on so we can show shifts near you.",
          );
          return;
        }
        if (permission === "unavailable") {
          setStatus("unavailable");
          setMessage("Location is not available on this device right now.");
          return;
        }
        const result = await getShiftLocation();
        if (result.status !== "ok") {
          setStatus(result.status === "denied" ? "denied" : "unavailable");
          setMessage(result.message);
          return;
        }
        const saved = await recordVerifiedLocation(
          result.fix.latitude,
          result.fix.longitude,
          result.fix.accuracy,
          "device",
          result.fix.isMocked === true,
        );
        if (saved.ok !== true) {
          const reason = (saved as { reason?: string }).reason ?? "unknown_error";
          const rejected =
            reason === "mock_location" ||
            reason === "accuracy_too_poor" ||
            reason === "impossible_jump";
          setStatus(
            rejected ? "rejected" : isLocationFresh(recordedAt, maxAgeHours) ? "ok" : "stale",
          );
          setMessage(describeLocationRejection(reason));
          return;
        }
        setRecordedAt(saved.recordedAt);
        setStatus("ok");
      } finally {
        inFlight.current = false;
      }
    },
    [pswId, recordedAt, maxAgeHours],
  );

  useEffect(() => {
    if (!pswId) return;
    loadSaved();
  }, [pswId, loadSaved]);

  useEffect(() => {
    if (!pswId || !autoRefresh) return;
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
    // refresh is stable enough for this purpose; re-running on every identity
    // change would fire duplicate location reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pswId, autoRefresh]);

  return {
    status,
    recordedAt,
    ageHours: locationAgeHours(recordedAt),
    isFresh: isLocationFresh(recordedAt, maxAgeHours),
    maxAgeHours,
    message,
    refresh,
  };
};

export default useVerifiedLocation;
