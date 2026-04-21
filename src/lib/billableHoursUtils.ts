/**
 * System-wide billable-hours rule.
 *
 * - Minimum charge: 1 hour
 * - After the first hour: bill in 30-minute increments
 * - Grace: up to 14 minutes over a block = no extra charge
 * - 15 minutes or more = round up to next 30-minute block
 *
 * Examples:
 *   1h 10m  → 1.0h
 *   1h 15m  → 1.5h
 *   1h 40m  → 1.5h   (40m past 1h = 10m past 30m block, within grace)
 *   1h 45m  → 2.0h   (45m past 1h = 15m past 30m block, rounds up)
 *
 * This function MUST be the single source of truth for billable hours
 * across booking creation, time-adjustment recalculation, invoice
 * recalculation, Stripe rebilling, and payroll computation.
 */
export function calculateBillableHours(workedMinutes: number): number {
  if (!isFinite(workedMinutes) || workedMinutes <= 0) return 1;

  // Minimum 1 hour
  if (workedMinutes <= 60) return 1;

  // Past the first hour, work in 30-min blocks with a 14-min grace per block
  const minutesPastFirstHour = workedMinutes - 60;
  const completedHalfBlocks = Math.floor(minutesPastFirstHour / 30);
  const remainder = minutesPastFirstHour - completedHalfBlocks * 30;

  // remainder ∈ [0, 29]. Grace = 0–14m → no extra; ≥15 → next 30-min block.
  const extraBlocks = remainder >= 15 ? completedHalfBlocks + 1 : completedHalfBlocks;

  // Convert: 1 hour + extraBlocks × 0.5h
  return 1 + extraBlocks * 0.5;
}

/**
 * Convenience wrapper that takes hours and returns billable hours,
 * preserving the same rule. Accepts fractional hours.
 */
export function billableHoursFromHours(workedHours: number): number {
  return calculateBillableHours(workedHours * 60);
}

/** Format helper used in UI: "1h 30m" */
export function formatHoursMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}h ${m}m`;
}
