// Business Configuration & Pricing Engine
// Uses Task Management (taskConfig.ts) as single source of truth for pricing

import { getTasks, type TaskConfig } from './taskConfig';
import { calculateActiveSurgeMultiplier } from './surgeScheduleUtils';

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

// Task duration configuration (in minutes) - now derived from Task Management
export interface TaskDurations {
  [key: string]: number;
}

// Surge Zone Configuration
export interface SurgeZone {
  id: string;
  name: string;
  enabled: boolean;
  clientSurcharge: number; // Extra $ added to client price per hour
  pswBonus: number; // Extra $ added to PSW pay per hour (hourly bonus)
  pswFlatBonus: number; // Flat travel/parking bonus per shift
  postalCodePrefixes: string[]; // e.g., ["M4", "M5", "M6"] for Toronto core
  cities: string[]; // e.g., ["Toronto", "North York", "Scarborough"]
}

// Default pricing configuration
export interface PricingConfig {
  baseHourlyRates: {
    [key: string]: number;
  };
  hospitalRate: number; // Special rate for hospital/doctor visits
  hospitalDischargeRate: number; // Premium rate for hospital discharge (higher than doctor visit)
  doctorAppointmentRate: number; // Standard rate for routine doctor visits
  minimumBookingFee: number; // Minimum fee regardless of duration (e.g., $25)
  taskDurations: TaskDurations;
  surgeMultiplier: number;
  minimumHours: number;
  doctorEscortMinimumHours: number;
  overtimeRatePercentage: number; // Percentage of hourly rate (e.g., 50 = half rate)
  overtimeGraceMinutes: number; // Grace period before overtime kicks in (default 14)
  overtimeBlockMinutes: number; // Overtime billed in blocks of this size (default 15)
  regionalSurgeEnabled: boolean; // Master toggle for regional surge
  surgeZones: SurgeZone[]; // List of surge zones
}

// Get task durations from Task Management
const getTaskDurations = (): TaskDurations => {
  const tasks = getTasks();
  const durations: TaskDurations = {};
  tasks.forEach(task => {
    durations[task.id] = task.includedMinutes;
  });
  return durations;
};

// Get base hourly rates from Task Management
const getBaseHourlyRates = (): { [key: string]: number } => {
  const tasks = getTasks();
  const rates: { [key: string]: number } = {};
  tasks.forEach(task => {
    rates[task.id] = task.baseCost;
  });
  return rates;
};

// Default Toronto/GTA Surge Zone
export const DEFAULT_SURGE_ZONES: SurgeZone[] = [
  {
    id: "toronto-gta",
    name: "Toronto / GTA",
    enabled: false,
    clientSurcharge: 10, // +$10/hr for clients in Toronto (makes it $45/hr)
    pswBonus: 5, // +$5/hr for PSWs working in Toronto
    pswFlatBonus: 15, // $15 Urban Travel/Parking Bonus per shift
    postalCodePrefixes: ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"],
    cities: ["Toronto", "North York", "Scarborough", "Etobicoke", "East York", "York"],
  },
];

// Build DEFAULT_PRICING dynamically from Task Management
const buildDefaultPricing = (): PricingConfig => {
  const tasks = getTasks();
  // Find hospital discharge and doctor appointment tasks for their rates
  const hospitalTask = tasks.find(t => t.serviceCategory === "hospital-discharge");
  const doctorTask = tasks.find(t => t.serviceCategory === "doctor-appointment");
  
  return {
    baseHourlyRates: getBaseHourlyRates(),
    hospitalRate: hospitalTask?.baseCost || 45,
    hospitalDischargeRate: hospitalTask?.baseCost || 55,
    doctorAppointmentRate: doctorTask?.baseCost || 40,
    minimumBookingFee: 25,
    taskDurations: getTaskDurations(),
    surgeMultiplier: 1.0,
    minimumHours: 1,
    doctorEscortMinimumHours: 1,
    overtimeRatePercentage: 50,
    overtimeGraceMinutes: 14,
    overtimeBlockMinutes: 15,
    regionalSurgeEnabled: false,
    surgeZones: DEFAULT_SURGE_ZONES,
  };
};

export const DEFAULT_PRICING: PricingConfig = buildDefaultPricing();

// Base hour capacity in minutes (tasks that fit in 1 hour)
export const BASE_HOUR_CAPACITY_MINUTES = 60;

// Get pricing - now reads from Task Management as single source of truth
// Also merges any admin overrides from localStorage for non-task-based settings
export const getPricing = (): PricingConfig => {
  // Always get fresh task-based pricing
  const taskBasedPricing = buildDefaultPricing();
  
  // Check for any admin overrides (surge zones, overtime settings, etc.)
  const stored = localStorage.getItem("adminPricing");
  if (stored) {
    try {
      const overrides = JSON.parse(stored);
      // Merge: task-based rates take priority, but keep admin surge/overtime settings
      return {
        ...taskBasedPricing,
        surgeMultiplier: overrides.surgeMultiplier ?? taskBasedPricing.surgeMultiplier,
        overtimeRatePercentage: overrides.overtimeRatePercentage ?? taskBasedPricing.overtimeRatePercentage,
        overtimeGraceMinutes: overrides.overtimeGraceMinutes ?? taskBasedPricing.overtimeGraceMinutes,
        overtimeBlockMinutes: overrides.overtimeBlockMinutes ?? taskBasedPricing.overtimeBlockMinutes,
        regionalSurgeEnabled: overrides.regionalSurgeEnabled ?? taskBasedPricing.regionalSurgeEnabled,
        surgeZones: overrides.surgeZones ?? taskBasedPricing.surgeZones,
        minimumBookingFee: overrides.minimumBookingFee ?? taskBasedPricing.minimumBookingFee,
      };
    } catch {
      return taskBasedPricing;
    }
  }
  return taskBasedPricing;
};

// Save pricing to localStorage (only non-task-based settings)
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

// Default hourly rate when no task-specific rate found
const DEFAULT_HOURLY_RATE = 30;

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
  const tasks = getTasks();
  
  // Calculate total task minutes - look up by task ID (UUID or legacy ID)
  const taskMinutes = selectedServices.reduce((acc, serviceId) => {
    // First try direct lookup in pricing config (legacy IDs)
    if (pricing.taskDurations[serviceId]) {
      return acc + pricing.taskDurations[serviceId];
    }
    // Then try to find task by ID in tasks array (for UUID-based IDs)
    const task = tasks.find(t => t.id === serviceId);
    if (task) {
      return acc + task.includedMinutes;
    }
    return acc + 30; // Default 30 minutes if not found
  }, 0);
  
  // Calculate weighted average hourly rate
  let totalRate = 0;
  selectedServices.forEach(serviceId => {
    // First try direct lookup (legacy IDs)
    if (pricing.baseHourlyRates[serviceId]) {
      totalRate += pricing.baseHourlyRates[serviceId];
      return;
    }
    // Then try to find task by ID (for UUID-based IDs)
    const task = tasks.find(t => t.id === serviceId);
    if (task) {
      totalRate += task.baseCost;
      return;
    }
    // Default to $30/hr if not found
    totalRate += DEFAULT_HOURLY_RATE;
  });
  const hourlyRate = selectedServices.length > 0 ? totalRate / selectedServices.length : DEFAULT_HOURLY_RATE;
  
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

// Enhanced pricing calculation with differentiated rates, minimum booking fee, and surge scheduling
export const calculateMultiServicePrice = (
  selectedServices: string[],
  isAsap: boolean = false,
  city?: string,
  postalCode?: string,
  bookingDate?: string,
  bookingTime?: string
): { 
  subtotal: number; 
  surgeAmount: number; 
  total: number; 
  totalMinutes: number;
  totalHours: number;
  exceedsBaseHour: boolean;
  warningMessage: string | null;
  minimumFeeApplied: boolean;
  regionalSurcharge: number;
  pswBonus: number;
  pswFlatBonus: number;
  scheduledSurgePercentage: number;
  scheduledSurgeRules: string[];
} => {
  const pricing = getPricing();
  const { baseHourTotal, hourlyRate, taskMinutes, exceedsBaseHour, warningMessage } = calculateBaseHourPrice(selectedServices);
  
  // For booking purposes, always charge base hour minimum
  const totalMinutes = Math.max(taskMinutes, pricing.minimumHours * 60);
  const totalHours = pricing.minimumHours; // Base hour
  
  let subtotal = baseHourTotal;
  
  // Apply differentiated rates for hospital/doctor services
  // Check both legacy IDs and database task properties
  const tasks = getTasks();
  const hasDoctorAppointment = selectedServices.some(serviceId => {
    if (serviceId === "doctor-escort") return true;
    const task = tasks.find(t => t.id === serviceId);
    return task?.serviceCategory === "doctor-appointment" || 
           task?.name.toLowerCase().includes("doctor");
  });
  const hasHospitalDischarge = selectedServices.some(serviceId => {
    if (serviceId === "hospital-visit") return true;
    const task = tasks.find(t => t.id === serviceId);
    return task?.serviceCategory === "hospital-discharge" || 
           task?.name.toLowerCase().includes("hospital");
  });
  
  if (hasHospitalDischarge) {
    subtotal = Math.max(subtotal, pricing.hospitalDischargeRate || 55);
  } else if (hasDoctorAppointment) {
    subtotal = Math.max(subtotal, pricing.doctorAppointmentRate || 40);
  }
  
  // Calculate surge from scheduling rules
  let scheduledSurgeMultiplier = 1;
  let scheduledSurgePercentage = 0;
  let scheduledSurgeRules: string[] = [];
  
  if (bookingDate && bookingTime) {
    const surgeInfo = calculateActiveSurgeMultiplier(bookingDate, bookingTime);
    scheduledSurgeMultiplier = surgeInfo.multiplier;
    scheduledSurgePercentage = surgeInfo.surgeAmount;
    scheduledSurgeRules = surgeInfo.activeRules.map((r: { name: string }) => r.name);
  }
  
  // Apply ASAP surge OR scheduled surge (whichever is higher)
  const asapMultiplier = isAsap ? 1.25 : 1;
  const effectiveMultiplier = Math.max(asapMultiplier, scheduledSurgeMultiplier);
  const surgeAmount = subtotal * (effectiveMultiplier - 1);
  
  // Apply regional surge if applicable
  const surgeZone = getApplicableSurgeZone(city, postalCode);
  const regionalSurcharge = surgeZone ? surgeZone.clientSurcharge : 0;
  const pswBonus = surgeZone ? surgeZone.pswBonus : 0;
  const pswFlatBonus = surgeZone ? (surgeZone.pswFlatBonus || 0) : 0;
  
  let total = subtotal + surgeAmount + regionalSurcharge;
  
  // Apply minimum booking fee if total is lower
  const minimumFeeApplied = total < (pricing.minimumBookingFee || 25);
  if (minimumFeeApplied) {
    total = pricing.minimumBookingFee || 25;
  }
  
  return { 
    subtotal, 
    surgeAmount, 
    total, 
    totalMinutes, 
    totalHours,
    exceedsBaseHour,
    warningMessage,
    minimumFeeApplied,
    regionalSurcharge,
    pswBonus,
    pswFlatBonus,
    scheduledSurgePercentage,
    scheduledSurgeRules,
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
