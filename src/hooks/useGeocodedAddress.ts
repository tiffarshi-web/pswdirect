// Hook for using geocoded client coordinates with caching
// Used by map components to display the client's home location

import { useState, useEffect } from "react";
import { geocodeAddress } from "@/lib/geocodingUtils";

interface UseGeocodedAddressOptions {
  address: string | null | undefined;
  enabled?: boolean;
}

interface GeocodedAddressState {
  coords: { lat: number; lng: number } | null;
  displayName: string | null;
  isLoading: boolean;
  error: string | null;
}

export const useGeocodedAddress = ({
  address,
  enabled = true,
}: UseGeocodedAddressOptions) => {
  const [state, setState] = useState<GeocodedAddressState>({
    coords: null,
    displayName: null,
    isLoading: !!address && enabled,
    error: null,
  });

  useEffect(() => {
    if (!address || !enabled) {
      setState({
        coords: null,
        displayName: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    let cancelled = false;

    const fetchCoords = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await geocodeAddress(address);

        if (cancelled) return;

        if (result) {
          setState({
            coords: { lat: result.lat, lng: result.lng },
            displayName: result.displayName,
            isLoading: false,
            error: null,
          });
        } else {
          setState({
            coords: null,
            displayName: null,
            isLoading: false,
            error: "Could not find coordinates for this address",
          });
        }
      } catch (err) {
        if (cancelled) return;
        setState({
          coords: null,
          displayName: null,
          isLoading: false,
          error: "Geocoding failed",
        });
      }
    };

    fetchCoords();

    return () => {
      cancelled = true;
    };
  }, [address, enabled]);

  return state;
};

export default useGeocodedAddress;
