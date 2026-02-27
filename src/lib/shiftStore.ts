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
  
  // Transport fields
  pickupAddress?: string;
  pickupPostalCode?: string;
  dropoffAddress?: string;
  dropoffPostalCode?: string;
  isTransportShift?: boolean;
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
  
  status: "available" | "claimed" | "checked-in" | "completed";
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
  pickupAddress: row.pickup_address,
  pickupPostalCode: row.pickup_postal_code,
  dropoffAddress: row.dropoff_address,
  isTransportShift: row.is_transport_booking,
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
  status: deriveShiftStatus(row),
});

const BOOKING_SELECT = `id, booking_code, client_name, client_email, client_phone, 
  patient_address, patient_postal_code, scheduled_date, start_time, end_time, 
  service_type, status, psw_assigned, psw_first_name, psw_photo_url, 
  psw_vehicle_photo_url, psw_license_plate, preferred_languages, preferred_gender,
  pickup_address, pickup_postal_code, dropoff_address, is_transport_booking, is_asap,
  claimed_at, checked_in_at, check_in_lat, check_in_lng, signed_out_at,
  overtime_minutes, flagged_for_overtime, care_sheet, care_sheet_submitted_at,
  care_sheet_psw_name, created_at, user_id`;

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

// Get available shifts (pending, unassigned) from database
export const getAvailableShiftsAsync = async (): Promise<ShiftRecord[]> => {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("status", "pending")
    .is("psw_assigned", null)
    .order("scheduled_date", { ascending: true });

  if (error) {
    console.error("Error fetching available shifts:", error);
    return [];
  }
  return (data || []).map(mapBookingToShift);
};

// Get shifts assigned to a specific PSW (claimed, checked-in)
export const getPSWShiftsAsync = async (pswId: string): Promise<ShiftRecord[]> => {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
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
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
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
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("psw_assigned", pswId)
    .eq("status", "completed")
    .order("signed_out_at", { ascending: false });

  if (error) {
    console.error("Error fetching completed shifts:", error);
    return [];
  }
  return (data || []).map(mapBookingToShift);
};

// Get all active + claimed shifts (admin view)
export const getAllActiveShiftsAsync = async (): Promise<{
  active: ShiftRecord[];
  claimed: ShiftRecord[];
  completed: ShiftRecord[];
}> => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .not("status", "in", '("archived","cancelled")')
    .order("scheduled_date", { ascending: false });

  if (error) {
    console.error("Error fetching all shifts:", error);
    return { active: [], claimed: [], completed: [] };
  }

  const shifts = (data || []).map(mapBookingToShift);
  
  return {
    active: shifts.filter(s => s.status === "checked-in"),
    claimed: shifts.filter(s => s.status === "claimed"),
    completed: shifts.filter(s => 
      s.status === "completed" && s.signedOutAt && s.signedOutAt > oneDayAgo
    ),
  };
};

// ==================== MUTATION FUNCTIONS ====================

// Claim a shift
export const claimShift = async (
  shiftId: string,
  pswId: string,
  pswName: string,
  pswPhotoUrl?: string,
  pswVehiclePhotoUrl?: string,
  pswLicensePlate?: string
): Promise<ShiftRecord | null> => {
  const { data, error } = await supabase
    .from("bookings")
    .update({
      psw_assigned: pswId,
      psw_first_name: pswName.split(' ')[0],
      psw_photo_url: pswPhotoUrl || null,
      psw_vehicle_photo_url: pswVehiclePhotoUrl || null,
      psw_license_plate: pswLicensePlate || null,
      claimed_at: new Date().toISOString(),
      status: "active",
    })
    .eq("id", shiftId)
    .is("psw_assigned", null) // Prevent double-claim
    .select(BOOKING_SELECT)
    .single();

  if (error) {
    console.error("Error claiming shift:", error);
    return null;
  }

  const result = data ? mapBookingToShift(data) : null;

  // Send "Job Claimed" notification email to client
  if (result && result.clientEmail) {
    import("@/lib/notificationService").then(({ sendJobClaimedNotification }) => {
      sendJobClaimedNotification(
        result.clientEmail!,
        result.clientPhone,
        result.clientName,
        result.bookingId,
        result.scheduledDate,
        `${result.scheduledStart} - ${result.scheduledEnd}`,
        pswName,
        pswPhotoUrl
      );
    });
    
    console.log("📧 JOB CLAIMED EMAIL TRIGGERED:", {
      to: result.clientEmail,
      clientName: result.clientName,
      bookingId: result.bookingId,
      pswName,
    });
  }

  return result;
};

// Check in to a shift
export const checkInToShift = async (
  shiftId: string,
  location: { lat: number; lng: number }
): Promise<ShiftRecord | null> => {
  const { data, error } = await supabase
    .from("bookings")
    .update({
      checked_in_at: new Date().toISOString(),
      check_in_lat: location.lat,
      check_in_lng: location.lng,
      status: "in-progress",
    })
    .eq("id", shiftId)
    .select(BOOKING_SELECT)
    .single();

  if (error) {
    console.error("Error checking in:", error);
    return null;
  }
  return data ? mapBookingToShift(data) : null;
};

// Sign out from a shift
export const signOutFromShift = async (
  shiftId: string,
  careSheet: CareSheetData,
  orderingClientEmail: string
): Promise<ShiftRecord | null> => {
  // First fetch the current booking to calculate overtime
  const { data: current, error: fetchError } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", shiftId)
    .single();

  if (fetchError || !current || !current.checked_in_at) {
    console.error("Error fetching shift for sign-out:", fetchError);
    return null;
  }

  const signOutTime = new Date();
  const scheduledEnd = new Date(`${current.scheduled_date} ${current.end_time}`);
  const overtimeMinutes = Math.max(0, Math.floor((signOutTime.getTime() - scheduledEnd.getTime()) / 60000));
  const flaggedForOvertime = overtimeMinutes >= 15;

  const { data, error } = await supabase
    .from("bookings")
    .update({
      signed_out_at: signOutTime.toISOString(),
      status: "completed",
      care_sheet: JSON.parse(JSON.stringify(careSheet)),
      care_sheet_submitted_at: signOutTime.toISOString(),
      care_sheet_psw_name: careSheet.pswFirstName,
      overtime_minutes: overtimeMinutes,
      flagged_for_overtime: flaggedForOvertime,
    })
    .eq("id", shiftId)
    .select(BOOKING_SELECT)
    .single();

  if (error) {
    console.error("Error signing out:", error);
    return null;
  }

  const result = data ? mapBookingToShift(data) : null;
  if (!result) return null;

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

  // AUTO-CREATE PAYROLL ENTRY
  const hoursWorked = overtimeMinutes > 0
    ? (signOutTime.getTime() - new Date(current.checked_in_at).getTime()) / 3600000
    : (scheduledEnd.getTime() - new Date(current.checked_in_at).getTime()) / 3600000;

  const isHospital = (current.service_type || []).some((s: string) => s.toLowerCase().includes("hospital"));
  const isDoctor = (current.service_type || []).some((s: string) => s.toLowerCase().includes("doctor"));
  const hourlyRate = isHospital ? 28 : isDoctor ? 25 : 22;
  const clientHourlyRate = isHospital ? 35 : isDoctor ? 30 : 30;
  const taskLabel = isHospital ? "Hospital Visit" : isDoctor ? "Doctor Visit" : "Standard Home Care";
  const totalOwed = Math.max(hoursWorked, 1) * hourlyRate;

  const { error: payrollError } = await supabase.from("payroll_entries").insert({
    shift_id: result.id,
    psw_id: result.pswId,
    psw_name: result.pswName,
    task_name: flaggedForOvertime
      ? `${taskLabel} (Overtime Adjusted): ${result.services.join(", ")}`
      : `${taskLabel}: ${result.services.join(", ")}`,
    scheduled_date: result.scheduledDate,
    hours_worked: Number(Math.max(hoursWorked, 1).toFixed(2)),
    hourly_rate: hourlyRate,
    total_owed: Number(totalOwed.toFixed(2)),
    status: flaggedForOvertime ? "overtime_adjusted" : "pending",
  });

  if (payrollError) {
    console.error("Auto-payroll error:", payrollError);
  } else {
    console.log("✅ Auto-created payroll entry for shift", result.id);
  }

  // AUTOMATIC OVERTIME BILLING
  if (flaggedForOvertime && overtimeMinutes >= 15) {
    try {
      const { data: overtimeResult, error: overtimeError } = await supabase.functions.invoke('charge-overtime', {
        body: {
          bookingId: result.bookingId,
          shiftId: result.id,
          customerEmail: orderingClientEmail,
          overtimeMinutes,
          hourlyRate: clientHourlyRate,
          pswId: result.pswId,
          pswName: result.pswName,
          clientName: result.clientName,
          isDryRun: false,
        }
      });

      if (overtimeError) {
        console.error("Overtime charge error:", overtimeError);
      } else if (overtimeResult?.charged) {
        console.log("✅ Overtime charge successful:", overtimeResult);
        import("@/lib/notificationService").then(({ sendOvertimeAdjustmentNotification }) => {
          sendOvertimeAdjustmentNotification(
            orderingClientEmail,
            result.clientName,
            result.bookingId,
            overtimeMinutes,
            overtimeResult.chargeAmount,
            careSheet.pswFirstName
          );
        });
      }
    } catch (err) {
      console.error("Failed to process overtime:", err);
    }
  }

  return result;
};

// Update a shift (generic)
export const updateShiftAsync = async (
  id: string,
  updates: Record<string, any>
): Promise<ShiftRecord | null> => {
  const { data, error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", id)
    .select(BOOKING_SELECT)
    .single();

  if (error) {
    console.error("Error updating shift:", error);
    return null;
  }
  return data ? mapBookingToShift(data) : null;
};

// Admin manual check-in
export const adminManualCheckIn = async (
  shiftId: string,
  adminEmail: string,
  reason?: string
): Promise<ShiftRecord | null> => {
  const checkInTime = new Date();
  
  const { data, error } = await supabase
    .from("bookings")
    .update({
      checked_in_at: checkInTime.toISOString(),
      check_in_lat: 0,
      check_in_lng: 0,
      status: "in-progress",
      manual_check_in: true,
      manual_override_at: checkInTime.toISOString(),
      manual_override_by: adminEmail,
      manual_override_reason: reason || "Admin manual check-in (geofence bypass)",
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
  const scheduledEnd = new Date(`${current.scheduled_date} ${current.end_time}`);
  const overtimeMinutes = Math.max(0, Math.floor((signOutTime.getTime() - scheduledEnd.getTime()) / 60000));
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
  return data ? mapBookingToShift(data) : null;
};

// Admin stop shift
export const adminStopShift = async (
  shiftId: string,
  adminNotes?: string
): Promise<ShiftRecord | null> => {
  return adminManualSignOut(shiftId, "admin", adminNotes);
};

// Cancel a claimed shift (PSW unclaims)
export const unclaimShift = async (shiftId: string): Promise<ShiftRecord | null> => {
  const { data, error } = await supabase
    .from("bookings")
    .update({
      psw_assigned: null,
      psw_first_name: null,
      psw_photo_url: null,
      psw_vehicle_photo_url: null,
      psw_license_plate: null,
      claimed_at: null,
      status: "pending",
    })
    .eq("id", shiftId)
    .select(BOOKING_SELECT)
    .single();

  if (error) {
    console.error("Error unclaiming shift:", error);
    return null;
  }
  return data ? mapBookingToShift(data) : null;
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
