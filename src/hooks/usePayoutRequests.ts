import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PayrollEntryRow {
  id: string;
  shift_id: string;
  psw_id: string;
  psw_name: string;
  task_name: string;
  scheduled_date: string;
  hours_worked: number;
  hourly_rate: number;
  surcharge_applied: number | null;
  total_owed: number;
  status: string;
  cleared_at: string | null;
  completed_at: string | null;
  earned_date: string | null;
  payout_request_id: string | null;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  psw_id: string;
  period_start: string;
  period_end: string;
  requested_at: string;
  status: string;
  approved_at: string | null;
  payout_ready_at: string | null;
  cleared_at: string | null;
  rejected_at: string | null;
  admin_notes: string | null;
  total_amount: number;
  entry_count: number;
}

/** Returns Toronto day-of-week (0=Sun..6=Sat) */
const getTorontoDow = (): number => {
  const now = new Date();
  const toronto = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }));
  return toronto.getDay();
};

export const isThursday = (): boolean => getTorontoDow() === 4;

export const usePayoutRequests = (pswId: string | undefined) => {
  const [entries, setEntries] = useState<PayrollEntryRow[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!pswId) return;
    setLoading(true);

    const [entriesRes, requestsRes] = await Promise.all([
      supabase.from("payroll_entries").select("*").eq("psw_id", pswId),
      supabase.from("payout_requests").select("*").eq("psw_id", pswId).order("requested_at", { ascending: false }),
    ]);

    if (entriesRes.data) setEntries(entriesRes.data as PayrollEntryRow[]);
    if (requestsRes.data) setPayoutRequests(requestsRes.data as PayoutRequest[]);
    setLoading(false);
  }, [pswId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const eligibleEntries = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return entries.filter(e =>
      !e.payout_request_id &&
      e.status !== "cleared" &&
      e.completed_at &&
      new Date(e.completed_at) <= cutoff
    );
  }, [entries]);

  const pendingPayoutEntries = useMemo(() =>
    entries.filter(e => e.payout_request_id && e.status !== "cleared"),
  [entries]);

  const clearedEntries = useMemo(() =>
    entries.filter(e => e.status === "cleared"),
  [entries]);

  const hasOpenRequest = useMemo(() =>
    payoutRequests.some(r => ["requested", "approved", "payout_ready"].includes(r.status)),
  [payoutRequests]);

  const paidThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return clearedEntries
      .filter(e => e.cleared_at && new Date(e.cleared_at) >= monthStart)
      .reduce((sum, e) => sum + e.total_owed, 0);
  }, [clearedEntries]);

  const paidYTD = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    return clearedEntries
      .filter(e => e.cleared_at && new Date(e.cleared_at) >= yearStart)
      .reduce((sum, e) => sum + e.total_owed, 0);
  }, [clearedEntries]);

  const getDisabledReason = (): string | null => {
    if (!isThursday()) return "Payout requests are available Thursdays only.";
    if (hasOpenRequest) return "You already have a payout request in progress.";
    if (eligibleEntries.length === 0) return "No earnings are eligible yet (shifts must be completed 7+ days ago).";
    return null;
  };

  const requestPayout = async (): Promise<{ success: boolean; message: string }> => {
    if (!pswId) return { success: false, message: "Not authenticated." };
    const { data, error } = await supabase.rpc("create_payout_request", { p_psw_id: pswId });
    if (error) return { success: false, message: error.message };
    const result = data as any;
    if (result?.error) return { success: false, message: result.message };
    await fetchData();
    return { success: true, message: `Payout request created for $${result.total_amount?.toFixed(2)} (${result.entry_count} shifts).` };
  };

  return {
    entries, payoutRequests, loading, eligibleEntries, pendingPayoutEntries,
    clearedEntries, hasOpenRequest, paidThisMonth, paidYTD,
    getDisabledReason, requestPayout, refetch: fetchData,
  };
};

// Admin hook for all payout requests
export const useAdminPayoutRequests = () => {
  const [requests, setRequests] = useState<(PayoutRequest & { psw_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payout_requests")
      .select("*")
      .order("requested_at", { ascending: false });

    if (data) {
      // Enrich with PSW names
      const pswIds = [...new Set(data.map((r: any) => r.psw_id))];
      const { data: profiles } = await supabase
        .from("psw_profiles")
        .select("id, first_name, last_name")
        .in("id", pswIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = `${p.first_name} ${p.last_name}`; });

      setRequests(data.map((r: any) => ({ ...r, psw_name: nameMap[r.psw_id] || "Unknown" })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const approve = async (id: string) => {
    await supabase.rpc("admin_approve_payout", { p_request_id: id });
    await fetchData();
  };
  const markPayoutReady = async (id: string) => {
    await supabase.rpc("admin_payout_ready", { p_request_id: id });
    await fetchData();
  };
  const markCleared = async (id: string) => {
    await supabase.rpc("admin_clear_payout", { p_request_id: id });
    await fetchData();
  };
  const reject = async (id: string, notes: string) => {
    await supabase.rpc("admin_reject_payout", { p_request_id: id, p_notes: notes });
    await fetchData();
  };

  const getEntriesForRequest = async (requestId: string): Promise<PayrollEntryRow[]> => {
    const { data } = await supabase
      .from("payroll_entries")
      .select("*")
      .eq("payout_request_id", requestId);
    return (data || []) as PayrollEntryRow[];
  };

  const getBankingLast4 = async (pswId: string): Promise<string | null> => {
    const { data } = await supabase
      .from("psw_banking")
      .select("last4")
      .eq("psw_id", pswId)
      .maybeSingle();
    return data?.last4 || null;
  };

  const getBankingForCPA = async (pswId: string) => {
    const { data, error } = await supabase.rpc("get_psw_banking_for_cpa", { p_psw_id: pswId });
    if (error) throw error;
    return data?.[0] || null;
  };

  return {
    requests, loading, approve, markPayoutReady, markCleared, reject,
    getEntriesForRequest, getBankingLast4, getBankingForCPA, refetch: fetchData,
  };
};
