import { supabase } from "@/integrations/supabase/client";

export interface SyncCompletedPayrollResult {
  success: boolean;
  count: number;
  error?: string;
}

const fetchExistingPayrollShiftIds = async (): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from("payroll_entries")
    .select("shift_id");

  if (error) {
    throw error;
  }

  return new Set((data || []).map((entry) => entry.shift_id));
};

export const syncCompletedBookingsToPayroll = async (): Promise<SyncCompletedPayrollResult> => {
  try {
    const beforeShiftIds = await fetchExistingPayrollShiftIds();

    const { error } = await (supabase as any).rpc("sync_completed_bookings_to_payroll");

    if (error) {
      throw error;
    }

    const afterShiftIds = await fetchExistingPayrollShiftIds();
    let count = 0;

    afterShiftIds.forEach((shiftId) => {
      if (!beforeShiftIds.has(shiftId)) {
        count += 1;
      }
    });

    return { success: true, count };
  } catch (error: any) {
    console.error("Error syncing completed bookings to payroll:", error);
    return {
      success: false,
      count: 0,
      error: error?.message || "Unknown payroll sync error",
    };
  }
};
