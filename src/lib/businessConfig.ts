// Business Configuration & Pricing Engine
// Central office location (Toronto, ON - Downtown)
export const OFFICE_LOCATION = {
  lat: 43.6426,
  lng: -79.3871,
  address: "Toronto, ON",
  postalCode: "M5V 3L9",
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

// Surge Zone Configuration
export interface SurgeZone {
  id: string;
  name: string;
  enabled: boolean;
  clientSurcharge: number; // Extra $ added to client price per hour
  pswBonus: number; // Extra $ added to PSW pay per hour
  postalCodePrefixes: string[]; // e.g., ["M4", "M5", "M6"] for Toronto core
  cities: string[]; // e.g., ["Toronto", "North York", "Scarborough"]
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
  hospitalRate: number; // Special rate for hospital/doctor visits
  minimumBookingFee: number; // Minimum fee regardless of duration (e.g., $25)
  taskDurations: TaskDurations;
  surgeMultiplier: number;
  minimumHours: number;
  doctorEscortMinimumHours: number;
  overtimeRatePercentage: number; // Percentage of hourly rate (e.g., 50 = half rate)
  overtimeGraceMinutes: number; // Grace period before overtime kicks in (default 14)
  overtimeBlockMinutes: number; // Overtime billed in blocks of this size (default 30)
  regionalSurgeEnabled: boolean; // Master toggle for regional surge
  surgeZones: SurgeZone[]; // List of surge zones
}

export const DEFAULT_TASK_DURATIONS: TaskDurations = {
  "personal-care": 45,
  "companionship": 60,
  "meal-prep": 30,
  "medication": 15,
  "light-housekeeping": 30,
  "transportation": 45,
  "respite": 60,
  "doctor-escort": 60, // Doctor escort starts at 1 hour, adjusted based on actual time
};

// Default Toronto/GTA Surge Zone
export const DEFAULT_SURGE_ZONES: SurgeZone[] = [
  {
    id: "toronto-gta",
    name: "Toronto / GTA",
    enabled: false,
    clientSurcharge: 10, // +$10/hr for clients in Toronto
    pswBonus: 5, // +$5/hr for PSWs working in Toronto
    postalCodePrefixes: ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"],
    cities: ["Toronto", "North York", "Scarborough", "Etobicoke", "East York", "York"],
  },
];

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
  hospitalRate: 45, // Hospital/Doctor escort rate
  minimumBookingFee: 25, // $25 minimum
  taskDurations: DEFAULT_TASK_DURATIONS,
  surgeMultiplier: 1.0,
  minimumHours: 1, // Base hour minimum
  doctorEscortMinimumHours: 1, // Doctor/Hospital starts at 1 hour, adjusted on sign-out
  overtimeRatePercentage: 50, // 50% of hourly rate for overtime
  overtimeGraceMinutes: 14, // 14 minutes grace before overtime
  overtimeBlockMinutes: 30, // Bill in 30-minute blocks
  regionalSurgeEnabled: false, // Off by default
  surgeZones: DEFAULT_SURGE_ZONES,
};

// Base hour capacity in minutes (tasks that fit in 1 hour)
export const BASE_HOUR_CAPACITY_MINUTES = 60;

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

// Calculate price for Base Hour + potential overtime warning
export const calculateBaseHourPrice = (
  selectedServices: string[]
): { 
  baseHourTotal: number; 
  hourlyRate: number;
  taskMinutes: number;
  exceedsBaseHour: boolean;
  warningMessage: string | null;
} => {
  const pricing = getPricing();
  
  // Calculate total task minutes
  const taskMinutes = selectedServices.reduce((acc, service) => {
    const duration = pricing.taskDurations[service as keyof TaskDurations] || 0;
    return acc + duration;
  }, 0);
  
  // Calculate weighted average hourly rate
  let totalRate = 0;
  selectedServices.forEach(service => {
    const priceKey = service === "doctor-escort" ? "companionship" : service;
    const rate = pricing.baseHourlyRates[priceKey as keyof PricingConfig["baseHourlyRates"]] || 30;
    totalRate += rate;
  });
  const hourlyRate = selectedServices.length > 0 ? totalRate / selectedServices.length : 30;
  
  // Base hour charge (minimum 1 hour)
  const baseHourTotal = hourlyRate * pricing.minimumHours;
  
  // Check if tasks exceed base hour capacity
  const exceedsBaseHour = taskMinutes > BASE_HOUR_CAPACITY_MINUTES;
  const warningMessage = exceedsBaseHour 
    ? "This amount of care may require additional time. Overtime will be billed in 30-minute blocks if the visit extends beyond the base hour."
    : null;
  
  return { 
    baseHourTotal, 
    hourlyRate, 
    taskMinutes, 
    exceedsBaseHour, 
    warningMessage 
  };
};

// Calculate overtime charges based on actual sign-out time
export const calculateOvertimeCharges = (
  scheduledEndTime: string, // Format: "HH:MM"
  actualSignOutTime: string, // Format: "HH:MM"
  hourlyRate: number
): {
  overtimeMinutes: number;
  billableOvertimeBlocks: number;
  overtimeCharge: number;
  withinGracePeriod: boolean;
} => {
  const pricing = getPricing();
  
  const [schedEndH, schedEndM] = scheduledEndTime.split(":").map(Number);
  const [actualH, actualM] = actualSignOutTime.split(":").map(Number);
  
  const scheduledMinutes = schedEndH * 60 + schedEndM;
  const actualMinutes = actualH * 60 + actualM;
  
  const overtimeMinutes = Math.max(0, actualMinutes - scheduledMinutes);
  
  // Check if within grace period (14 minutes by default)
  const withinGracePeriod = overtimeMinutes <= pricing.overtimeGraceMinutes;
  
  if (withinGracePeriod) {
    return {
      overtimeMinutes,
      billableOvertimeBlocks: 0,
      overtimeCharge: 0,
      withinGracePeriod: true,
    };
  }
  
  // Calculate billable blocks (30-minute increments)
  const billableOvertimeBlocks = Math.ceil(overtimeMinutes / pricing.overtimeBlockMinutes);
  
  // Calculate overtime rate (percentage of hourly rate)
  const overtimeRatePerBlock = (hourlyRate * (pricing.overtimeRatePercentage / 100)) * (pricing.overtimeBlockMinutes / 60);
  const overtimeCharge = billableOvertimeBlocks * overtimeRatePerBlock;
  
  return {
    overtimeMinutes,
    billableOvertimeBlocks,
    overtimeCharge,
    withinGracePeriod: false,
  };
};

// Calculate final booking price (base hour + overtime if applicable)
export const calculateFinalBookingPrice = (
  selectedServices: string[],
  actualSignOutTime?: string, // Optional - only for completed bookings
  scheduledEndTime?: string
): {
  baseHourTotal: number;
  overtimeCharge: number;
  total: number;
  hourlyRate: number;
  overtimeBlocks: number;
} => {
  const { baseHourTotal, hourlyRate } = calculateBaseHourPrice(selectedServices);
  
  let overtimeCharge = 0;
  let overtimeBlocks = 0;
  
  if (actualSignOutTime && scheduledEndTime) {
    const overtime = calculateOvertimeCharges(scheduledEndTime, actualSignOutTime, hourlyRate);
    overtimeCharge = overtime.overtimeCharge;
    overtimeBlocks = overtime.billableOvertimeBlocks;
  }
  
  return {
    baseHourTotal,
    overtimeCharge,
    total: baseHourTotal + overtimeCharge,
    hourlyRate,
    overtimeBlocks,
  };
};

// Legacy function for backward compatibility
export const calculateMultiServicePrice = (
  selectedServices: string[],
  isAsap: boolean = false
): { 
  subtotal: number; 
  surgeAmount: number; 
  total: number; 
  totalMinutes: number;
  totalHours: number;
  exceedsBaseHour: boolean;
  warningMessage: string | null;
} => {
  const pricing = getPricing();
  const { baseHourTotal, hourlyRate, taskMinutes, exceedsBaseHour, warningMessage } = calculateBaseHourPrice(selectedServices);
  
  // For booking purposes, always charge base hour minimum
  const totalMinutes = Math.max(taskMinutes, pricing.minimumHours * 60);
  const totalHours = pricing.minimumHours; // Base hour
  
  const subtotal = baseHourTotal;
  const effectiveMultiplier = isAsap ? Math.max(pricing.surgeMultiplier, 1.25) : pricing.surgeMultiplier;
  const surgeAmount = subtotal * (effectiveMultiplier - 1);
  const total = subtotal + surgeAmount;
  
  return { 
    subtotal, 
    surgeAmount, 
    total, 
    totalMinutes, 
    totalHours,
    exceedsBaseHour,
    warningMessage
  };
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

// Check if address is in a surge zone
export const getApplicableSurgeZone = (
  city?: string,
  postalCode?: string
): SurgeZone | null => {
  const pricing = getPricing();
  
  if (!pricing.regionalSurgeEnabled) return null;
  
  for (const zone of pricing.surgeZones) {
    if (!zone.enabled) continue;
    
    // Check by city name
    if (city && zone.cities.some(c => c.toLowerCase() === city.toLowerCase())) {
      return zone;
    }
    
    // Check by postal code prefix
    if (postalCode) {
      const prefix = postalCode.toUpperCase().replace(/\s/g, "").substring(0, 2);
      if (zone.postalCodePrefixes.includes(prefix)) {
        return zone;
      }
    }
  }
  
  return null;
};

// Calculate price with regional surge applied
export const calculatePriceWithRegionalSurge = (
  basePrice: number,
  city?: string,
  postalCode?: string
): { 
  clientTotal: number; 
  pswPay: number; 
  surgeZone: SurgeZone | null;
  clientSurcharge: number;
  pswBonus: number;
} => {
  const surgeZone = getApplicableSurgeZone(city, postalCode);
  
  if (!surgeZone) {
    return {
      clientTotal: basePrice,
      pswPay: basePrice * 0.7, // Default PSW gets 70%
      surgeZone: null,
      clientSurcharge: 0,
      pswBonus: 0,
    };
  }
  
  const clientSurcharge = surgeZone.clientSurcharge;
  const pswBonus = surgeZone.pswBonus;
  
  return {
    clientTotal: basePrice + clientSurcharge,
    pswPay: (basePrice * 0.7) + pswBonus,
    surgeZone,
    clientSurcharge,
    pswBonus,
  };
};
