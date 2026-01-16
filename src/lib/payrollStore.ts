// Payroll Store - Manages staff pay rates and payroll calculations
// Handles both Standard Home Care and Hospital/Doctor visit rates

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

// Default pay rates
const DEFAULT_PAY_RATES: StaffPayRates = {
  standardHomeCare: 22, // $22/hour
  hospitalVisit: 28, // $28/hour
  doctorVisit: 26, // $26/hour
};

// Get pay rates from localStorage
export const getStaffPayRates = (): StaffPayRates => {
  const stored = localStorage.getItem("pswdirect_staff_pay_rates");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_PAY_RATES;
    }
  }
  return DEFAULT_PAY_RATES;
};

// Save pay rates
export const saveStaffPayRates = (rates: StaffPayRates): void => {
  localStorage.setItem("pswdirect_staff_pay_rates", JSON.stringify(rates));
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

// Get pay rate for a shift type
export const getPayRateForShiftType = (shiftType: ShiftType): number => {
  const rates = getStaffPayRates();
  switch (shiftType) {
    case "hospital":
      return rates.hospitalVisit;
    case "doctor":
      return rates.doctorVisit;
    default:
      return rates.standardHomeCare;
  }
};

// Calculate pay for a single shift
export const calculateShiftPay = (
  hoursWorked: number,
  overtimeMinutes: number,
  shiftTypeOrIsHospitalDoctor: ShiftType | boolean
): { basePay: number; overtimePay: number; totalPay: number; payRate: number } => {
  let payRate: number;
  
  // Support both new ShiftType and legacy boolean
  if (typeof shiftTypeOrIsHospitalDoctor === "boolean") {
    const rates = getStaffPayRates();
    payRate = shiftTypeOrIsHospitalDoctor ? rates.hospitalVisit : rates.standardHomeCare;
  } else {
    payRate = getPayRateForShiftType(shiftTypeOrIsHospitalDoctor);
  }
  
  const basePay = hoursWorked * payRate;
  // Overtime for staff is paid at 1.5x rate
  const overtimePay = (overtimeMinutes / 60) * payRate * 1.5;
  const totalPay = basePay + overtimePay;
  
  return { basePay, overtimePay, totalPay, payRate };
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
      const hoursWorked = calculateHoursWorked(checkInTime, signOutTime);
      const isHospitalDoctor = isHospitalDoctorShift(shift.services);
      const { basePay, overtimePay, totalPay, payRate } = calculateShiftPay(
        hoursWorked,
        shift.overtimeMinutes,
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
