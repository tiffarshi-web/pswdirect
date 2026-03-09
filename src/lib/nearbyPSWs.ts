// PSW directory helper for finding PSWs by city
// Uses the secure psw_public_directory view (no sensitive data exposed)

import { supabase } from "@/integrations/supabase/client";
import { SEO_CITY_CENTERS } from "@/lib/seoCityData";
import { fetchActiveServiceRadius } from "@/lib/serviceRadiusStore";

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

// Re-export CITY_CENTERS from centralized source for backward compatibility
export const CITY_CENTERS = SEO_CITY_CENTERS;

/**
 * Query approved PSWs using the secure public directory view.
 * Uses the get_nearby_psws RPC for proximity-based results.
 * If no radiusKm provided, uses admin-controlled active_service_radius.
 */
export const getNearbyPSWs = async (
  cityCenterLat: number,
  cityCenterLng: number,
  radiusKm?: number,
): Promise<NearbyPSW[]> => {
  // Use admin-controlled radius if not explicitly provided
  const effectiveRadius = radiusKm ?? await fetchActiveServiceRadius();

  const { data, error } = await supabase.rpc("get_nearby_psws", {
    p_lat: cityCenterLat,
    p_lng: cityCenterLng,
    p_radius_km: effectiveRadius,
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
 * Get nearby PSWs for a named city using the centralized city centers.
 * Uses admin-controlled radius if not explicitly provided.
 */
export const getNearbyPSWsByCity = async (
  city: string,
  radiusKm?: number,
): Promise<NearbyPSW[]> => {
  const center = SEO_CITY_CENTERS[city];
  if (!center) {
    console.warn(`No city center coordinates for: ${city}`);
    return [];
  }
  return getNearbyPSWs(center.lat, center.lng, radiusKm);
};
