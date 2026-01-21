// Shift Store - Centralized shift management for PSWs
// This simulates a backend database for storing shift data

export interface CareSheetData {
  moodOnArrival: string;
  moodOnDeparture: string;
  tasksCompleted: string[];
  observations: string;
  pswFirstName: string;
  officeNumber: string;
  // Hospital Discharge Protocol
  isHospitalDischarge?: boolean;
  dischargeDocuments?: string; // Base64 or URL to uploaded file
  dischargeNotes?: string; // Private notes for admin only
  // Transport details (auto-included for hospital/doctor visits)
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
  pswLanguages?: string[]; // Languages spoken by assigned PSW
  clientName: string;
  clientFirstName: string;
  clientPhone?: string; // Client phone number - revealed after claim
  patientAddress: string;
  postalCode: string;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledDate: string;
  services: string[];
  preferredLanguages?: string[]; // Client's preferred languages
  preferredGender?: GenderPreference; // Client's preferred caregiver gender
  
  // Transport fields (for Hospital/Doctor visits)
  pickupAddress?: string;
  pickupPostalCode?: string;
  dropoffAddress?: string;
  dropoffPostalCode?: string;
  isTransportShift?: boolean; // True for hospital/doctor visits
  pswLicensePlate?: string; // PSW's license plate for transport shifts
  
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
  languageMatchPriority?: boolean; // True if this shift matches PSW's language
  postedAt?: string; // When shift was posted for language matching timeout
  
  status: "available" | "claimed" | "checked-in" | "completed";
}

// Generate a unique shift ID
export const generateShiftId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `SH-${timestamp}-${random}`;
};

// Get all shifts from localStorage
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

// Save shifts to localStorage
const saveShifts = (shifts: ShiftRecord[]): void => {
  localStorage.setItem("pswdirect_shifts", JSON.stringify(shifts));
};

// Add a new shift
export const addShift = (shift: Omit<ShiftRecord, "id">): ShiftRecord => {
  const shifts = getShifts();
  const newShift: ShiftRecord = {
    ...shift,
    id: generateShiftId(),
  };
  shifts.push(newShift);
  saveShifts(shifts);
  return newShift;
};

// Update a shift
export const updateShift = (id: string, updates: Partial<ShiftRecord>): ShiftRecord | null => {
  const shifts = getShifts();
  const index = shifts.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  shifts[index] = { ...shifts[index], ...updates };
  saveShifts(shifts);
  return shifts[index];
};

// Get a single shift by ID
export const getShiftById = (id: string): ShiftRecord | null => {
  const shifts = getShifts();
  return shifts.find(s => s.id === id) || null;
};

// Get available shifts for PSWs to claim
export const getAvailableShifts = (): ShiftRecord[] => {
  const shifts = getShifts();
  return shifts.filter(s => s.status === "available");
};

// Get shifts claimed by a specific PSW
export const getPSWShifts = (pswId: string): ShiftRecord[] => {
  const shifts = getShifts();
  return shifts.filter(s => s.pswId === pswId && s.status !== "available");
};

// Get active (checked-in) shifts for a PSW
export const getActiveShifts = (pswId: string): ShiftRecord[] => {
  const shifts = getShifts();
  return shifts.filter(s => s.pswId === pswId && s.status === "checked-in");
};

// Check if PSW has any active (checked-in) shifts
export const hasActiveShifts = (pswId: string): boolean => {
  return getActiveShifts(pswId).length > 0;
};

// Claim a shift
export const claimShift = (shiftId: string, pswId: string, pswName: string): ShiftRecord | null => {
  return updateShift(shiftId, {
    pswId,
    pswName,
    claimedAt: new Date().toISOString(),
    agreementAccepted: true,
    status: "claimed",
  });
};

// Check in to a shift
export const checkInToShift = (
  shiftId: string, 
  location: { lat: number; lng: number }
): ShiftRecord | null => {
  return updateShift(shiftId, {
    checkedInAt: new Date().toISOString(),
    checkInLocation: location,
    status: "checked-in",
  });
};

// Sign out from a shift
export const signOutFromShift = (
  shiftId: string,
  careSheet: CareSheetData,
  orderingClientEmail: string
): ShiftRecord | null => {
  const shift = getShiftById(shiftId);
  if (!shift || !shift.checkedInAt) return null;
  
  const signOutTime = new Date();
  const scheduledEnd = new Date(`${shift.scheduledDate} ${shift.scheduledEnd}`);
  const overtimeMinutes = Math.max(0, Math.floor((signOutTime.getTime() - scheduledEnd.getTime()) / 60000));
  const flaggedForOvertime = overtimeMinutes >= 15; // 14-min grace period
  
  const result = updateShift(shiftId, {
    signedOutAt: signOutTime.toISOString(),
    careSheet,
    careSheetSentAt: signOutTime.toISOString(),
    careSheetEmailTo: orderingClientEmail,
    overtimeMinutes,
    flaggedForOvertime,
    status: "completed",
  });
  
  // Log the care sheet email
  console.log("📧 CARE SHEET EMAIL SENT:", {
    to: orderingClientEmail,
    shiftId,
    pswFirstName: careSheet.pswFirstName,
    tasksCompleted: careSheet.tasksCompleted,
    observations: careSheet.observations,
    officeNumber: careSheet.officeNumber,
    sentAt: signOutTime.toISOString(),
  });
  
  // Log overtime flag if applicable
  if (flaggedForOvertime) {
    console.log("⚠️ OVERTIME FLAGGED:", {
      shiftId,
      overtimeMinutes,
      scheduledEnd: shift.scheduledEnd,
      actualSignOut: signOutTime.toISOString(),
      flaggedForBilling: true,
    });
  }

  // AUTO-CREATE PAYROLL ENTRY and PROCESS OVERTIME when shift completes
  if (result) {
    import("@/integrations/supabase/client").then(async ({ supabase }) => {
      const hoursWorked = overtimeMinutes > 0 
        ? (new Date(result.signedOutAt!).getTime() - new Date(result.checkedInAt!).getTime()) / 3600000
        : (scheduledEnd.getTime() - new Date(result.checkedInAt!).getTime()) / 3600000;
      
      const isHospital = result.services.some(s => s.toLowerCase().includes("hospital"));
      const isDoctor = result.services.some(s => s.toLowerCase().includes("doctor"));
      const hourlyRate = isHospital ? 28 : isDoctor ? 25 : 22;
      const clientHourlyRate = isHospital ? 35 : isDoctor ? 30 : 30; // Client rate for overtime charging
      const taskLabel = isHospital ? "Hospital Visit" : isDoctor ? "Doctor Visit" : "Standard Home Care";
      const totalOwed = Math.max(hoursWorked, 1) * hourlyRate;

      // Create payroll entry
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

      // AUTOMATIC OVERTIME BILLING - triggered if 15+ minutes over
      if (flaggedForOvertime && overtimeMinutes >= 15) {
        console.log("💳 Triggering automatic overtime charge...", {
          overtimeMinutes,
          clientHourlyRate,
        });

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
            
            // Send overtime notification email to client
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
          } else {
            console.log("ℹ️ No overtime charge applied (within grace period)");
          }
        } catch (err) {
          console.error("Failed to process overtime:", err);
        }
      }
    });
  }
  
  return result;
};

// Admin stop shift - forcefully end a shift from admin portal
export const adminStopShift = (
  shiftId: string,
  adminNotes?: string
): ShiftRecord | null => {
  const shift = getShiftById(shiftId);
  if (!shift || shift.status !== "checked-in") return null;
  
  const signOutTime = new Date();
  const scheduledEnd = new Date(`${shift.scheduledDate} ${shift.scheduledEnd}`);
  const overtimeMinutes = Math.max(0, Math.floor((signOutTime.getTime() - scheduledEnd.getTime()) / 60000));
  const flaggedForOvertime = overtimeMinutes >= 15;
  
  const result = updateShift(shiftId, {
    signedOutAt: signOutTime.toISOString(),
    careSheet: {
      moodOnArrival: "unknown",
      moodOnDeparture: "unknown",
      tasksCompleted: shift.services,
      observations: `[Admin stopped shift]${adminNotes ? ` Reason: ${adminNotes}` : ""}`,
      pswFirstName: shift.pswName.split(" ")[0] || "Unknown",
      officeNumber: OFFICE_PHONE_NUMBER,
    },
    overtimeMinutes,
    flaggedForOvertime,
    status: "completed",
  });
  
  console.log("🛑 ADMIN STOPPED SHIFT:", {
    shiftId,
    pswName: shift.pswName,
    clientName: shift.clientName,
    adminNotes,
    stoppedAt: signOutTime.toISOString(),
  });
  
  return result;
};

// Get shifts flagged for overtime (admin view)
export const getOvertimeShifts = (): ShiftRecord[] => {
  const shifts = getShifts();
  return shifts.filter(s => s.flaggedForOvertime);
};

// Sync bookings to shifts - creates available shifts from confirmed bookings
export const syncBookingsToShifts = (bookings: Array<{
  id: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: string[];
  orderingClient: {
    name: string;
    address: string;
    postalCode: string;
    email: string;
    phone?: string;
  };
  patient: {
    name: string;
    address: string;
    postalCode: string;
    preferredLanguages?: string[];
    preferredGender?: GenderPreference;
  };
  pswAssigned: string | null;
  pswLanguages?: string[];
}>): void => {
  const existingShifts = getShifts();
  
  bookings.forEach(booking => {
    // Only sync confirmed (pending/active) bookings that aren't already shifts
    if (booking.status === "cancelled" || booking.status === "completed") return;
    
    const existingShift = existingShifts.find(s => s.bookingId === booking.id);
    if (existingShift) return; // Already synced
    
    // Create a new available shift from this booking
    addShift({
      bookingId: booking.id,
      pswId: booking.pswAssigned || "",
      pswName: booking.pswAssigned || "",
      pswLanguages: booking.pswLanguages,
      clientName: booking.orderingClient.name,
      clientFirstName: booking.orderingClient.name.split(" ")[0],
      clientPhone: booking.orderingClient.phone,
      patientAddress: booking.patient.address,
      postalCode: booking.patient.postalCode,
      scheduledStart: booking.startTime,
      scheduledEnd: booking.endTime,
      scheduledDate: booking.date,
      services: booking.serviceType,
      preferredLanguages: booking.patient.preferredLanguages,
      preferredGender: booking.patient.preferredGender,
      agreementAccepted: false,
      overtimeMinutes: 0,
      flaggedForOvertime: false,
      postedAt: new Date().toISOString(),
      status: booking.pswAssigned ? "claimed" : "available",
    });
  });
};

// Initialize with some demo shifts
export const initializeDemoShifts = (): void => {
  const existing = getShifts();
  if (existing.length > 0) return;
  
  const demoShifts: Omit<ShiftRecord, "id">[] = [
    {
      bookingId: "BK001",
      pswId: "",
      pswName: "",
      clientName: "Margaret Thompson",
      clientFirstName: "Margaret",
      clientPhone: "(416) 555-0101",
      patientAddress: "456 Oak Avenue, Belleville, ON",
      postalCode: "K8N 2B3",
      scheduledStart: "09:00",
      scheduledEnd: "13:00",
      scheduledDate: "2025-01-14",
      services: ["Personal Care", "Meal Prep"],
      agreementAccepted: false,
      overtimeMinutes: 0,
      flaggedForOvertime: false,
      status: "available",
    },
    {
      bookingId: "BK002",
      pswId: "",
      pswName: "",
      clientName: "Michael Chen",
      clientFirstName: "Michael",
      clientPhone: "(416) 555-0102",
      patientAddress: "789 Maple Street, Trenton, ON",
      postalCode: "K8V 3M2",
      scheduledStart: "14:00",
      scheduledEnd: "17:00",
      scheduledDate: "2025-01-14",
      services: ["Companionship", "Light Housekeeping"],
      agreementAccepted: false,
      overtimeMinutes: 0,
      flaggedForOvertime: false,
      status: "available",
    },
    {
      bookingId: "BK003",
      pswId: "",
      pswName: "",
      clientName: "Dorothy Williams",
      clientFirstName: "Dorothy",
      clientPhone: "(416) 555-0103",
      patientAddress: "123 Pine Road, Napanee, ON",
      postalCode: "K7R 1H5",
      scheduledStart: "10:00",
      scheduledEnd: "14:00",
      scheduledDate: "2025-01-15",
      services: ["Respite Care", "Medication Reminders"],
      agreementAccepted: false,
      overtimeMinutes: 0,
      flaggedForOvertime: false,
      status: "available",
    },
    // Toronto GTA shifts (urban bonus applicable)
    {
      bookingId: "BK004",
      pswId: "",
      pswName: "",
      clientName: "Susan Park",
      clientFirstName: "Susan",
      clientPhone: "(416) 555-0104",
      patientAddress: "200 Bay Street, Toronto, ON",
      postalCode: "M5J 2J2",
      scheduledStart: "08:00",
      scheduledEnd: "12:00",
      scheduledDate: "2025-01-15",
      services: ["Personal Care", "Companionship"],
      preferredLanguages: ["en", "ko"],
      agreementAccepted: false,
      overtimeMinutes: 0,
      flaggedForOvertime: false,
      status: "available",
    },
    {
      bookingId: "BK005",
      pswId: "",
      pswName: "",
      clientName: "James Liu",
      clientFirstName: "James",
      clientPhone: "(416) 555-0105",
      patientAddress: "5000 Yonge Street, North York, ON",
      postalCode: "M2N 5Y7",
      scheduledStart: "13:00",
      scheduledEnd: "17:00",
      scheduledDate: "2025-01-16",
      services: ["Meal Prep", "Light Housekeeping", "Medication Reminders"],
      preferredLanguages: ["zh", "en"],
      agreementAccepted: false,
      overtimeMinutes: 0,
      flaggedForOvertime: false,
      status: "available",
    },
  ];
  
  demoShifts.forEach(shift => addShift(shift));
};

// Office contact number
export const OFFICE_PHONE_NUMBER = "(613) 555-0100";
