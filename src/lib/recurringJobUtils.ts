// Recurring Job Utilities
// Handles generation of child booking dates from a parent schedule

export type RecurringFrequency = "daily" | "weekly" | "biweekly" | "monthly";
export type RecurringEndType = "never" | "after_occurrences" | "on_date";

export interface RecurringConfig {
  enabled: boolean;
  frequency: RecurringFrequency;
  endType: RecurringEndType;
  maxOccurrences: number; // used when endType = "after_occurrences"
  endDate: string; // ISO date, used when endType = "on_date"
  sameDayTime: boolean;
}

export const DEFAULT_RECURRING_CONFIG: RecurringConfig = {
  enabled: false,
  frequency: "weekly",
  endType: "never",
  maxOccurrences: 4,
  endDate: "",
  sameDayTime: true,
};

const MAX_GENERATED = 52; // Safety cap

/**
 * Generate occurrence dates starting from the day AFTER the parent date.
 * Returns ISO date strings (YYYY-MM-DD).
 */
export function generateOccurrenceDates(
  parentDate: string,
  config: RecurringConfig
): string[] {
  if (!config.enabled) return [];

  const dates: string[] = [];
  const start = new Date(parentDate + "T12:00:00"); // noon to avoid timezone shifts
  let current = new Date(start);

  const maxCount =
    config.endType === "after_occurrences"
      ? Math.min(config.maxOccurrences, MAX_GENERATED)
      : MAX_GENERATED;

  const endDate =
    config.endType === "on_date" && config.endDate
      ? new Date(config.endDate + "T23:59:59")
      : null;

  for (let i = 0; i < maxCount; i++) {
    // Advance to next occurrence
    switch (config.frequency) {
      case "daily":
        current.setDate(current.getDate() + 1);
        break;
      case "weekly":
        current.setDate(current.getDate() + 7);
        break;
      case "biweekly":
        current.setDate(current.getDate() + 14);
        break;
      case "monthly":
        current.setMonth(current.getMonth() + 1);
        break;
    }

    // Check end date
    if (endDate && current > endDate) break;
    // "never" with no end: cap at MAX_GENERATED but default 12 for safety
    if (config.endType === "never" && i >= 11) break;

    dates.push(current.toISOString().split("T")[0]);
  }

  return dates;
}

export function getFrequencyLabel(freq: RecurringFrequency): string {
  switch (freq) {
    case "daily": return "Daily";
    case "weekly": return "Weekly";
    case "biweekly": return "Every 2 weeks";
    case "monthly": return "Monthly";
  }
}
