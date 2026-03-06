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
  "Newmarket": { lat: 44.0592, lng: -79.4613 },
  "Aurora": { lat: 44.0065, lng: -79.4504 },
  "Milton": { lat: 43.5183, lng: -79.8774 },
  "Innisfil": { lat: 44.3023, lng: -79.5833 },
  "Orillia": { lat: 44.6083, lng: -79.4208 },
  "Bradford": { lat: 44.1145, lng: -79.5625 },
  "Alliston": { lat: 44.1530, lng: -79.8665 },
  "Cobourg": { lat: 43.9594, lng: -78.1677 },
  "Belleville": { lat: 44.1628, lng: -77.3832 },
  "Welland": { lat: 42.9922, lng: -79.2483 },
  "Stoney Creek": { lat: 43.2173, lng: -79.7652 },
  "Georgetown": { lat: 43.6526, lng: -79.9178 },
  "Dundas": { lat: 43.2667, lng: -79.9553 },
  "Woodstock": { lat: 43.1306, lng: -80.7565 },
  "Courtice": { lat: 43.8768, lng: -78.8065 },
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
