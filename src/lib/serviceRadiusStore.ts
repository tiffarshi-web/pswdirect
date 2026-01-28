// Service Radius Management
// Global active_service_radius persisted in Supabase app_settings

import { supabase } from "@/integrations/supabase/client";

// Default service radius in km
export const DEFAULT_SERVICE_RADIUS_KM = 75;
export const MIN_SERVICE_RADIUS_KM = 5;
export const MAX_SERVICE_RADIUS_KM = 75;
export const RADIUS_INCREMENT_KM = 5;

// Cache for the active service radius (updated when fetched from DB)
let cachedServiceRadius: number | null = null;

// Fetch the active service radius from the database
export const fetchActiveServiceRadius = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "active_service_radius")
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching active_service_radius:", error);
      return cachedServiceRadius ?? DEFAULT_SERVICE_RADIUS_KM;
    }
    
    if (data?.setting_value) {
      const radius = parseInt(data.setting_value, 10);
      if (!isNaN(radius) && radius >= MIN_SERVICE_RADIUS_KM && radius <= MAX_SERVICE_RADIUS_KM) {
        cachedServiceRadius = radius;
        return radius;
      }
    }
    
    return DEFAULT_SERVICE_RADIUS_KM;
  } catch (err) {
    console.error("Error fetching active_service_radius:", err);
    return cachedServiceRadius ?? DEFAULT_SERVICE_RADIUS_KM;
  }
};

// Update the active service radius in the database
export const updateActiveServiceRadius = async (radiusKm: number): Promise<boolean> => {
  try {
    // Validate input
    if (radiusKm < MIN_SERVICE_RADIUS_KM || radiusKm > MAX_SERVICE_RADIUS_KM) {
      console.error("Invalid radius value:", radiusKm);
      return false;
    }
    
    // Round to nearest increment
    const roundedRadius = Math.round(radiusKm / RADIUS_INCREMENT_KM) * RADIUS_INCREMENT_KM;
    
    const { error } = await supabase
      .from("app_settings")
      .upsert({
        setting_key: "active_service_radius",
        setting_value: roundedRadius.toString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "setting_key"
      });
    
    if (error) {
      console.error("Error updating active_service_radius:", error);
      return false;
    }
    
    // Update cache
    cachedServiceRadius = roundedRadius;
    return true;
  } catch (err) {
    console.error("Error updating active_service_radius:", err);
    return false;
  }
};

// Get cached radius (for sync operations) - returns cached or default
export const getCachedServiceRadius = (): number => {
  return cachedServiceRadius ?? DEFAULT_SERVICE_RADIUS_KM;
};

// Generate radius options for slider (5km to 75km in 5km steps)
export const getRadiusOptions = (): number[] => {
  const options: number[] = [];
  for (let r = MIN_SERVICE_RADIUS_KM; r <= MAX_SERVICE_RADIUS_KM; r += RADIUS_INCREMENT_KM) {
    options.push(r);
  }
  return options;
};

// Haversine formula to calculate distance between two coordinates in km
export const calculateHaversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
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

// Check if a client is within active service radius of any approved PSW
export interface CoverageCheckResult {
  withinCoverage: boolean;
  closestDistance: number | null;
  nearestPSWCity: string | null;
  activeRadiusKm: number;
  message: string;
}

// This will be called from postalCodeUtils to use the active radius
export const checkCoverageWithActiveRadius = async (
  clientPostalCode: string,
  pswProfiles: Array<{ 
    vettingStatus: string; 
    homePostalCode?: string;
    homeCity?: string;
    coords?: { lat: number; lng: number };
  }>,
  getCoordinates: (postalCode: string) => { lat: number; lng: number } | null
): Promise<CoverageCheckResult> => {
  // Fetch the current active radius
  const activeRadiusKm = await fetchActiveServiceRadius();
  
  // Filter to approved PSWs with valid coordinates
  const approvedPSWs = pswProfiles.filter(
    p => p.vettingStatus === "approved" && p.homePostalCode
  );
  
  if (approvedPSWs.length === 0) {
    return {
      withinCoverage: false,
      closestDistance: null,
      nearestPSWCity: null,
      activeRadiusKm,
      message: "We are currently expanding! We haven't reached your area yet, but check back soon.",
    };
  }
  
  // Get client coordinates
  const clientCoords = getCoordinates(clientPostalCode);
  if (!clientCoords) {
    return {
      withinCoverage: false,
      closestDistance: null,
      nearestPSWCity: null,
      activeRadiusKm,
      message: "Unable to verify your location. Please check your postal code.",
    };
  }
  
  let closestDistance: number | null = null;
  let nearestPSWCity: string | null = null;
  let withinCoverage = false;
  
  for (const psw of approvedPSWs) {
    const pswCoords = psw.coords || (psw.homePostalCode ? getCoordinates(psw.homePostalCode) : null);
    
    if (pswCoords) {
      const distance = calculateHaversineDistance(
        clientCoords.lat,
        clientCoords.lng,
        pswCoords.lat,
        pswCoords.lng
      );
      
      if (closestDistance === null || distance < closestDistance) {
        closestDistance = distance;
        nearestPSWCity = psw.homeCity || null;
      }
      
      // Check if within the ACTIVE service radius
      if (distance <= activeRadiusKm) {
        withinCoverage = true;
      }
    }
  }
  
  if (withinCoverage) {
    return {
      withinCoverage: true,
      closestDistance: closestDistance !== null ? Math.round(closestDistance) : null,
      nearestPSWCity,
      activeRadiusKm,
      message: "Great news! We have PSWs available in your area.",
    };
  }
  
  // Custom message for out-of-coverage areas
  return {
    withinCoverage: false,
    closestDistance: closestDistance !== null ? Math.round(closestDistance) : null,
    nearestPSWCity,
    activeRadiusKm,
    message: "We are currently expanding! We haven't reached your area yet, but check back soon.",
  };
};
