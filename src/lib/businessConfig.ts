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

// Task duration configuration (in minutes)
export interface TaskDurations {
  "personal-care": number;
  "companionship": number;
  "meal-prep": number;
  "medication": number;
  "light-housekeeping": number;
  "transportation": number;
  "respite": number;
  "doctor-escort": number;
}

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
  taskDurations: TaskDurations;
  surgeMultiplier: number;
  minimumHours: number;
  doctorEscortMinimumHours: number;
}

export const DEFAULT_TASK_DURATIONS: TaskDurations = {
  "personal-care": 45,
  "companionship": 60,
  "meal-prep": 30,
  "medication": 15,
  "light-housekeeping": 30,
  "transportation": 45,
  "respite": 60,
  "doctor-escort": 120,
};

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
  taskDurations: DEFAULT_TASK_DURATIONS,
  surgeMultiplier: 1.0,
  minimumHours: 1,
  doctorEscortMinimumHours: 2,
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

// Calculate stacked duration from selected services
export const calculateStackedDuration = (
  selectedServices: string[],
  includesDoctorEscort: boolean = false
): { totalMinutes: number; totalHours: number } => {
  const pricing = getPricing();
  
  let totalMinutes = selectedServices.reduce((acc, service) => {
    const duration = pricing.taskDurations[service as keyof TaskDurations] || 0;
    return acc + duration;
  }, 0);
  
  // Apply minimum hours
  const minimumMinutes = includesDoctorEscort 
    ? pricing.doctorEscortMinimumHours * 60 
    : pricing.minimumHours * 60;
  
  totalMinutes = Math.max(totalMinutes, minimumMinutes);
  
  return {
    totalMinutes,
    totalHours: totalMinutes / 60,
  };
};

// Format minutes to readable duration
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
};

// Calculate total price with task-based duration
export const calculateTotalPrice = (
  serviceType: keyof PricingConfig["baseHourlyRates"] | string,
  hours: number,
  isAsap: boolean = false
): { subtotal: number; surgeAmount: number; total: number } => {
  const pricing = getPricing();
  // Map doctor-escort to companionship for pricing
  const priceKey = serviceType === "doctor-escort" ? "companionship" : serviceType;
  const baseRate = pricing.baseHourlyRates[priceKey as keyof PricingConfig["baseHourlyRates"]] || 30;
  const subtotal = baseRate * hours;
  
  // Apply surge multiplier if set
  const effectiveMultiplier = isAsap ? Math.max(pricing.surgeMultiplier, 1.25) : pricing.surgeMultiplier;
  const surgeAmount = subtotal * (effectiveMultiplier - 1);
  const total = subtotal + surgeAmount;
  
  return { subtotal, surgeAmount, total };
};

// Calculate price for multiple services with stacked duration
export const calculateMultiServicePrice = (
  selectedServices: string[],
  isAsap: boolean = false
): { 
  subtotal: number; 
  surgeAmount: number; 
  total: number; 
  totalMinutes: number;
  totalHours: number;
} => {
  const pricing = getPricing();
  const includesDoctorEscort = selectedServices.includes("doctor-escort");
  const { totalMinutes, totalHours } = calculateStackedDuration(selectedServices, includesDoctorEscort);
  
  // Calculate weighted average rate based on selected services
  let totalRate = 0;
  selectedServices.forEach(service => {
    const priceKey = service === "doctor-escort" ? "companionship" : service;
    const rate = pricing.baseHourlyRates[priceKey as keyof PricingConfig["baseHourlyRates"]] || 30;
    totalRate += rate;
  });
  const avgRate = selectedServices.length > 0 ? totalRate / selectedServices.length : 30;
  
  const subtotal = avgRate * totalHours;
  const effectiveMultiplier = isAsap ? Math.max(pricing.surgeMultiplier, 1.25) : pricing.surgeMultiplier;
  const surgeAmount = subtotal * (effectiveMultiplier - 1);
  const total = subtotal + surgeAmount;
  
  return { subtotal, surgeAmount, total, totalMinutes, totalHours };
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
