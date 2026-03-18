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
    console.error("[payrollSync] Error fetching existing shift IDs:", error.message, error.details, error.code);
    throw error;
  }

  console.log(`[payrollSync] Found ${(data || []).length} existing payroll entries`);
  return new Set((data || []).map((entry) => entry.shift_id));
};

export const syncCompletedBookingsToPayroll = async (): Promise<SyncCompletedPayrollResult> => {
  try {
    const beforeShiftIds = await fetchExistingPayrollShiftIds();
    console.log(`[payrollSync] Before sync: ${beforeShiftIds.size} payroll entries`);

    const { data, error } = await (supabase as any).rpc("sync_completed_bookings_to_payroll");

    if (error) {
      console.error("[payrollSync] RPC error:", error.message, error.details, error.code, error.hint);
      throw error;
    }

    console.log(`[payrollSync] RPC returned: ${data} bookings processed`);

    const afterShiftIds = await fetchExistingPayrollShiftIds();
    let count = 0;

    afterShiftIds.forEach((shiftId) => {
      if (!beforeShiftIds.has(shiftId)) {
        console.log(`[payrollSync] New payroll entry created for shift_id: ${shiftId}`);
        count += 1;
      }
    });

    console.log(`[payrollSync] Sync complete: ${count} new entries created`);
    return { success: true, count };
  } catch (error: any) {
    console.error("[payrollSync] Sync failed:", error?.message || error, error?.details, error?.code);
    return {
      success: false,
      count: 0,
      error: error?.message || "Unknown payroll sync error",
    };
  }
};
