// Auto-geocode utility for PSW profiles
// Ensures PSWs have home_lat/home_lng populated from their postal code or city.
// Used on: PSW approval, address/postal code updates, and admin bulk geocode.

import { supabase } from "@/integrations/supabase/client";
import { getCoordinatesFromPostalCode } from "@/lib/postalCodeUtils";
import { geocodeAddress } from "@/lib/geocodingUtils";

/**
 * Ensure a PSW profile has lat/lng coordinates.
 * Uses local FSA lookup first, then Nominatim as fallback.
 * Only updates if home_lat or home_lng is null/0.
 * Returns true if coords were set (either already present or newly geocoded).
 */
export const ensurePSWCoordinates = async (
  pswId: string,
  postalCode: string | null,
  city: string | null,
  existingLat?: number | null,
  existingLng?: number | null,
): Promise<{ success: boolean; source: string }> => {
  // If we don't know existing coords, fetch them
  if (existingLat === undefined || existingLng === undefined) {
    const { data } = await supabase
      .from("psw_profiles")
      .select("home_lat, home_lng")
      .eq("id", pswId)
      .maybeSingle();
    existingLat = data?.home_lat ?? null;
    existingLng = data?.home_lng ?? null;
  }

  // Skip if already has valid coords
  if (existingLat && existingLng && existingLat !== 0 && existingLng !== 0) {
    return { success: true, source: "existing" };
  }

  let lat: number | null = null;
  let lng: number | null = null;
  let source = "none";

  // 1) Try local FSA lookup (instant, no API)
  if (postalCode) {
    const localCoords = getCoordinatesFromPostalCode(postalCode);
    if (localCoords) {
      lat = localCoords.lat;
      lng = localCoords.lng;
      source = "fsa_lookup";
    }
  }

  // 2) Fallback to Nominatim
  if (lat === null || lng === null) {
    const searchStr = [postalCode, city, "Ontario", "Canada"].filter(Boolean).join(", ");
    if (searchStr.length > 10) {
      try {
        const result = await geocodeAddress(searchStr);
        if (result) {
          lat = result.lat;
          lng = result.lng;
          source = "nominatim";
        }
      } catch (err) {
        console.error("Geocode fallback failed for PSW", pswId, err);
      }
    }
  }

  if (lat === null || lng === null) {
    return { success: false, source: "failed" };
  }

  // Write to DB
  const { error } = await supabase
    .from("psw_profiles")
    .update({ home_lat: lat, home_lng: lng })
    .eq("id", pswId);

  if (error) {
    console.error("Failed to update coords for PSW", pswId, error);
    return { success: false, source: "db_error" };
  }

  return { success: true, source };
};
