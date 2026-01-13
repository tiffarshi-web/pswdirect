// Shift Store - Centralized shift management for PSWs
// This simulates a backend database for storing shift data

export interface CareSheetData {
  moodOnArrival: string;
  moodOnDeparture: string;
  tasksCompleted: string[];
  observations: string;
  pswFirstName: string;
  officeNumber: string;
}

export interface ShiftRecord {
  id: string;
  bookingId: string;
  pswId: string;
  pswName: string;
  clientName: string;
  clientFirstName: string;
  patientAddress: string;
  postalCode: string;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledDate: string;
  services: string[];
  
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
  const flaggedForOvertime = overtimeMinutes >= 15;
  
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
  
  return result;
};

// Get shifts flagged for overtime (admin view)
export const getOvertimeShifts = (): ShiftRecord[] => {
  const shifts = getShifts();
  return shifts.filter(s => s.flaggedForOvertime);
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
      clientName: "Sarah Johnson",
      clientFirstName: "Sarah",
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
  ];
  
  demoShifts.forEach(shift => addShift(shift));
};

// Office contact number
export const OFFICE_PHONE_NUMBER = "(613) 555-0100";
