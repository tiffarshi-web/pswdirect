// Hook for monitoring PSW proximity to client location
// Triggers alerts when PSW is within specified distance

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocationLogs } from "./useLocationLogs";
import { geocodeAddress, calculateDistanceMeters, formatDistance } from "@/lib/geocodingUtils";

interface ProximityAlertOptions {
  bookingId: string;
  clientAddress: string;
  proximityThresholdMeters?: number;
  enabled?: boolean;
}

interface ProximityState {
  isWithinProximity: boolean;
  distanceMeters: number | null;
  distanceFormatted: string | null;
  clientCoords: { lat: number; lng: number } | null;
  hasAlerted: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useProximityAlert = ({
  bookingId,
  clientAddress,
  proximityThresholdMeters = 500,
  enabled = true,
}: ProximityAlertOptions) => {
  const [state, setState] = useState<ProximityState>({
    isWithinProximity: false,
    distanceMeters: null,
    distanceFormatted: null,
    clientCoords: null,
    hasAlerted: false,
    isLoading: true,
    error: null,
  });

  const hasAlertedRef = useRef(false);

  // Get PSW location logs
  const { latestLog, isLoading: logsLoading } = useLocationLogs({
    bookingId,
    limit: 1,
    refreshIntervalMs: 30000, // Check every 30 seconds
    enabled,
  });

  // Geocode client address once
  useEffect(() => {
    if (!clientAddress || !enabled) return;

    const fetchCoords = async () => {
      try {
        const result = await geocodeAddress(clientAddress);
        if (result) {
          setState((prev) => ({
            ...prev,
            clientCoords: { lat: result.lat, lng: result.lng },
            isLoading: false,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            error: "Could not geocode client address",
            isLoading: false,
          }));
        }
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: "Geocoding failed",
          isLoading: false,
        }));
      }
    };

    fetchCoords();
  }, [clientAddress, enabled]);

  // Calculate proximity when PSW location updates
  useEffect(() => {
    if (!latestLog || !state.clientCoords || !enabled) return;

    const distance = calculateDistanceMeters(
      latestLog.latitude,
      latestLog.longitude,
      state.clientCoords.lat,
      state.clientCoords.lng
    );

    const isWithin = distance <= proximityThresholdMeters;

    setState((prev) => ({
      ...prev,
      distanceMeters: Math.round(distance),
      distanceFormatted: formatDistance(distance),
      isWithinProximity: isWithin,
      // Only set hasAlerted if transitioning INTO proximity for the first time
      hasAlerted: isWithin && !hasAlertedRef.current ? true : prev.hasAlerted,
    }));

    // Track if we've alerted (prevents duplicate alerts)
    if (isWithin && !hasAlertedRef.current) {
      hasAlertedRef.current = true;
    }
  }, [latestLog, state.clientCoords, proximityThresholdMeters, enabled]);

  // Reset alert state (for re-triggering if needed)
  const resetAlert = useCallback(() => {
    hasAlertedRef.current = false;
    setState((prev) => ({ ...prev, hasAlerted: false }));
  }, []);

  return {
    ...state,
    isLoading: state.isLoading || logsLoading,
    resetAlert,
  };
};

export default useProximityAlert;
