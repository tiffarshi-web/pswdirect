// Geocoding utilities — Google Places (New) via the browser key.
// No OpenStreetMap / Nominatim: pins must match real Google street data.

import { geocodeViaPlaces } from "@/lib/googlePlaces";

interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

// Simple in-memory cache to reduce API calls
const geocodeCache = new Map<string, GeocodingResult>();

/**
 * Geocode an address using Google Places text search.
 * @param address - Street address to geocode
 * @returns Promise with lat/lng coordinates or null if not found
 */
export const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
  if (!address || address.trim().length < 5) {
    console.warn("Geocoding: Address too short or empty");
    return null;
  }

  const cacheKey = address.trim().toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const searchAddress = address.includes("Canada") ? address : `${address}, Canada`;
    const place = await geocodeViaPlaces(searchAddress, "ca");

    if (!place) {
      console.warn("Geocoding: No results found for address:", address);
      return null;
    }

    const result: GeocodingResult = {
      lat: place.lat,
      lng: place.lng,
      displayName: place.displayName,
    };

    geocodeCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};


/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
export const calculateDistanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Check if a PSW is within proximity of a target location
 * @param pswLat - PSW latitude
 * @param pswLng - PSW longitude
 * @param targetLat - Target latitude
 * @param targetLng - Target longitude
 * @param proximityMeters - Proximity threshold in meters (default 500m)
 */
export const isWithinProximity = (
  pswLat: number,
  pswLng: number,
  targetLat: number,
  targetLng: number,
  proximityMeters: number = 500
): boolean => {
  const distance = calculateDistanceMeters(pswLat, pswLng, targetLat, targetLng);
  return distance <= proximityMeters;
};

/**
 * Format distance for display
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};
