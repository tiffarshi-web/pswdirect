// Helpers for the PSW "pending update" approval queue.
// Restricted fields (VSC, Government ID, verified PSW Cert) cannot be
// overwritten directly by a caregiver — they must be queued here for an
// admin to approve or reject.
import { supabase } from "@/integrations/supabase/client";

export type RestrictedField = "police_check" | "gov_id" | "psw_cert";

export type PendingUpdateStatus = "pending" | "approved" | "rejected";

export interface PendingUpdate {
  id: string;
  pswId: string;
  fieldName: RestrictedField | string;
  oldValue: any;
  newValue: any;
  status: PendingUpdateStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

const mapRow = (row: any): PendingUpdate => ({
  id: row.id,
  pswId: row.psw_id,
  fieldName: row.field_name,
  oldValue: row.old_value,
  newValue: row.new_value,
  status: row.status,
  submittedAt: row.submitted_at,
  reviewedAt: row.reviewed_at ?? undefined,
  reviewedBy: row.reviewed_by ?? undefined,
  reviewNote: row.review_note ?? undefined,
});

export const submitPendingUpdate = async (
  pswId: string,
  fieldName: RestrictedField,
  oldValue: any,
  newValue: any,
): Promise<PendingUpdate | null> => {
  const { data, error } = await supabase
    .from("psw_pending_updates")
    .insert({
      psw_id: pswId,
      field_name: fieldName,
      old_value: oldValue ?? null,
      new_value: newValue,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to submit pending update", error);
    return null;
  }
  return data ? mapRow(data) : null;
};

export const getPendingUpdatesForPsw = async (pswId: string): Promise<PendingUpdate[]> => {
  const { data, error } = await supabase
    .from("psw_pending_updates")
    .select("*")
    .eq("psw_id", pswId)
    .order("submitted_at", { ascending: false });
  if (error) {
    console.error("Failed to load pending updates", error);
    return [];
  }
  return (data || []).map(mapRow);
};

export const getAllPendingUpdates = async (): Promise<
  (PendingUpdate & { psw: { firstName: string; lastName: string; email: string } | null })[]
> => {
  const { data, error } = await supabase
    .from("psw_pending_updates")
    .select("*, psw:psw_profiles(first_name, last_name, email)")
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });
  if (error) {
    console.error("Failed to load pending updates", error);
    return [];
  }
  return (data || []).map((row: any) => ({
    ...mapRow(row),
    psw: row.psw
      ? { firstName: row.psw.first_name, lastName: row.psw.last_name, email: row.psw.email }
      : null,
  }));
};

export const approvePendingUpdate = async (id: string, note?: string): Promise<boolean> => {
  const { error } = await supabase.rpc("admin_approve_psw_update", {
    p_update_id: id,
    p_note: note ?? null,
  });
  if (error) {
    console.error("Approve failed", error);
    return false;
  }
  return true;
};

export const rejectPendingUpdate = async (id: string, note?: string): Promise<boolean> => {
  const { error } = await supabase.rpc("admin_reject_psw_update", {
    p_update_id: id,
    p_note: note ?? null,
  });
  if (error) {
    console.error("Reject failed", error);
    return false;
  }
  return true;
};

// Field labels for display
export const FIELD_LABELS: Record<string, string> = {
  police_check: "Vulnerable Sector Check",
  gov_id: "Government ID",
  psw_cert: "PSW Certificate",
};
