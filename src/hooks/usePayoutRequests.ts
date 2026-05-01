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
    cutoff.setDate(cutoff.getDate() - 14);
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
    if (eligibleEntries.length === 0) return "You can request payout after 14 days of completed work.";
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

export type PaymentState = "unpaid" | "partial" | "paid";

export interface AdminPayoutRequest extends PayoutRequest {
  psw_name?: string;
  amount_paid: number;
  outstanding_balance: number;
  payment_state: PaymentState;
  psw_total_earned?: number;
  psw_total_paid?: number;
  psw_total_outstanding?: number;
}

// Admin hook for all payout requests
export const useAdminPayoutRequests = () => {
  const [requests, setRequests] = useState<AdminPayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payout_requests")
      .select("*")
      .order("requested_at", { ascending: false });

    if (data) {
      const pswIds = [...new Set(data.map((r: any) => r.psw_id))];

      // Enrich with PSW names + per-entry amounts in parallel
      const [profilesRes, entriesRes, linksRes] = await Promise.all([
        supabase.from("psw_profiles").select("id, first_name, last_name").in("id", pswIds),
        supabase.from("payroll_entries").select("id, psw_id, payout_request_id, total_owed").in("psw_id", pswIds as string[]),
        supabase.from("payout_entry_links").select("payroll_entry_id, amount_applied, payout_id, payouts!inner(voided_at)"),
      ]);

      const nameMap: Record<string, string> = {};
      profilesRes.data?.forEach((p: any) => { nameMap[p.id] = `${p.first_name} ${p.last_name}`; });

      // amount paid per payroll entry (excl voided payouts)
      const paidPerEntry: Record<string, number> = {};
      (linksRes.data || []).forEach((l: any) => {
        if (l.payouts?.voided_at) return;
        paidPerEntry[l.payroll_entry_id] = (paidPerEntry[l.payroll_entry_id] || 0) + Number(l.amount_applied || 0);
      });

      // group entries by request and by psw
      const entriesByRequest: Record<string, { total: number; paid: number }> = {};
      const totalsByPsw: Record<string, { earned: number; paid: number }> = {};
      (entriesRes.data || []).forEach((e: any) => {
        const owed = Number(e.total_owed || 0);
        const paid = Math.min(paidPerEntry[e.id] || 0, owed);
        if (!totalsByPsw[e.psw_id]) totalsByPsw[e.psw_id] = { earned: 0, paid: 0 };
        totalsByPsw[e.psw_id].earned += owed;
        totalsByPsw[e.psw_id].paid += paid;
        if (e.payout_request_id) {
          if (!entriesByRequest[e.payout_request_id]) entriesByRequest[e.payout_request_id] = { total: 0, paid: 0 };
          entriesByRequest[e.payout_request_id].total += owed;
          entriesByRequest[e.payout_request_id].paid += paid;
        }
      });

      const enriched: AdminPayoutRequest[] = data.map((r: any) => {
        const agg = entriesByRequest[r.id] || { total: Number(r.total_amount || 0), paid: 0 };
        const total = agg.total || Number(r.total_amount || 0);
        const paid = Math.min(agg.paid, total);
        const outstanding = Math.max(total - paid, 0);
        let state: PaymentState = "unpaid";
        if (paid > 0 && outstanding <= 0.009) state = "paid";
        else if (paid > 0) state = "partial";
        const pswTotals = totalsByPsw[r.psw_id] || { earned: 0, paid: 0 };
        return {
          ...r,
          psw_name: nameMap[r.psw_id] || "Unknown",
          amount_paid: paid,
          outstanding_balance: outstanding,
          payment_state: state,
          psw_total_earned: pswTotals.earned,
          psw_total_paid: pswTotals.paid,
          psw_total_outstanding: Math.max(pswTotals.earned - pswTotals.paid, 0),
        };
      });
      setRequests(enriched);
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
