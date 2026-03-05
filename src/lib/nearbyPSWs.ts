// PSW directory helper for finding PSWs by city
// Uses the secure psw_public_directory view (no sensitive data exposed)

import { supabase } from "@/integrations/supabase/client";

export interface NearbyPSW {
  first_name: string;
  last_name: string;
  home_city: string | null;
  years_experience: string | null;
  languages: string[] | null;
  gender: string | null;
  profile_photo_url: string | null;
  certifications: string | null;
  distanceKm: number;
}

// Ontario city center coordinates (kept for reference/future use)
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
 * Query approved PSWs using the secure public directory view.
 * Uses the get_nearby_psws RPC for proximity-based results.
 */
export const getNearbyPSWs = async (
  cityCenterLat: number,
  cityCenterLng: number,
  radiusKm: number = 50,
): Promise<NearbyPSW[]> => {
  // Use the SECURITY DEFINER RPC function for proximity search
  const { data, error } = await supabase.rpc("get_nearby_psws", {
    p_lat: cityCenterLat,
    p_lng: cityCenterLng,
    p_radius_km: radiusKm,
  });

  if (error || !data) {
    console.error("Error fetching nearby PSWs:", error);
    return [];
  }

  return (data as any[]).map((psw) => ({
    first_name: psw.first_name,
    last_name: psw.last_name,
    home_city: psw.home_city,
    years_experience: psw.years_experience,
    languages: psw.languages,
    gender: psw.gender,
    profile_photo_url: psw.profile_photo_url,
    certifications: null,
    distanceKm: 0,
  }));
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
