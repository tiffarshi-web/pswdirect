// Payroll Store — caregiver pay calculations.
//
// There is exactly ONE approved Ontario PSW rate and it lives in the backend
// approved-rate table (mirrored here as ONTARIO_PSW_RATE_CENTS for display
// maths only). The legacy service-specific rates (`app_settings.staff_pay_rates`)
// are RETIRED: they are readable as inactive historical audit evidence and are
// never used by any booking, trigger, payroll or display calculation.

import { supabase } from "@/integrations/supabase/client";
import { ONTARIO_PSW_RATE_CENTS } from "@/lib/pswPay";

export interface StaffPayRates {
  standardHomeCare: number; // $/hour for regular home care
  hospitalVisit: number; // $/hour for hospital visits (discharge, pick-up)
  doctorVisit: number; // $/hour for doctor appointment escorts
}

export type ShiftType = "standard" | "hospital" | "doctor";

export interface PayrollEntry {
  pswId: string;
  pswName: string;
  shiftId: string;
  date: string;
  checkInTime: string;
  signOutTime: string;
  scheduledStart: string;
  scheduledEnd: string;
  services: string[];
  isHospitalDoctorVisit: boolean;
  hoursWorked: number;
  overtimeMinutes: number;
  payRate: number;
  basePay: number;
  overtimePay: number;
  totalPay: number;
}

export interface DailyPayrollSummary {
  date: string;
  totalShifts: number;
  totalHours: number;
  totalOwed: number;
  entries: PayrollEntry[];
}

const DB_SETTING_KEY = "staff_pay_rates";

/**
 * Read the RETIRED service-specific rates purely as inactive historical audit
 * evidence. Returns null when nothing was ever recorded. These values must
 * never be fed into a rate, trigger, payroll amount or estimate.
 */
export const fetchHistoricalStaffPayRates = async (): Promise<StaffPayRates | null> => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", DB_SETTING_KEY)
      .maybeSingle();

    if (error || !data?.setting_value) return null;
    return JSON.parse(data.setting_value) as StaffPayRates;
  } catch {
    return null;
  }
};

// Determine shift type based on services
export const getShiftType = (services: string[]): ShiftType => {
  const servicesLower = services.map(s => s.toLowerCase()).join(" ");
  
  // Check for hospital visits (discharge, pick-up, hospital)
  if (
    servicesLower.includes("hospital") ||
    servicesLower.includes("discharge") ||
    servicesLower.includes("pick-up") ||
    servicesLower.includes("pickup")
  ) {
    return "hospital";
  }
  
  // Check for doctor visits (doctor, appointment, escort)
  if (
    servicesLower.includes("doctor") ||
    servicesLower.includes("appointment") ||
    servicesLower.includes("escort")
  ) {
    return "doctor";
  }
  
  // Default to standard home care
  return "standard";
};

// Legacy function for backwards compatibility
export const isHospitalDoctorShift = (services: string[]): boolean => {
  const shiftType = getShiftType(services);
  return shiftType === "hospital" || shiftType === "doctor";
};

// Calculate hours worked from times
export const calculateHoursWorked = (
  checkInTime: string,
  signOutTime: string
): number => {
  const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };
  
  const checkInMinutes = parseTime(checkInTime);
  const signOutMinutes = parseTime(signOutTime);
  
  const totalMinutes = Math.max(0, signOutMinutes - checkInMinutes);
  return totalMinutes / 60;
};

/**
 * Phase 8 rule: the Ontario PSW rate is $21.00 per CLIENT-REQUESTED hour for
 * every service. Hospital and doctor visits no longer pay a different provider
 * rate, and the client price never influences provider pay.
 */
export const getPayRateForShiftType = (_shiftType: ShiftType): number =>
  ONTARIO_PSW_RATE_CENTS / 100;

/**
 * Calculate provider pay for a single shift.
 * requestedHours = the duration the client booked and paid for.
 * Overtime, premiums and bonuses are never added.
 */
export const calculateShiftPay = (
  requestedHours: number,
  _overtimeMinutes: number,
  _shiftTypeOrIsHospitalDoctor: ShiftType | boolean
): { basePay: number; overtimePay: number; totalPay: number; payRate: number } => {
  const payRate = ONTARIO_PSW_RATE_CENTS / 100;
  const cents = Math.round(Math.max(0, Number(requestedHours) || 0) * 60 * ONTARIO_PSW_RATE_CENTS / 60);
  const basePay = cents / 100;
  return { basePay, overtimePay: 0, totalPay: basePay, payRate };
};

// Generate payroll entries from completed shifts
export const generatePayrollFromShifts = (shifts: Array<{
  id: string;
  pswId: string;
  pswName: string;
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  checkedInAt?: string;
  signedOutAt?: string;
  services: string[];
  overtimeMinutes: number;
  status: string;
}>): PayrollEntry[] => {
  return shifts
    .filter(shift => shift.status === "completed" && shift.checkedInAt && shift.signedOutAt)
    .map(shift => {
      const checkInTime = new Date(shift.checkedInAt!).toTimeString().slice(0, 5);
      const signOutTime = new Date(shift.signedOutAt!).toTimeString().slice(0, 5);
      // Pay is based on the CLIENT-REQUESTED schedule, never the clocked time.
      const hoursWorked = calculateHoursWorked(shift.scheduledStart, shift.scheduledEnd);
      const isHospitalDoctor = isHospitalDoctorShift(shift.services);
      const { basePay, overtimePay, totalPay, payRate } = calculateShiftPay(
        hoursWorked,
        0,
        isHospitalDoctor
      );
      
      return {
        pswId: shift.pswId,
        pswName: shift.pswName,
        shiftId: shift.id,
        date: shift.scheduledDate,
        checkInTime,
        signOutTime,
        scheduledStart: shift.scheduledStart,
        scheduledEnd: shift.scheduledEnd,
        services: shift.services,
        isHospitalDoctorVisit: isHospitalDoctor,
        hoursWorked,
        overtimeMinutes: shift.overtimeMinutes,
        payRate,
        basePay,
        overtimePay,
        totalPay,
      };
    });
};

// Group payroll entries by date
export const groupPayrollByDate = (entries: PayrollEntry[]): DailyPayrollSummary[] => {
  const grouped: Record<string, PayrollEntry[]> = {};
  
  entries.forEach(entry => {
    if (!grouped[entry.date]) {
      grouped[entry.date] = [];
    }
    grouped[entry.date].push(entry);
  });
  
  return Object.entries(grouped)
    .map(([date, dayEntries]) => ({
      date,
      totalShifts: dayEntries.length,
      totalHours: dayEntries.reduce((sum, e) => sum + e.hoursWorked, 0),
      totalOwed: dayEntries.reduce((sum, e) => sum + e.totalPay, 0),
      entries: dayEntries,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Group payroll entries by PSW
export const groupPayrollByPSW = (entries: PayrollEntry[]): Record<string, {
  pswId: string;
  pswName: string;
  totalHours: number;
  totalPay: number;
  shiftCount: number;
  standardShifts: number;
  hospitalShifts: number;
}> => {
  const grouped: Record<string, typeof entries> = {};
  
  entries.forEach(entry => {
    if (!grouped[entry.pswId]) {
      grouped[entry.pswId] = [];
    }
    grouped[entry.pswId].push(entry);
  });
  
  const result: Record<string, {
    pswId: string;
    pswName: string;
    totalHours: number;
    totalPay: number;
    shiftCount: number;
    standardShifts: number;
    hospitalShifts: number;
  }> = {};
  
  Object.entries(grouped).forEach(([pswId, pswEntries]) => {
    result[pswId] = {
      pswId,
      pswName: pswEntries[0]?.pswName || "Unknown",
      totalHours: pswEntries.reduce((sum, e) => sum + e.hoursWorked, 0),
      totalPay: pswEntries.reduce((sum, e) => sum + e.totalPay, 0),
      shiftCount: pswEntries.length,
      standardShifts: pswEntries.filter(e => !e.isHospitalDoctorVisit).length,
      hospitalShifts: pswEntries.filter(e => e.isHospitalDoctorVisit).length,
    };
  });
  
  return result;
};

// Export payroll data to CSV
export const exportPayrollToCSV = (entries: PayrollEntry[], dateRange: { start: string; end: string }): string => {
  const grouped = groupPayrollByPSW(entries);
  
  const headers = ["PSW Name", "Total Hours", "Standard Shifts", "Hospital/Doctor Shifts", "Total Pay Owed"];
  const rows = Object.values(grouped).map(psw => [
    psw.pswName,
    psw.totalHours.toFixed(2),
    psw.standardShifts.toString(),
    psw.hospitalShifts.toString(),
    `$${psw.totalPay.toFixed(2)}`,
  ]);
  
  // Add summary row
  const totalHours = Object.values(grouped).reduce((sum, p) => sum + p.totalHours, 0);
  const totalPay = Object.values(grouped).reduce((sum, p) => sum + p.totalPay, 0);
  rows.push(["TOTAL", totalHours.toFixed(2), "", "", `$${totalPay.toFixed(2)}`]);
  
  const csvContent = [
    `Payroll Export: ${dateRange.start} to ${dateRange.end}`,
    "",
    headers.join(","),
    ...rows.map(row => row.join(",")),
  ].join("\n");
  
  return csvContent;
};

// Download CSV file
export const downloadPayrollCSV = (entries: PayrollEntry[], dateRange: { start: string; end: string }): void => {
  const csv = exportPayrollToCSV(entries, dateRange);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `payroll_${dateRange.start}_to_${dateRange.end}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
