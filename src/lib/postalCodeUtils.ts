// Canadian Postal Code Utilities
// Postal code format: A1A 1A1 (letter-number-letter space number-letter-number)
// Also accepts A1A1A1 (without space)

// Canadian postal code regex pattern - accepts both A1A 1A1 and A1A1A1 formats
export const CANADIAN_POSTAL_CODE_REGEX = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;

// Format postal code to standard format (A1A 1A1)
// Automatically adds space if missing
export const formatPostalCode = (postalCode: string): string => {
  // Remove all spaces and convert to uppercase
  const cleaned = postalCode.replace(/\s/g, "").toUpperCase();
  
  // If we have exactly 6 characters, format with space
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  
  // For partial input, just uppercase it
  return postalCode.toUpperCase().slice(0, 7); // Max 7 chars (A1A 1A1)
};

// Validate Canadian postal code format
// Accepts both "A1A 1A1" and "A1A1A1" formats
export const isValidCanadianPostalCode = (postalCode: string): boolean => {
  const trimmed = postalCode.trim();
  // Accept both with and without space
  return CANADIAN_POSTAL_CODE_REGEX.test(trimmed);
};

// Office postal code (Belleville, ON)
export const OFFICE_POSTAL_CODE = "K8N 1A1";

// Approximate coordinates for major Canadian postal code FSAs (Forward Sortation Areas)
// This is a simplified geocoding system - in production, use a real geocoding API
const postalCodeCoordinates: Record<string, { lat: number; lng: number; city: string }> = {
  // Ontario - Toronto area
  "M": { lat: 43.6532, lng: -79.3832, city: "Toronto" },
  "L": { lat: 43.5890, lng: -79.6441, city: "Mississauga/Peel" },
  // Ontario - Ottawa area
  "K": { lat: 45.4215, lng: -75.6972, city: "Ottawa/Eastern Ontario" },
  // Ontario - Other
  "N": { lat: 43.0096, lng: -81.2737, city: "London/Southwestern Ontario" },
  "P": { lat: 46.4917, lng: -80.9930, city: "Northern Ontario" },
  // Quebec
  "H": { lat: 45.5017, lng: -73.5673, city: "Montreal" },
  "G": { lat: 46.8139, lng: -71.2080, city: "Quebec City" },
  "J": { lat: 45.5, lng: -73.0, city: "Quebec Rural" },
  // British Columbia
  "V": { lat: 49.2827, lng: -123.1207, city: "Vancouver/BC" },
  // Alberta
  "T": { lat: 51.0447, lng: -114.0719, city: "Calgary/Alberta" },
  // Manitoba
  "R": { lat: 49.8951, lng: -97.1384, city: "Winnipeg/Manitoba" },
  // Saskatchewan
  "S": { lat: 52.1332, lng: -106.6700, city: "Saskatchewan" },
  // Nova Scotia
  "B": { lat: 44.6488, lng: -63.5752, city: "Nova Scotia" },
  // New Brunswick
  "E": { lat: 45.9636, lng: -66.6431, city: "New Brunswick" },
  // Newfoundland
  "A": { lat: 47.5615, lng: -52.7126, city: "Newfoundland" },
  // Prince Edward Island
  "C": { lat: 46.2382, lng: -63.1311, city: "PEI" },
};

// More specific coordinates for Belleville area (K8N)
const bellevilleCoordinates = { lat: 44.1628, lng: -77.3832 };

// Get approximate coordinates from postal code
export const getCoordinatesFromPostalCode = (postalCode: string): { lat: number; lng: number } | null => {
  if (!isValidCanadianPostalCode(postalCode)) {
    return null;
  }

  const cleaned = postalCode.replace(/\s/g, "").toUpperCase();
  const fsa = cleaned.substring(0, 3); // Forward Sortation Area
  const firstLetter = cleaned.charAt(0);

  // Special case for Belleville area (K8N - K8P range)
  if (fsa.startsWith("K8")) {
    // Belleville and surrounding area
    // Add some random variation for demo purposes
    return {
      lat: bellevilleCoordinates.lat + (Math.random() * 0.1 - 0.05),
      lng: bellevilleCoordinates.lng + (Math.random() * 0.1 - 0.05),
    };
  }

  // Check if we have coordinates for this FSA prefix
  const coords = postalCodeCoordinates[firstLetter];
  if (coords) {
    // Add some random variation based on the full FSA
    const variation = parseInt(cleaned.charAt(1)) * 0.02;
    return {
      lat: coords.lat + (Math.random() * 0.2 - 0.1) + variation,
      lng: coords.lng + (Math.random() * 0.2 - 0.1) - variation,
    };
  }

  return null;
};

// Get coordinates for office postal code
export const getOfficeCoordinates = (): { lat: number; lng: number } => {
  return bellevilleCoordinates;
};

// Calculate distance between postal codes in kilometers
export const calculateDistanceBetweenPostalCodes = (
  postalCode1: string,
  postalCode2: string
): number | null => {
  const coords1 = getCoordinatesFromPostalCode(postalCode1);
  const coords2 = getCoordinatesFromPostalCode(postalCode2);

  if (!coords1 || !coords2) {
    return null;
  }

  // Haversine formula
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((coords2.lat - coords1.lat) * Math.PI) / 180;
  const dLon = ((coords2.lng - coords1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coords1.lat * Math.PI) / 180) *
      Math.cos((coords2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check if postal code is within service radius from office
export const isPostalCodeWithinServiceRadius = (
  postalCode: string,
  radiusKm: number = 75
): { withinRadius: boolean; distance: number | null; message: string } => {
  const distance = calculateDistanceBetweenPostalCodes(postalCode, OFFICE_POSTAL_CODE);

  if (distance === null) {
    return {
      withinRadius: false,
      distance: null,
      message: "Unable to verify postal code. Please check the format.",
    };
  }

  if (distance > radiusKm) {
    return {
      withinRadius: false,
      distance: Math.round(distance),
      message: `We currently only service within ${radiusKm}km of our central office. Please contact us for special requests.`,
    };
  }

  return {
    withinRadius: true,
    distance: Math.round(distance),
    message: `Address is within our ${radiusKm}km service area.`,
  };
};

// PSW Check-in proximity threshold in meters
export const PSW_CHECKIN_PROXIMITY_METERS = 200;

// Calculate distance between two GPS coordinates in meters
export const calculateDistanceInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check if PSW is within check-in proximity of client address
export const isPSWWithinCheckInProximity = (
  pswLat: number,
  pswLng: number,
  clientLat: number,
  clientLng: number
): { withinProximity: boolean; distance: number; message: string } => {
  const distance = calculateDistanceInMeters(pswLat, pswLng, clientLat, clientLng);

  if (distance > PSW_CHECKIN_PROXIMITY_METERS) {
    return {
      withinProximity: false,
      distance: Math.round(distance),
      message: "You must be at the client's location to check in. If you are having GPS issues, contact the office.",
    };
  }

  return {
    withinProximity: true,
    distance: Math.round(distance),
    message: "Location verified. You can check in.",
  };
};
