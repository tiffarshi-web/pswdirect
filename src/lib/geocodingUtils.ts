// Geocoding utilities using free Nominatim (OpenStreetMap) API
// Rate limited to 1 request per second as per usage policy

interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

// Simple in-memory cache to reduce API calls
const geocodeCache = new Map<string, GeocodingResult>();

/**
 * Geocode an address using OpenStreetMap's Nominatim API (free)
 * @param address - Street address to geocode
 * @returns Promise with lat/lng coordinates or null if not found
 */
export const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
  if (!address || address.trim().length < 5) {
    console.warn("Geocoding: Address too short or empty");
    return null;
  }

  // Normalize address for cache key
  const cacheKey = address.trim().toLowerCase();
  
  // Check cache first
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    // Add ", Canada" suffix to improve accuracy for Canadian addresses
    const searchAddress = address.includes("Canada") ? address : `${address}, Canada`;
    const encodedAddress = encodeURIComponent(searchAddress);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=ca`,
      {
        headers: {
          "User-Agent": "PSWDirect/1.0", // Required by Nominatim usage policy
        },
      }
    );

    if (!response.ok) {
      console.error("Geocoding API error:", response.status);
      return null;
    }

    const data: NominatimResponse[] = await response.json();

    if (data.length === 0) {
      console.warn("Geocoding: No results found for address:", address);
      return null;
    }

    const result: GeocodingResult = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };

    // Cache the result
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
