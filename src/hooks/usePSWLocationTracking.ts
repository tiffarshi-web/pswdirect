// PSW Location Tracking Hook
// Uses browser Geolocation API to track PSW position during active shifts
// Logs to Supabase every 5 minutes while shift is "in-progress"

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LocationTrackingOptions {
  bookingId: string | null;
  pswId: string | null;
  isActive: boolean; // Should be true when shift status is "in-progress"
  intervalMinutes?: number; // Default 5 minutes
}

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: Date | null;
  error: string | null;
  isTracking: boolean;
  lastLoggedAt: Date | null;
}

export const usePSWLocationTracking = ({
  bookingId,
  pswId,
  isActive,
  intervalMinutes = 5,
}: LocationTrackingOptions) => {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    error: null,
    isTracking: false,
    lastLoggedAt: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastLogTimeRef = useRef<number>(0);
  const intervalMs = intervalMinutes * 60 * 1000;

  // Log location to Supabase
  const logLocation = useCallback(
    async (latitude: number, longitude: number) => {
      if (!bookingId || !pswId) {
        console.warn("Cannot log location: missing bookingId or pswId");
        return;
      }

      const now = Date.now();
      // Throttle: only log if enough time has passed since last log
      if (now - lastLogTimeRef.current < intervalMs) {
        return;
      }

      try {
        const { error } = await supabase.from("location_logs").insert({
          booking_id: bookingId,
          psw_id: pswId,
          latitude,
          longitude,
        });

        if (error) {
          console.error("Failed to log location:", error);
          setState((prev) => ({ ...prev, error: error.message }));
        } else {
          lastLogTimeRef.current = now;
          setState((prev) => ({ ...prev, lastLoggedAt: new Date(), error: null }));
          console.log("Location logged successfully:", { latitude, longitude });
        }
      } catch (err) {
        console.error("Location logging error:", err);
      }
    },
    [bookingId, pswId, intervalMs]
  );

  // Handle position update from geolocation
  const handlePositionUpdate = useCallback(
    (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;

      setState((prev) => ({
        ...prev,
        latitude,
        longitude,
        accuracy,
        timestamp: new Date(),
        error: null,
      }));

      // Log to database (throttled)
      logLocation(latitude, longitude);
    },
    [logLocation]
  );

  // Handle geolocation error
  const handlePositionError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = "Unknown location error";

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Location permission denied. Please enable location access.";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Location information unavailable.";
        break;
      case error.TIMEOUT:
        errorMessage = "Location request timed out.";
        break;
    }

    console.error("Geolocation error:", errorMessage);
    setState((prev) => ({ ...prev, error: errorMessage }));
  }, []);

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by this browser.",
      }));
      return;
    }

    if (watchIdRef.current !== null) {
      return; // Already tracking
    }

    console.log("Starting location tracking...");

    // Get initial position immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handlePositionUpdate(position);
        // Force immediate log on start
        lastLogTimeRef.current = 0;
        logLocation(position.coords.latitude, position.coords.longitude);
      },
      handlePositionError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000, // Accept cached position up to 1 minute old
      }
    );

    setState((prev) => ({ ...prev, isTracking: true }));
  }, [handlePositionUpdate, handlePositionError, logLocation]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      console.log("Stopping location tracking...");
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setState((prev) => ({ ...prev, isTracking: false }));
    }
  }, []);

  // Effect to start/stop tracking based on isActive
  useEffect(() => {
    if (isActive && bookingId && pswId) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isActive, bookingId, pswId, startTracking, stopTracking]);

  // Force log current position (for manual trigger)
  const forceLogCurrentPosition = useCallback(() => {
    if (state.latitude !== null && state.longitude !== null) {
      lastLogTimeRef.current = 0; // Reset throttle
      logLocation(state.latitude, state.longitude);
    }
  }, [state.latitude, state.longitude, logLocation]);

  return {
    ...state,
    startTracking,
    stopTracking,
    forceLogCurrentPosition,
  };
};

export default usePSWLocationTracking;
