// Surge Schedule Utilities
// Calculates active surge multipliers from surge scheduling rules

export interface SurgeScheduleRule {
  id: string;
  name: string;
  enabled: boolean;
  multiplier: number;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  stackable: boolean;
}

// Get stored surge schedule rules
export const getSurgeScheduleRules = (): SurgeScheduleRule[] => {
  const stored = localStorage.getItem("surge_schedule_rules");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

// Check if a rule is currently active
export const isRuleActive = (rule: SurgeScheduleRule, checkDate?: Date): boolean => {
  if (!rule.enabled) return false;
  
  const now = checkDate || new Date();
  const currentDateStr = now.toISOString().split('T')[0];
  const currentTimeStr = now.toTimeString().slice(0, 5);
  const currentDay = now.getDay();
  
  // Check date range
  if (rule.startDate && currentDateStr < rule.startDate) return false;
  if (rule.endDate && currentDateStr > rule.endDate) return false;
  
  // Check time range
  if (rule.startTime && rule.endTime) {
    if (currentTimeStr < rule.startTime || currentTimeStr > rule.endTime) {
      return false;
    }
  }
  
  // Check days of week
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    if (!rule.daysOfWeek.includes(currentDay)) {
      return false;
    }
  }
  
  return true;
};

// Check if a rule will be active for a specific booking date/time
export const isRuleActiveForBooking = (
  rule: SurgeScheduleRule, 
  bookingDate: string, 
  bookingTime: string
): boolean => {
  if (!rule.enabled) return false;
  
  const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
  const bookingDay = bookingDateTime.getDay();
  
  // Check date range
  if (rule.startDate && bookingDate < rule.startDate) return false;
  if (rule.endDate && bookingDate > rule.endDate) return false;
  
  // Check time range
  if (rule.startTime && rule.endTime) {
    if (bookingTime < rule.startTime || bookingTime > rule.endTime) {
      return false;
    }
  }
  
  // Check days of week
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    if (!rule.daysOfWeek.includes(bookingDay)) {
      return false;
    }
  }
  
  return true;
};

// Calculate the combined surge multiplier from all active rules
export const calculateActiveSurgeMultiplier = (
  bookingDate?: string,
  bookingTime?: string
): {
  multiplier: number;
  activeRules: SurgeScheduleRule[];
  surgeAmount: number; // As percentage e.g., 25 for 25%
} => {
  const rules = getSurgeScheduleRules();
  let activeRules: SurgeScheduleRule[] = [];
  
  if (bookingDate && bookingTime) {
    // Check rules for specific booking date/time
    activeRules = rules.filter(rule => isRuleActiveForBooking(rule, bookingDate, bookingTime));
  } else {
    // Check rules for current time
    activeRules = rules.filter(rule => isRuleActive(rule));
  }
  
  if (activeRules.length === 0) {
    return { multiplier: 1, activeRules: [], surgeAmount: 0 };
  }
  
  // Calculate stacked multiplier for stackable rules
  const stackableRules = activeRules.filter(r => r.stackable);
  const nonStackableRules = activeRules.filter(r => !r.stackable);
  
  let finalMultiplier = 1;
  
  // Apply stackable rules multiplicatively
  stackableRules.forEach(rule => {
    finalMultiplier *= rule.multiplier;
  });
  
  // Apply highest non-stackable rule (if higher than stacked total)
  if (nonStackableRules.length > 0) {
    const highestNonStackable = Math.max(...nonStackableRules.map(r => r.multiplier));
    finalMultiplier = Math.max(finalMultiplier, highestNonStackable);
  }
  
  const surgeAmount = (finalMultiplier - 1) * 100;
  
  return {
    multiplier: finalMultiplier,
    activeRules,
    surgeAmount,
  };
};

// Get surge amount for display in checkout
export const getSurgeInfoForCheckout = (
  bookingDate: string,
  bookingTime: string,
  subtotal: number
): {
  hasSurge: boolean;
  surgePercentage: number;
  surgeAmount: number;
  adjustedTotal: number;
  ruleNames: string[];
} => {
  const { multiplier, activeRules, surgeAmount: surgePercentage } = calculateActiveSurgeMultiplier(
    bookingDate,
    bookingTime
  );
  
  const hasSurge = multiplier > 1;
  const surgeAmount = subtotal * (multiplier - 1);
  const adjustedTotal = subtotal * multiplier;
  const ruleNames = activeRules.map(r => r.name);
  
  return {
    hasSurge,
    surgePercentage,
    surgeAmount,
    adjustedTotal,
    ruleNames,
  };
};
