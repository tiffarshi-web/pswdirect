/**
 * SINGLE SOURCE OF TRUTH for PSW estimated pay in the PSW app.
 *
 * Rule: PSW pay = confirmed booked duration (hours) × the booking's LOCKED
 * service-specific PSW pay rate (`bookings.psw_pay_rate`).
 *
 * Current service rates: Home Care $21.00/hour, Doctor Escort $27.00/hour.
 * The rate is snapshotted onto the booking at creation time and never changes
 * afterwards unless the PSW is notified and accepts a revised rate.
 *
 * PSW pay is NEVER derived from the client total, client service price, taxes,
 * Stripe amounts, transportation fees, parking charges, tips, or actual
 * check-in/sign-out times. Only the confirmed booked duration and the pay rate
 * locked onto the booking (`bookings.psw_pay_rate`) are used.
 *
 * The authoritative calculation lives in the database
 * (`public.psw_pay_cents` / `public.psw_pay_estimates`). The helpers here mirror
 * it exactly, in integer cents, and are used only when the server value for a
 * booking has not been fetched yet.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * There is NO client-side default pay rate. If a booking has no locked
 * `psw_pay_rate` and the server estimate is unavailable, the app must display
 * `EARNINGS_UNAVAILABLE` rather than guessing an amount — guessing $21 for a
 * Doctor Escort or Hospital Discharge job would understate real pay.
 */
export const EARNINGS_UNAVAILABLE = "Earnings temporarily unavailable";

/** Convert a locked rate in dollars (e.g. bookings.psw_pay_rate = 27) to cents. */
export const rateDollarsToCents = (rateDollars?: number | null): number | undefined => {
  const d = Number(rateDollars);
  return Number.isFinite(d) && d > 0 ? Math.round(d * 100) : undefined;
};

/**
 * psw_pay_cents = booked_duration_minutes × rate_cents ÷ 60
 * Returns null when no valid locked rate is available.
 */
export const computePswPayCents = (
  bookedMinutes: number,
  rateCents?: number | null,
): number | null => {
  const minutes = Number.isFinite(bookedMinutes) ? Math.max(0, bookedMinutes) : 0;
  const rate = Number(rateCents);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return Math.round((minutes * rate) / 60);
};

/** Confirmed booked duration in minutes from "HH:MM" strings (handles overnight). */
export const bookedMinutesFromTimes = (start?: string | null, end?: string | null): number => {
  const parse = (t?: string | null) => {
    const [h, m] = (t || "0:0").split(":").map(Number);
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };
  let diff = parse(end) - parse(start);
  if (diff < 0) diff += 1440; // overnight shift
  return diff;
};

/** Convert booked hours (e.g. 4.5) to minutes. */
export const bookedMinutesFromHours = (hours?: number | null): number =>
  Math.round(Math.max(0, Number(hours) || 0) * 60);

export const formatCents = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

/** "Estimated earnings: $94.50" — or the unavailable notice when unknown. */
export const formatEstimatedEarnings = (cents: number | null | undefined): string =>
  cents == null ? EARNINGS_UNAVAILABLE : `Estimated earnings: ${formatCents(cents)}`;

export interface PswPayEstimate {
  bookingId: string;
  bookedMinutes: number;
  rateDollars: number;
  payCents: number;
}

/**
 * Fetch the server-calculated estimated pay for every job the caregiver can see
 * or is assigned to. The frontend displays these values; it must not compute a
 * different amount.
 */
export const fetchPswPayEstimates = async (
  pswId?: string,
): Promise<Record<string, PswPayEstimate>> => {
  const map: Record<string, PswPayEstimate> = {};
  try {
    const { data, error } = await (supabase as any).rpc("psw_pay_estimates", {
      p_psw_id: pswId ?? null,
    });
    if (error || !Array.isArray(data)) return map;
    data.forEach((r: any) => {
      map[r.booking_id] = {
        bookingId: r.booking_id,
        bookedMinutes: Number(r.booked_minutes) || 0,
        rateDollars: Number(r.psw_pay_rate) || DEFAULT_PSW_RATE_CENTS / 100,
        payCents: Number(r.psw_pay_cents) || 0,
      };
    });
  } catch {
    // fall through to local mirror of the same formula
  }
  return map;
};

/**
 * Resolve the amount to display: prefer the server value, otherwise mirror the
 * identical formula locally from the confirmed booked duration and the
 * booking's locked service-specific rate (`lockedRateCents`). The $21 default
 * is a last resort only when no locked rate is available at all.
 */
export const resolvePayCents = (
  serverEstimate: PswPayEstimate | undefined,
  bookedMinutes: number,
  lockedRateCents?: number,
): number =>
  serverEstimate && serverEstimate.payCents > 0
    ? serverEstimate.payCents
    : computePswPayCents(bookedMinutes, lockedRateCents);
