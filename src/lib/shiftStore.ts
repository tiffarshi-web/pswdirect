// Shift Store - Centralized shift management backed by Supabase bookings table
// All shift data now lives in the database - no more localStorage

import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_OFFICE_NUMBER } from "./messageTemplates";

export interface CareSheetData {
  moodOnArrival: string;
  moodOnDeparture: string;
  tasksCompleted: string[];
  observations: string;
  pswFirstName: string;
  officeNumber: string;
  // Hospital Discharge Protocol
  isHospitalDischarge?: boolean;
  dischargeDocuments?: string;
  dischargeNotes?: string;
  // Transport details
  pickupAddress?: string;
  pickupPostalCode?: string;
  dropoffAddress?: string;
  dropoffPostalCode?: string;
}

export type GenderPreference = "female" | "male" | "no-preference";

export interface ShiftRecord {
  id: string;
  bookingId: string;
  pswId: string;
  pswName: string;
  pswLanguages?: string[];
  clientName: string;
  clientFirstName: string;
  clientPhone?: string;
  clientEmail?: string;
  patientAddress: string;
  postalCode: string;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledDate: string;
  services: string[];
  preferredLanguages?: string[];
  preferredGender?: GenderPreference;
  specialNotes?: string;
  careConditions?: string[];
  careConditionsOther?: string;
  
  // Transport fields
  pickupAddress?: string;
  pickupPostalCode?: string;
  dropoffAddress?: string;
  dropoffPostalCode?: string;
  isTransportShift?: boolean;
  isAsap?: boolean;
  serviceLat?: number;
  serviceLng?: number;
  pswLicensePlate?: string;
  pswPhotoUrl?: string;
  pswVehiclePhotoUrl?: string;
  
  // Claim data
  claimedAt?: string;
  agreementAccepted: boolean;
  
  // Check-in data
  checkedInAt?: string;
  checkInLocation?: { lat: number; lng: number };
  
  // Sign-out data
  signedOutAt?: string;
  overtimeMinutes: number;
  flaggedForOvertime: boolean;
  
  // Care sheet
  careSheet?: CareSheetData;
  careSheetSentAt?: string;
  careSheetEmailTo?: string;
  
  // Language matching
  languageMatchPriority?: boolean;
  postedAt?: string;
  isRecurring?: boolean;
  
  // PSW cancellation tracking
  pswCancelReason?: string;
  pswCancelledAt?: string;

  status: "available" | "claimed" | "checked-in" | "completed";

  // Payment gating fields (admin pipeline)
  paymentStatus?: string;
  stripePaymentIntentId?: string;
  recoveredFromPaymentIntent?: boolean;
  isPaymentBlocked?: boolean;

  // Admin debug telemetry (optional, may be undefined for older rows / PSW-safe view)
  verificationStatus?: string | null;
  gpsCheckInFailed?: boolean | null;
  checkInOutsideRadius?: boolean | null;
  checkInDistanceM?: number | null;
  manualCheckIn?: boolean | null;
  manualCheckOut?: boolean | null;
  originalCheckedInAt?: string | null;
  originalSignedOutAt?: string | null;
  manualOverrideAt?: string | null;
}

// ==================== MAPPING FUNCTIONS ====================

const deriveShiftStatus = (row: any): ShiftRecord['status'] => {
  if (row.signed_out_at || row.status === 'completed') return 'completed';
  if (row.checked_in_at || row.status === 'in-progress') return 'checked-in';
  if (row.psw_assigned && row.psw_assigned !== '') return 'claimed';
  return 'available';
};

const mapBookingToShift = (row: any): ShiftRecord => ({
  id: row.id,
  bookingId: row.booking_code,
  pswId: row.psw_assigned || "",
  pswName: row.psw_first_name || "",
  clientName: row.client_name,
  clientFirstName: row.client_name?.split(" ")[0] || "",
  clientPhone: row.client_phone,
  clientEmail: row.client_email,
  patientAddress: row.patient_address,
  postalCode: row.patient_postal_code || "",
  scheduledStart: row.start_time,
  scheduledEnd: row.end_time,
  scheduledDate: row.scheduled_date,
  services: row.service_type || [],
  preferredLanguages: row.preferred_languages,
  preferredGender: row.preferred_gender as GenderPreference | undefined,
  specialNotes: row.special_notes,
  careConditions: row.care_conditions || [],
  careConditionsOther: row.care_conditions_other,
  pickupAddress: row.pickup_address,
  pickupPostalCode: row.pickup_postal_code,
  dropoffAddress: row.dropoff_address,
  isTransportShift: row.is_transport_booking,
  isAsap: row.is_asap || false,
  serviceLat: row.service_latitude != null ? Number(row.service_latitude) : undefined,
  serviceLng: row.service_longitude != null ? Number(row.service_longitude) : undefined,
  pswLicensePlate: row.psw_license_plate,
  pswPhotoUrl: row.psw_photo_url,
  pswVehiclePhotoUrl: row.psw_vehicle_photo_url,
  claimedAt: row.claimed_at,
  agreementAccepted: !!row.claimed_at,
  checkedInAt: row.checked_in_at,
  checkInLocation: row.check_in_lat != null && row.check_in_lng != null 
    ? { lat: Number(row.check_in_lat), lng: Number(row.check_in_lng) } 
    : undefined,
  signedOutAt: row.signed_out_at,
  overtimeMinutes: row.overtime_minutes || 0,
  flaggedForOvertime: row.flagged_for_overtime || false,
  careSheet: row.care_sheet as CareSheetData | undefined,
  careSheetSentAt: row.care_sheet_submitted_at,
  postedAt: row.created_at,
  isRecurring: row.is_recurring || false,
  pswCancelReason: row.psw_cancel_reason || undefined,
  pswCancelledAt: row.psw_cancelled_at || undefined,
  status: deriveShiftStatus(row),
  paymentStatus: row.payment_status,
  stripePaymentIntentId: row.stripe_payment_intent_id,
  recoveredFromPaymentIntent: row.recovered_from_payment_intent || false,
  isPaymentBlocked: isBookingPaymentBlocked(row),
  verificationStatus: row.verification_status ?? null,
  gpsCheckInFailed: row.gps_check_in_failed ?? null,
  checkInOutsideRadius: row.check_in_outside_radius ?? null,
  checkInDistanceM: row.check_in_distance_m ?? null,
  manualCheckIn: row.manual_check_in ?? null,
  manualCheckOut: row.manual_check_out ?? null,
  originalCheckedInAt: row.original_checked_in_at ?? null,
  originalSignedOutAt: row.original_signed_out_at ?? null,
  manualOverrideAt: row.manual_override_at ?? null,
});

// Statuses that indicate the client has NOT paid and the order must NOT be dispatched.
export const UNPAID_BLOCKING_STATUSES = new Set([
  "awaiting_payment",
  "incomplete",
  "payment_failed",
  "payment_expired",
  "recovered_from_payment_intent",
]);

// Returns true if a booking row is in an unpaid state and must be hidden from the
// dispatch pipeline / blocked from PSW assignment.
export const isBookingPaymentBlocked = (row: any): boolean => {
  if (!row) return false;
  if (row.recovered_from_payment_intent === true) return true;
  const ps = (row.payment_status || "").toLowerCase();
  const st = (row.status || "").toLowerCase();
  if (UNPAID_BLOCKING_STATUSES.has(ps)) return true;
  if (UNPAID_BLOCKING_STATUSES.has(st)) return true;
  return false;
};

// Full select for ADMIN-only paths (admins keep RLS access to all bookings columns).
const BOOKING_SELECT = `id, booking_code, client_name, client_email, client_phone, 
  patient_address, patient_postal_code, scheduled_date, start_time, end_time, 
  service_type, status, psw_assigned, psw_first_name, psw_photo_url, 
  psw_vehicle_photo_url, psw_license_plate, preferred_languages, preferred_gender,
  pickup_address, pickup_postal_code, dropoff_address, is_transport_booking, is_asap,
  claimed_at, checked_in_at, check_in_lat, check_in_lng, signed_out_at,
  overtime_minutes, flagged_for_overtime, care_sheet, care_sheet_submitted_at,
  care_sheet_psw_name, created_at, user_id, special_notes,
  care_conditions, care_conditions_other, is_recurring,
  service_latitude, service_longitude, is_asap,
  psw_cancel_reason, psw_cancelled_at,
  payment_status, stripe_payment_intent_id, recovered_from_payment_intent,
  verification_status, gps_check_in_failed, check_in_outside_radius, check_in_distance_m,
  manual_check_in, manual_check_out, manual_override_at,
  original_checked_in_at, original_signed_out_at`;

// PSW-safe select used against the security-definer view `psw_safe_booking_view`.
// Excludes client_email and client_phone — PSWs cannot read these columns at the DB level.
const BOOKING_SELECT_PSW = `id, booking_code, client_name, 
  patient_address, patient_postal_code, scheduled_date, start_time, end_time, 
  service_type, status, psw_assigned, psw_first_name, psw_photo_url, 
  psw_vehicle_photo_url, psw_license_plate, preferred_languages, preferred_gender,
  pickup_address, pickup_postal_code, dropoff_address, is_transport_booking, is_asap,
  claimed_at, checked_in_at, check_in_lat, check_in_lng, signed_out_at,
  overtime_minutes, flagged_for_overtime, care_sheet, care_sheet_submitted_at,
  care_sheet_psw_name, created_at, special_notes,
  care_conditions, care_conditions_other, is_recurring,
  service_latitude, service_longitude,
  psw_cancel_reason, psw_cancelled_at`;

// ==================== ASYNC DATABASE-BACKED FUNCTIONS ====================

// Get all shifts from database (non-archived, non-cancelled bookings)
export const getShiftsAsync = async (): Promise<ShiftRecord[]> => {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .not("status", "in", '("archived","cancelled")')
    .order("scheduled_date", { ascending: false });

  if (error) {
    console.error("Error fetching shifts:", error);
    return [];
  }
  return (data || []).map(mapBookingToShift);
};

// Get available shifts (pending, unassigned, paid or admin-created) from database
// Excludes client bookings where Stripe payment hasn't completed yet
export const getAvailableShiftsAsync = async (): Promise<ShiftRecord[]> => {
  // PSW context — read via safe view, no client_email/phone exposure.
  const { data, error } = await (supabase as any)
    .from("psw_safe_booking_view")
    .select(BOOKING_SELECT_PSW + ", payment_status, stripe_payment_intent_id")
    .eq("status", "pending")
    .is("psw_assigned", null)
    .order("scheduled_date", { ascending: true });

  if (error) {
    console.error("Error fetching available shifts:", error);
    return [];
  }

  // Filter out client-submitted bookings that haven't been paid yet
  // (stripe_payment_intent_id is set but payment_status is not "paid")
  // Admin-created orders (no stripe PI) with "invoice-pending" are kept visible
  const filtered = (data || []).filter((row: any) => {
    if (row.payment_status === "paid") return true;
    if (!row.stripe_payment_intent_id) return true; // admin-created order
    return false; // has PI but not paid = payment in progress or failed
  });

  return filtered.map(mapBookingToShift);
};

// Get shifts assigned to a specific PSW (claimed, checked-in)
export const getPSWShiftsAsync = async (pswId: string): Promise<ShiftRecord[]> => {
  // PSW context — read via safe view.
  const { data, error } = await (supabase as any)
    .from("psw_safe_booking_view")
    .select(BOOKING_SELECT_PSW)
    .eq("psw_assigned", pswId)
    .not("status", "in", '("archived","cancelled","completed")')
    .order("scheduled_date", { ascending: true });

  if (error) {
    console.error("Error fetching PSW shifts:", error);
    return [];
  }
  return (data || []).map(mapBookingToShift);
};

// Get active (checked-in) shifts for a PSW
export const getActiveShiftsAsync = async (pswId: string): Promise<ShiftRecord[]> => {
  // PSW context — read via safe view.
  const { data, error } = await (supabase as any)
    .from("psw_safe_booking_view")
    .select(BOOKING_SELECT_PSW)
    .eq("psw_assigned", pswId)
    .not("checked_in_at", "is", null)
    .is("signed_out_at", null)
    .not("status", "in", '("completed","archived","cancelled")')
    .order("scheduled_date", { ascending: true });

  if (error) {
    console.error("Error fetching active shifts:", error);
    return [];
  }
  return (data || []).map(mapBookingToShift);
};

// Check if PSW has any active (checked-in) shifts
export const hasActiveShiftsAsync = async (pswId: string): Promise<boolean> => {
  const shifts = await getActiveShiftsAsync(pswId);
  return shifts.length > 0;
};

// Get a single shift by booking ID (UUID)
export const getShiftByIdAsync = async (id: string): Promise<ShiftRecord | null> => {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching shift:", error);
    return null;
  }
  return data ? mapBookingToShift(data) : null;
};

// Get completed shifts for a PSW
export const getCompletedShiftsAsync = async (pswId: string): Promise<ShiftRecord[]> => {
  // PSW context — read via safe view.
  const { data, error } = await (supabase as any)
    .from("psw_safe_booking_view")
    .select(BOOKING_SELECT_PSW)
    .eq("psw_assigned", pswId)
    .eq("status", "completed")
    .order("signed_out_at", { ascending: false });

  if (error) {
    console.error("Error fetching completed shifts:", error);
    return [];
  }
  return (data || []).map(mapBookingToShift);
};

// Get all active + claimed + pending shifts (admin view)
export const getAllActiveShiftsAsync = async (): Promise<{
  active: ShiftRecord[];
  claimed: ShiftRecord[];
  completed: ShiftRecord[];
  completedAllTime: number;
  pending: ShiftRecord[];
  cancelled: ShiftRecord[];
}> => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  // Fetch non-archived bookings (include cancelled for pipeline view)
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .not("status", "eq", "archived")
    .order("scheduled_date", { ascending: false });

  if (error) {
    console.error("Error fetching all shifts:", error);
    // Throw so callers can preserve previously-loaded state instead of wiping
    // the UI to empty on a transient network blip.
    throw error;
  }

  const allRows = data || [];
  // SAFETY: exclude any booking whose payment is not confirmed from the dispatch pipeline.
  // These belong in Orders → Incomplete Payments, not in Needs PSW.
  const dispatchableRows = allRows.filter((r: any) => !isBookingPaymentBlocked(r));
  const shifts = dispatchableRows.filter((r: any) => r.status !== "cancelled").map(mapBookingToShift);
  const cancelledShifts = allRows.filter((r: any) => r.status === "cancelled").map(mapBookingToShift);
  const allCompleted = shifts
    .filter(s => s.status === "completed")
    .sort((a, b) => (b.signedOutAt || "").localeCompare(a.signedOutAt || ""));

  return {
    active: shifts.filter(s => s.status === "checked-in"),
    claimed: shifts.filter(s => s.status === "claimed"),
    completed: allCompleted, // return ALL completed (sorted newest first)
    completedAllTime: allCompleted.length,
    pending: shifts.filter(s => s.status === "available"),
    cancelled: cancelledShifts.slice(0, 20), // Last 20 cancelled
  };
};


// ==================== MUTATION FUNCTIONS ====================

// Claim a shift via atomic DB function (prevents double-claim race).
// Throws or returns null if the job was already claimed / PSW ineligible.
export const claimShift = async (
  shiftId: string,
  pswId: string,
  pswName: string,
  pswPhotoUrl?: string,
  pswVehiclePhotoUrl?: string,
  pswLicensePlate?: string
): Promise<ShiftRecord | null> => {
  const { data, error } = await (supabase as any).rpc("claim_booking", {
    p_booking_id: shiftId,
    p_psw_id: pswId,
    p_psw_name: pswName,
    p_psw_photo_url: pswPhotoUrl || null,
    p_psw_vehicle_photo_url: pswVehiclePhotoUrl || null,
    p_psw_license_plate: pswLicensePlate || null,
  });

  if (error) {
    console.error("Error claiming shift (rpc):", error);
    return null;
  }
  if (!data || data.ok !== true) {
    console.warn("Claim rejected:", data);
    return null;
  }


  const { data: updatedRow, error: refetchError } = await (supabase as any)
    .from("psw_safe_booking_view")
    .select(BOOKING_SELECT_PSW)
    .eq("id", shiftId)
    .maybeSingle();

  if (refetchError || !updatedRow) {
    console.error("Error fetching claimed shift:", refetchError);
    return null;
  }

  const result = mapBookingToShift(updatedRow);

  // NOTE: Client "PSW Assigned" email is now sent by the database trigger
  // `trg_notify_client_on_psw_assignment` -> `send-psw-assignment-email` edge fn.
  // Do NOT send it from the frontend — that caused duplicate emails.

  // Send shift confirmation email + push notification to PSW
  if (result) {
    try {
      const { data: pswProfile } = await supabase
        .from("psw_profiles")
        .select("email, first_name")
        .eq("id", pswId)
        .single();

      if (pswProfile?.email) {
        // Email confirmation
        import("@/lib/notificationService").then(({ sendShiftConfirmationToPSW }) => {
          sendShiftConfirmationToPSW(
            pswProfile.email,
            pswProfile.first_name,
            result.bookingId,
            result.clientName,
            result.clientName,
            result.patientAddress || "See booking details",
            result.scheduledDate,
            result.scheduledStart,
            result.scheduledEnd,
            result.services || []
          );
        });
        console.log("📧 PSW SHIFT CONFIRMATION EMAIL TRIGGERED:", { to: pswProfile.email, bookingId: result.bookingId });

        // Push notification via Progressier (targeted to claimed PSW only)
        try {
          await supabase.functions.invoke("notify-psws", {
            body: {
              _push_only: true,
              _target_emails: [pswProfile.email],
              _push_title: "✅ Shift Confirmed",
              _push_body: `You have accepted a shift and are expected to attend.\n\nClient: ${result.clientName}\nDate: ${result.scheduledDate}\nTime: ${result.scheduledStart} – ${result.scheduledEnd}\nLocation: ${result.patientAddress || "See booking details"}\n\nIf you cannot attend, notify admin immediately.`,
              _push_url: "/psw",
              booking_code: result.bookingId,
            },
          });
          console.log("📱 PSW SHIFT PUSH NOTIFICATION TRIGGERED:", { to: pswProfile.email, bookingId: result.bookingId });
        } catch (pushErr) {
          console.warn("PSW shift push notification skipped:", pushErr);
        }
      }
    } catch (e) {
      console.warn("PSW shift confirmation email skipped:", e);
    }
  }

  // Send admin in-app notification that job was claimed
  if (result) {
    try {
      const { data: adminEmails } = await supabase
        .from("admin_invitations")
        .select("email")
        .eq("status", "accepted");

      const emails = adminEmails?.map((a) => a.email) || [];
      if (emails.length > 0) {
        const rows = emails.map((email) => ({
          user_email: email,
          title: `✅ Job Claimed: ${result.bookingId}`,
          body: `${pswName.split(' ')[0]} claimed booking ${result.bookingId} for ${result.scheduledDate} (${result.scheduledStart} - ${result.scheduledEnd}).`,
          type: "job_claimed",
        }));
        await supabase.from("notifications").insert(rows).throwOnError();
      }
    } catch (e) {
      console.warn("Admin claim notification skipped:", e);
    }

    // Update dispatch_logs with claim info
    try {
      await supabase
        .from("dispatch_logs")
        .update({
          claimed_by_psw_id: pswId,
          claimed_at: new Date().toISOString(),
        })
        .eq("booking_code", result.bookingId);
    } catch (e) {
      console.warn("Dispatch log claim update skipped:", e);
    }
  }

  return result;
};

// Telemetry passed by the UI when GPS verification soft-fails
// (e.g. PSW outside radius, GPS unavailable, permission denied).
// Soft-fail still allows check-in, but the shift is flagged for admin review.
export interface CheckInTelemetry {
  outsideRadius?: boolean;
  distanceM?: number;
  accuracyM?: number;
  failureReason?: string; // human-readable, e.g. "GPS denied", "Outside 1000m radius"
}

// Check in to a shift — never blocks. Telemetry is persisted so admins
// can see whether GPS verified, soft-failed, or was manually overridden.
export const checkInToShift = async (
  shiftId: string,
  location: { lat: number; lng: number },
  telemetry?: CheckInTelemetry
): Promise<ShiftRecord | null> => {
  const checkInTime = new Date();
  const softFailed = !!(telemetry?.outsideRadius || telemetry?.failureReason);

  // UPDATE allowed by RLS for assigned PSW; .select() uses PSW-safe columns only.
  const { error } = await supabase
    .from("bookings")
    .update({
      checked_in_at: checkInTime.toISOString(),
      check_in_lat: location.lat || null,
      check_in_lng: location.lng || null,
      status: "in-progress",
      gps_check_in_failed: softFailed,
      gps_check_in_failure_reason: telemetry?.failureReason ?? null,
      check_in_outside_radius: !!telemetry?.outsideRadius,
      check_in_distance_m: telemetry?.distanceM ?? null,
      check_in_accuracy_m: telemetry?.accuracyM ?? null,
      verification_status: softFailed ? 'awaiting_review' : 'active',
    } as any)
    .eq("id", shiftId);

  const { data: updatedRow, error: refetchError } = error
    ? { data: null, error: null }
    : await (supabase as any)
        .from("psw_safe_booking_view")
        .select(BOOKING_SELECT_PSW)
        .eq("id", shiftId)
        .maybeSingle();

  // Best-effort telemetry log — never blocks check-in
  try {
    await (supabase as any).from("check_in_attempts").insert({
      booking_id: shiftId,
      booking_code: updatedRow?.booking_code ?? null,
      psw_id: updatedRow?.psw_assigned ?? null,
      psw_name: updatedRow?.psw_first_name ?? null,
      success: !error && !refetchError,
      outside_radius: !!telemetry?.outsideRadius,
      failure_reason: telemetry?.failureReason ?? null,
      latitude: location.lat || null,
      longitude: location.lng || null,
      accuracy_m: telemetry?.accuracyM ?? null,
      distance_m: telemetry?.distanceM ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      network_online: typeof navigator !== "undefined" ? navigator.onLine : null,
    });
  } catch (logErr) {
    console.warn("check_in_attempts log skipped:", logErr);
  }

  if (error || refetchError || !updatedRow) {
    console.error("Error checking in:", error || refetchError);
    return null;
  }

  const result = mapBookingToShift(updatedRow);

  // Trigger "PSW Arrived" email via edge function — client_email is resolved
  // server-side using the service role, so PSWs never see client contact data.
  if (result) {
    supabase.functions.invoke("send-psw-arrived", {
      body: {
        booking_id: result.bookingId,
        check_in_time: checkInTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      },
    }).catch(e => console.warn("PSW arrived email skipped:", e));
  }

  return result;
};

// Sign-out result with explicit error reporting so the UI can show actionable
// guidance (refresh GPS, retry, contact office) instead of silently failing.
export type SignOutErrorCode =
  | "NOT_CHECKED_IN"
  | "BOOKING_NOT_FOUND"
  | "PERMISSION_DENIED"
  | "NETWORK_ERROR"
  | "DB_UPDATE_FAILED"
  | "UNKNOWN";

export interface SignOutResult {
  success: boolean;
  shift: ShiftRecord | null;
  errorCode?: SignOutErrorCode;
  errorMessage?: string;
}

export interface SignOutLocation {
  lat?: number;
  lng?: number;
  accuracy?: number;
  distance?: number;
  outsideRadius?: boolean;
}

// Fire-and-forget logger: writes to sign_out_attempts so admins can audit
// every sign-out — both successes and failures — with GPS context.
const logSignOutAttempt = async (entry: {
  bookingId?: string | null;
  bookingCode?: string | null;
  pswId?: string | null;
  pswName?: string | null;
  success: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  location?: SignOutLocation;
}) => {
  try {
    await (supabase as any).from("sign_out_attempts").insert({
      booking_id: entry.bookingId || null,
      booking_code: entry.bookingCode || null,
      psw_id: entry.pswId || null,
      psw_name: entry.pswName || null,
      success: entry.success,
      error_code: entry.errorCode || null,
      error_message: entry.errorMessage || null,
      latitude: entry.location?.lat ?? null,
      longitude: entry.location?.lng ?? null,
      accuracy_m: entry.location?.accuracy ?? null,
      distance_m: entry.location?.distance ?? null,
      outside_radius: !!entry.location?.outsideRadius,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      network_online: typeof navigator !== "undefined" ? navigator.onLine : null,
    });
  } catch (e) {
    // Logging must never break the sign-out flow
    console.warn("Failed to log sign-out attempt:", e);
  }
};

// Sign out from a shift — returns SignOutResult with error details.
// Backwards-compatible: callers expecting a ShiftRecord|null can read .shift.
export const signOutFromShift = async (
  shiftId: string,
  careSheet: CareSheetData,
  orderingClientEmail: string,
  location?: SignOutLocation
): Promise<SignOutResult> => {
  // First fetch the current booking to calculate overtime (PSW-safe view)
  const { data: current, error: fetchError } = await (supabase as any)
    .from("psw_safe_booking_view")
    .select(BOOKING_SELECT_PSW)
    .eq("id", shiftId)
    .single();

  if (fetchError || !current) {
    const code: SignOutErrorCode = fetchError?.code === "PGRST301" || fetchError?.message?.includes("permission")
      ? "PERMISSION_DENIED"
      : !navigator.onLine ? "NETWORK_ERROR" : "BOOKING_NOT_FOUND";
    const msg = code === "PERMISSION_DENIED"
      ? "Your session has expired. Please log out and back in, then retry."
      : code === "NETWORK_ERROR"
        ? "No internet connection. Reconnect and retry."
        : "Could not find this shift. Please contact the office.";
    console.error("Error fetching shift for sign-out:", fetchError);
    await logSignOutAttempt({ bookingId: shiftId, success: false, errorCode: code, errorMessage: msg, location });
    return { success: false, shift: null, errorCode: code, errorMessage: msg };
  }

  if (!current.checked_in_at) {
    const msg = "You're not checked in to this shift. Please contact the office.";
    await logSignOutAttempt({
      bookingId: shiftId,
      bookingCode: current.booking_code,
      pswId: current.psw_assigned,
      pswName: current.psw_first_name,
      success: false,
      errorCode: "NOT_CHECKED_IN",
      errorMessage: msg,
      location,
    });
    return { success: false, shift: null, errorCode: "NOT_CHECKED_IN", errorMessage: msg };
  }

  const signOutTime = new Date();
  // OT = worked duration - booked duration (NOT clock-out vs scheduled end).
  // Late-started shifts that work the full booked duration produce 0 OT.
  const checkedInAt = new Date(current.checked_in_at);
  const scheduledStart = new Date(`${current.scheduled_date} ${current.start_time}`);
  const scheduledEnd = new Date(`${current.scheduled_date} ${current.end_time}`);
  const bookedMinutes = Math.max(0, Math.floor((scheduledEnd.getTime() - scheduledStart.getTime()) / 60000));
  const workedMinutes = Math.max(0, Math.floor((signOutTime.getTime() - checkedInAt.getTime()) / 60000));
  const overtimeMinutes = Math.max(0, workedMinutes - bookedMinutes);
  const flaggedForOvertime = overtimeMinutes >= 15;

  // Server-side contact detection (non-blocking)
  const { scanCareSheet, flagCareSheet } = await import("./careSheetDetection");
  const detection = scanCareSheet(careSheet);

  const { error } = await supabase
    .from("bookings")
    .update({
      signed_out_at: signOutTime.toISOString(),
      status: "completed",
      care_sheet: JSON.parse(JSON.stringify(careSheet)),
      care_sheet_status: "submitted",
      care_sheet_submitted_at: signOutTime.toISOString(),
      care_sheet_psw_name: careSheet.pswFirstName,
      overtime_minutes: overtimeMinutes,
      flagged_for_overtime: flaggedForOvertime,
      // Persist sign-out telemetry so admins can audit GPS at sign-out
      sign_out_lat: location?.lat ?? null,
      sign_out_lng: location?.lng ?? null,
      sign_out_accuracy_m: location?.accuracy ?? null,
      sign_out_distance_m: location?.distance ?? null,
      sign_out_outside_radius: !!location?.outsideRadius,
      ...(detection.flagged ? { care_sheet_flagged: true, care_sheet_flag_reason: detection.patterns } : {}),
    } as any)
    .eq("id", shiftId);

  if (error) {
    const code: SignOutErrorCode = !navigator.onLine ? "NETWORK_ERROR" : "DB_UPDATE_FAILED";
    const msg = code === "NETWORK_ERROR"
      ? "No internet connection. Reconnect and tap Retry Sign-Out."
      : "We couldn't save your sign-out. Tap Retry — if it keeps failing, contact the office.";
    console.error("Error signing out:", error);
    await logSignOutAttempt({
      bookingId: shiftId,
      bookingCode: current.booking_code,
      pswId: current.psw_assigned,
      pswName: current.psw_first_name,
      success: false,
      errorCode: code,
      errorMessage: `${msg} (${error.message})`,
      location,
    });
    return { success: false, shift: null, errorCode: code, errorMessage: msg };
  }

  const { data: updatedRow, error: refetchError } = await (supabase as any)
    .from("psw_safe_booking_view")
    .select(BOOKING_SELECT_PSW)
    .eq("id", shiftId)
    .maybeSingle();

  const result = updatedRow ? mapBookingToShift(updatedRow) : null;
  if (refetchError || !result) {
    console.error("Error fetching signed-out shift:", refetchError);
    await logSignOutAttempt({
      bookingId: shiftId,
      success: false,
      errorCode: "UNKNOWN",
      errorMessage: "Sign-out saved but response was empty.",
      location,
    });
    return { success: false, shift: null, errorCode: "UNKNOWN", errorMessage: "Sign-out saved but response was empty. Please refresh the app." };
  }

  // Log successful sign-out (with GPS context for operational audit)
  logSignOutAttempt({
    bookingId: shiftId,
    bookingCode: current.booking_code,
    pswId: result.pswId,
    pswName: result.pswName,
    success: true,
    location,
  });

  // Log audit if flagged (non-blocking, after successful save)
  if (detection.flagged && result) {
    flagCareSheet(shiftId, result.pswId, detection);
  }

  // Send care sheet summary email to client
  if (orderingClientEmail) {
    import("@/lib/notificationService").then(({ sendCareSheetReportEmail }) => {
      sendCareSheetReportEmail(
        orderingClientEmail,
        result.clientName,
        careSheet.pswFirstName,
        result.scheduledDate,
        careSheet.tasksCompleted,
        careSheet.observations
      );
    }).catch(e => console.warn("Care sheet email skipped:", e));
  }

  // Auto-send invoice email on completion (fire-and-forget; function no-ops if no invoice or no email)
  supabase.functions.invoke("send-invoice-email", { body: { booking_id: shiftId } })
    .catch((e) => console.warn("Auto-invoice email skipped:", e));


  console.log("📧 CARE SHEET EMAIL SENT:", {
    to: orderingClientEmail,
    shiftId,
    pswFirstName: careSheet.pswFirstName,
    sentAt: signOutTime.toISOString(),
  });

  if (flaggedForOvertime) {
    console.log("⚠️ OVERTIME FLAGGED:", {
      shiftId,
      overtimeMinutes,
      scheduledEnd: current.end_time,
      actualSignOut: signOutTime.toISOString(),
    });
  }

  // Payroll is now generated server-side when a booking is marked completed.
  // That keeps the bookings → payroll pipeline consistent for PSW and admin flows
  // and avoids client-side insert failures under non-admin permissions.

  // Determine client-facing rate for pending overtime approval records
  let payCategory: "standard" | "doctor" | "hospital" = "standard";
  let clientHourlyRate = 30;
  try {
    const { fetchPricingRatesFromDB } = await import("./pricingConfigStore");
    const serviceNames = current.service_type || [];

    const { data: taskRows } = await supabase
      .from("service_tasks")
      .select("service_category")
      .in("task_name", serviceNames);

    const categories = (taskRows || []).map((t: any) => t.service_category);
    if (categories.includes("hospital-discharge")) {
      payCategory = "hospital";
    } else if (categories.includes("doctor-appointment")) {
      payCategory = "doctor";
    }

    const pricingRates = await fetchPricingRatesFromDB();
    clientHourlyRate = payCategory === "hospital"
      ? (pricingRates["hospital-discharge"]?.firstHour || 45)
      : payCategory === "doctor"
        ? (pricingRates["doctor-appointment"]?.firstHour || 40)
        : (pricingRates.standard?.firstHour || 30);
  } catch (rateErr) {
    console.warn("Failed to fetch DB pricing rates, using defaults:", rateErr);
  }

  // CREATE PENDING OVERTIME CHARGE (admin approval required, no auto-charge)
  if (flaggedForOvertime && overtimeMinutes >= 15) {
    try {
      const billableMinutes = overtimeMinutes <= 30 ? 30 : overtimeMinutes <= 60 ? 60 : Math.ceil(overtimeMinutes / 60) * 60;
      const overtimeAmount = (billableMinutes / 60) * clientHourlyRate;

      // Fetch stored payment method and customer ID from the booking
      const { data: bookingPayment } = await supabase
        .from("bookings")
        .select("stripe_customer_id, stripe_payment_method_id")
        .eq("id", shiftId)
        .single();

      const { error: otInsertError } = await supabase
        .from("overtime_charges" as any)
        .insert({
          booking_id: shiftId,
          booking_code: result.bookingId,
          client_email: orderingClientEmail,
          client_name: result.clientName,
          psw_id: result.pswId,
          psw_name: result.pswName,
          scheduled_start: current.start_time,
          scheduled_end: current.end_time,
          actual_sign_out: signOutTime.toISOString(),
          overtime_minutes: overtimeMinutes,
          billable_minutes: billableMinutes,
          hourly_rate: clientHourlyRate,
          overtime_amount: Number(overtimeAmount.toFixed(2)),
          stripe_customer_id: bookingPayment?.stripe_customer_id || null,
          stripe_payment_method_id: (bookingPayment as any)?.stripe_payment_method_id || null,
          status: "pending_admin",
        });

      if (otInsertError) {
        console.error("Failed to create overtime charge record:", otInsertError);
      } else {
        console.log("⏱️ Pending overtime charge created for admin review:", {
          bookingCode: result.bookingId,
          overtimeMinutes,
          billableMinutes,
          overtimeAmount: overtimeAmount.toFixed(2),
        });
      }
    } catch (err) {
      console.error("Failed to create overtime record:", err);
    }
  }

  return { success: true, shift: result };
};

// Admin manual check-in
export const adminManualCheckIn = async (
  shiftId: string,
  adminEmail: string,
  reason?: string
): Promise<ShiftRecord | null> => {
  const { data, error } = await supabase
    .from("bookings")
    .update({
      checked_in_at: new Date().toISOString(),
      manual_check_in: true,
      manual_override_at: new Date().toISOString(),
      manual_override_by: adminEmail,
      manual_override_reason: reason || "Admin manual check-in (geofence bypass)",
      status: "in-progress",
    })
    .eq("id", shiftId)
    .select(BOOKING_SELECT)
    .single();

  if (error) {
    console.error("Error manual check-in:", error);
    return null;
  }

  console.log("🔧 ADMIN MANUAL CHECK-IN:", { shiftId, adminEmail, reason });
  return data ? mapBookingToShift(data) : null;
};

// Admin manual sign-out
export const adminManualSignOut = async (
  shiftId: string,
  adminEmail: string,
  reason?: string
): Promise<ShiftRecord | null> => {
  const { data: current } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", shiftId)
    .single();

  if (!current || !current.checked_in_at) return null;

  const signOutTime = new Date();
  // OT = worked duration - booked duration (consistent with PSW sign-out path).
  const checkedInAt = new Date(current.checked_in_at);
  const scheduledStart = new Date(`${current.scheduled_date} ${current.start_time}`);
  const scheduledEnd = new Date(`${current.scheduled_date} ${current.end_time}`);
  const bookedMinutes = Math.max(0, Math.floor((scheduledEnd.getTime() - scheduledStart.getTime()) / 60000));
  const workedMinutes = Math.max(0, Math.floor((signOutTime.getTime() - checkedInAt.getTime()) / 60000));
  const overtimeMinutes = Math.max(0, workedMinutes - bookedMinutes);
  const flaggedForOvertime = overtimeMinutes >= 15;

  const careSheet = {
    moodOnArrival: "unknown",
    moodOnDeparture: "unknown",
    tasksCompleted: current.service_type || [],
    observations: `[Admin manual sign-out]${reason ? ` Reason: ${reason}` : ""} - Care sheet not completed by PSW.`,
    pswFirstName: (current.psw_first_name || "Unknown").split(" ")[0],
    officeNumber: DEFAULT_OFFICE_NUMBER,
  };

  const { data, error } = await supabase
    .from("bookings")
    .update({
      signed_out_at: signOutTime.toISOString(),
      status: "completed",
      care_sheet: JSON.parse(JSON.stringify(careSheet)),
      care_sheet_status: "submitted",
      care_sheet_submitted_at: signOutTime.toISOString(),
      care_sheet_psw_name: careSheet.pswFirstName,
      overtime_minutes: overtimeMinutes,
      flagged_for_overtime: flaggedForOvertime,
      manual_check_out: true,
      manual_override_at: signOutTime.toISOString(),
      manual_override_by: adminEmail,
      manual_override_reason: reason || "Admin manual sign-out (geofence bypass)",
    })
    .eq("id", shiftId)
    .select(BOOKING_SELECT)
    .single();

  if (error) {
    console.error("Error manual sign-out:", error);
    return null;
  }

  console.log("🔧 ADMIN MANUAL SIGN-OUT:", { shiftId, adminEmail, reason });

  // Auto-send invoice email on completion (fire-and-forget)
  supabase.functions.invoke("send-invoice-email", { body: { booking_id: shiftId } })
    .catch((e) => console.warn("Auto-invoice email skipped:", e));

  return data ? mapBookingToShift(data) : null;

};

// Admin stop shift — works whether or not the PSW has checked in.
// If checked in, performs manual sign-out (completes shift).
// If not checked in, marks the booking as cancelled with admin override metadata.
export const adminStopShift = async (
  shiftId: string,
  adminNotes?: string
): Promise<ShiftRecord | null> => {
  const { data: current } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", shiftId)
    .single();

  if (!current) return null;

  if (current.checked_in_at) {
    return adminManualSignOut(shiftId, "admin", adminNotes);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      manual_override_at: now,
      manual_override_by: "admin",
      manual_override_reason: adminNotes || "Admin stopped shift before check-in",
    })
    .eq("id", shiftId)
    .select(BOOKING_SELECT)
    .single();

  if (error) {
    console.error("Error stopping shift (cancel path):", error);
    return null;
  }
  console.log("🔧 ADMIN STOP (pre-check-in cancel):", { shiftId, adminNotes });
  return data ? mapBookingToShift(data) : null;
};


// Cancel a claimed shift (PSW unclaims) and re-dispatch to open pool
export const unclaimShift = async (
  shiftId: string,
  cancelReason?: string
): Promise<ShiftRecord | null> => {
  // 1. Reset booking to pending/unassigned and record cancellation metadata.
  // PSWs no longer have direct SELECT on bookings — fire UPDATE only, no .select() chain.
  const { error } = await supabase
    .from("bookings")
    .update({
      psw_assigned: null,
      psw_first_name: null,
      psw_photo_url: null,
      psw_vehicle_photo_url: null,
      psw_license_plate: null,
      claimed_at: null,
      status: "pending",
      psw_cancel_reason: cancelReason || null,
      psw_cancelled_at: new Date().toISOString(),
    })
    .eq("id", shiftId);

  if (error) {
    console.error("Error unclaiming shift:", error);
    return null;
  }

  // 2. Increment PSW cancel_count (fire-and-forget)
  const pswEmail = (await supabase.auth.getUser()).data.user?.email;
  if (pswEmail) {
    supabase
      .from("psw_profiles")
      .select("id, cancel_count")
      .eq("email", pswEmail)
      .single()
      .then(({ data: psw }) => {
        if (psw) {
          supabase
            .from("psw_profiles")
            .update({ cancel_count: (psw.cancel_count || 0) + 1 })
            .eq("id", psw.id)
            .then(() => {});
        }
      });
  }

  // 3. Re-dispatch: trigger notify-psws to broadcast job to eligible PSWs
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    await fetch(`${supabaseUrl}/functions/v1/notify-psws`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ bookingId: shiftId }),
    });
    console.log("Re-dispatch triggered for released job:", shiftId);
  } catch (dispatchErr) {
    console.error("Re-dispatch failed (job still in open pool):", dispatchErr);
  }

  return mapBookingToShift(data);
};

// Get shifts flagged for overtime (admin view)
export const getOvertimeShiftsAsync = async (): Promise<ShiftRecord[]> => {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("flagged_for_overtime", true)
    .order("signed_out_at", { ascending: false });

  if (error) {
    console.error("Error fetching overtime shifts:", error);
    return [];
  }
  return (data || []).map(mapBookingToShift);
};

// ==================== LEGACY SYNC FUNCTIONS (backward compat) ====================
// These are kept for components that haven't migrated yet
// They read from localStorage as a fallback but prefer DB data

// Legacy sync: getShifts (reads localStorage for backward compat)
export const getShifts = (): ShiftRecord[] => {
  const stored = localStorage.getItem("pswdirect_shifts");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

// Legacy: save shifts to localStorage
const saveShifts = (shifts: ShiftRecord[]): void => {
  localStorage.setItem("pswdirect_shifts", JSON.stringify(shifts));
};

// Legacy: update shift in localStorage
export const updateShift = (id: string, updates: Partial<ShiftRecord>): ShiftRecord | null => {
  const shifts = getShifts();
  const index = shifts.findIndex(s => s.id === id);
  if (index === -1) return null;
  shifts[index] = { ...shifts[index], ...updates };
  saveShifts(shifts);
  return shifts[index];
};

// Legacy: get shift by ID from localStorage
export const getShiftById = (id: string): ShiftRecord | null => {
  const shifts = getShifts();
  return shifts.find(s => s.id === id) || null;
};

// Legacy: get available shifts from localStorage
export const getAvailableShifts = (): ShiftRecord[] => {
  return getShifts().filter(s => s.status === "available");
};

// Legacy: get PSW shifts from localStorage
export const getPSWShifts = (pswId: string): ShiftRecord[] => {
  return getShifts().filter(s => s.pswId === pswId && s.status !== "available");
};

// Legacy: get active shifts from localStorage
export const getActiveShifts = (pswId: string): ShiftRecord[] => {
  return getShifts().filter(s => s.pswId === pswId && s.status === "checked-in");
};

// Legacy: has active shifts from localStorage
export const hasActiveShifts = (pswId: string): boolean => {
  return getActiveShifts(pswId).length > 0;
};

// Legacy: generate shift ID
export const generateShiftId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `SH-${timestamp}-${random}`;
};

// Legacy: add shift to localStorage
export const addShift = (shift: Omit<ShiftRecord, "id">): ShiftRecord => {
  const shifts = getShifts();
  const newShift: ShiftRecord = { ...shift, id: generateShiftId() };
  shifts.push(newShift);
  saveShifts(shifts);
  return newShift;
};

// Legacy: get overtime shifts
export const getOvertimeShifts = (): ShiftRecord[] => {
  return getShifts().filter(s => s.flaggedForOvertime);
};

// ==================== REMOVED: No more demo shifts ====================
// initializeDemoShifts is now a no-op to prevent fake data pollution
export const initializeDemoShifts = (): void => {
  // No-op: Demo shifts have been removed. All data comes from the database.
};

// syncBookingsToShifts is no longer needed - bookings ARE the shifts
export const syncBookingsToShifts = (_bookings: any[]): void => {
  // No-op: The bookings table is now the single source of truth.
};

// Office contact number
export { getOfficeNumber, fetchOfficeNumber, DEFAULT_OFFICE_NUMBER as OFFICE_PHONE_NUMBER } from "./messageTemplates";
