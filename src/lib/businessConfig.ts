// Business Configuration & Pricing Engine
// Central office location (Toronto, ON)
export const OFFICE_LOCATION = {
  lat: 43.6532,
  lng: -79.3832,
  address: "100 Queen St W, Toronto, ON M5H 2N2",
};

// Service radius in kilometers
export const SERVICE_RADIUS_KM = 75;

// Cancellation policy hours threshold
export const CANCELLATION_THRESHOLD_HOURS = 4;

// Default pricing configuration
export interface PricingConfig {
  baseHourlyRates: {
    "personal-care": number;
    "companionship": number;
    "meal-prep": number;
    "medication": number;
    "light-housekeeping": number;
    "transportation": number;
    "respite": number;
  };
  surgeMultiplier: number;
  minimumHours: number;
}

export const DEFAULT_PRICING: PricingConfig = {
  baseHourlyRates: {
    "personal-care": 35,
    "companionship": 32,
    "meal-prep": 30,
    "medication": 35,
    "light-housekeeping": 28,
    "transportation": 38,
    "respite": 40,
  },
  surgeMultiplier: 1.0,
  minimumHours: 2,
};

// Get pricing from localStorage (admin-set) or use defaults
export const getPricing = (): PricingConfig => {
  const stored = localStorage.getItem("adminPricing");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_PRICING;
    }
  }
  return DEFAULT_PRICING;
};

// Save pricing to localStorage
export const savePricing = (pricing: PricingConfig): void => {
  localStorage.setItem("adminPricing", JSON.stringify(pricing));
};

// Calculate distance between two points using Haversine formula
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
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

// Check if address is within service radius
export const isWithinServiceRadius = (lat: number, lng: number): boolean => {
  const distance = calculateDistance(
    OFFICE_LOCATION.lat,
    OFFICE_LOCATION.lng,
    lat,
    lng
  );
  return distance <= SERVICE_RADIUS_KM;
};

// Calculate total price
export const calculateTotalPrice = (
  serviceType: keyof PricingConfig["baseHourlyRates"],
  hours: number,
  isAsap: boolean = false
): { subtotal: number; surgeAmount: number; total: number } => {
  const pricing = getPricing();
  const baseRate = pricing.baseHourlyRates[serviceType] || 30;
  const subtotal = baseRate * hours;
  
  // Apply surge multiplier if set
  const effectiveMultiplier = isAsap ? Math.max(pricing.surgeMultiplier, 1.25) : pricing.surgeMultiplier;
  const surgeAmount = subtotal * (effectiveMultiplier - 1);
  const total = subtotal + surgeAmount;
  
  return { subtotal, surgeAmount, total };
};

// Check if cancellation qualifies for refund
export const checkCancellationRefund = (
  shiftDate: string,
  shiftStartTime: string,
  isAsapBooking: boolean = false
): { eligible: boolean; message: string } => {
  // ASAP bookings are never refundable
  if (isAsapBooking) {
    return {
      eligible: false,
      message: "Immediate service requests are non-refundable. Please call the office for special circumstances.",
    };
  }

  const shiftStart = new Date(`${shiftDate}T${shiftStartTime}:00`);
  const now = new Date();
  const hoursUntilShift = (shiftStart.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilShift >= CANCELLATION_THRESHOLD_HOURS) {
    return {
      eligible: true,
      message: "Cancellation confirmed. Your refund is being processed.",
    };
  }

  return {
    eligible: false,
    message: "Cancellations within 4 hours are non-refundable. Please call the office for special circumstances.",
  };
};

// PSW policy text
export const PSW_POLICY_TEXT = {
  shiftWarning: "Any missed or late shifts will result in removal from the platform.",
  privacyError: "For your privacy, please do not include personal contact information in the notes. Use the office number for all follow-ups.",
};

// Format service type for display
export const formatServiceType = (type: string): string => {
  return type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
