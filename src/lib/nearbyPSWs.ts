// Geo-proximity helper for finding PSWs near a city center
// Uses Haversine distance from serviceRadiusStore

import { supabase } from "@/integrations/supabase/client";
import { calculateHaversineDistance } from "@/lib/serviceRadiusStore";

export interface NearbyPSW {
  first_name: string;
  last_name: string;
  home_city: string | null;
  years_experience: string | null;
  languages: string[] | null;
  gender: string | null;
  home_lat: number | null;
  home_lng: number | null;
  distanceKm: number;
}

// Ontario city center coordinates
export const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  "Toronto": { lat: 43.6532, lng: -79.3832 },
  "Mississauga": { lat: 43.5890, lng: -79.6441 },
  "Brampton": { lat: 43.7315, lng: -79.7624 },
  "Vaughan": { lat: 43.8361, lng: -79.4983 },
  "Markham": { lat: 43.8561, lng: -79.3370 },
  "Richmond Hill": { lat: 43.8828, lng: -79.4403 },
  "Oakville": { lat: 43.4675, lng: -79.6877 },
  "Burlington": { lat: 43.3255, lng: -79.7990 },
  "Ajax": { lat: 43.8509, lng: -79.0204 },
  "Pickering": { lat: 43.8354, lng: -79.0868 },
  "Oshawa": { lat: 43.8971, lng: -78.8658 },
  "Whitby": { lat: 43.8975, lng: -78.9429 },
  "Barrie": { lat: 44.3894, lng: -79.6903 },
  "Hamilton": { lat: 43.2557, lng: -79.8711 },
  "Kitchener": { lat: 43.4516, lng: -80.4925 },
  "Waterloo": { lat: 43.4643, lng: -80.5204 },
  "Cambridge": { lat: 43.3616, lng: -80.3144 },
  "London": { lat: 42.9849, lng: -81.2453 },
  "Windsor": { lat: 42.3149, lng: -83.0364 },
  "St. Catharines": { lat: 43.1594, lng: -79.2469 },
  "Niagara Falls": { lat: 43.0896, lng: -79.0849 },
  "Guelph": { lat: 43.5448, lng: -80.2482 },
  "Kingston": { lat: 44.2312, lng: -76.4860 },
  "Peterborough": { lat: 44.3091, lng: -78.3197 },
  "Ottawa": { lat: 45.4215, lng: -75.6972 },
};

/**
 * Query approved PSWs within a radius of a given coordinate.
 * Fetches all approved PSWs with coordinates, then filters client-side with Haversine.
 */
export const getNearbyPSWs = async (
  cityCenterLat: number,
  cityCenterLng: number,
  radiusKm: number = 50,
): Promise<NearbyPSW[]> => {
  // Query approved PSWs — use psw_profiles directly (RLS allows reading approved profiles)
  const { data, error } = await (supabase as any)
    .from("psw_profiles")
    .select("first_name, last_name, home_city, years_experience, languages, gender, home_lat, home_lng")
    .eq("vetting_status", "approved")
    .not("home_lat", "is", null)
    .not("home_lng", "is", null) as { data: any[] | null; error: any };

  if (error || !data) {
    console.error("Error fetching PSWs for proximity search:", error);
    return [];
  }

  const results: NearbyPSW[] = [];

  for (const psw of data) {
    if (psw.home_lat == null || psw.home_lng == null) continue;

    const distance = calculateHaversineDistance(
      cityCenterLat,
      cityCenterLng,
      psw.home_lat,
      psw.home_lng,
    );

    if (distance <= radiusKm) {
      results.push({
        ...psw,
        distanceKm: Math.round(distance),
      });
    }
  }

  // Sort by distance ascending
  results.sort((a, b) => a.distanceKm - b.distanceKm);

  return results;
};

/**
 * Get nearby PSWs for a named city using the CITY_CENTERS lookup.
 */
export const getNearbyPSWsByCity = async (
  city: string,
  radiusKm: number = 50,
): Promise<NearbyPSW[]> => {
  const center = CITY_CENTERS[city];
  if (!center) {
    console.warn(`No city center coordinates for: ${city}`);
    return [];
  }
  return getNearbyPSWs(center.lat, center.lng, radiusKm);
};
