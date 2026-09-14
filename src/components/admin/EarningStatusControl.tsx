// Administrator control for a provider earning's manual-payment lifecycle,
// plus the immutable history of who changed what and when.
//
// The app never sends money. Marking an earning "Paid manually" only records
// a payment the office has already issued outside the app.

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PROVIDER_EARNING_STATUSES,
  MANUAL_PAYOUT_NOTICE,
  type ProviderEarningStatus,
} from "@/lib/manualPayoutPolicy";

const LABELS: Record<string, string> = {
  pending_shift_completion: "Pending shift completion",
  pending_care_sheet: "Pending care sheet",
  pending_office_review: "Pending office review",
  approved_for_manual_payment: "Approved for manual payment",
  disputed: "Disputed",
  paid_manually: "Paid manually",
  voided: "Voided",
};

type AdminRpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: { ok?: boolean; message?: string } | null; error: { message: string } | null }>;

interface AuditRow {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export const EarningStatusControl = ({
  payrollEntryId,
  currentStatus,
  onChanged,
}: {
  payrollEntryId: string;
  currentStatus: string | null;
  onChanged?: () => void;
}) => {
  const [status, setStatus] = useState<string>(currentStatus ?? "pending_office_review");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<AuditRow[]>([]);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("provider_earning_status_audit")
      .select("id, old_status, new_status, changed_by, note, created_at")
      .eq("payroll_entry_id", payrollEntryId)
      .order("created_at", { ascending: false });
    setHistory((data ?? []) as unknown as AuditRow[]);
  }, [payrollEntryId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const apply = async () => {
    setSaving(true);
    const { data, error } = await (supabase.rpc as unknown as AdminRpc)("admin_set_earning_status", {
      p_entry_id: payrollEntryId,
      p_status: status,
      p_note: note || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    if (data && data.ok === false) { toast.error(data.message || "That status change was not allowed."); return; }
    toast.success(`Earning marked "${LABELS[status] ?? status}".`);
    setNote("");
    loadHistory();
    onChanged?.();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Earning status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{MANUAL_PAYOUT_NOTICE}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{LABELS[currentStatus ?? ""] ?? currentStatus ?? "—"}</Badge>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROVIDER_EARNING_STATUSES.map((s: ProviderEarningStatus) => (
                <SelectItem key={s} value={s}>{LABELS[s] ?? s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={apply} disabled={saving || status === currentStatus}>
            {saving ? "Saving..." : "Update status"}
          </Button>
        </div>

        <Textarea
          rows={2}
          placeholder="Note for the record (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <History className="w-3 h-3" /> History
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No status changes recorded yet.</p>
          ) : (
            <ul className="space-y-1">
              {history.map((h) => (
                <li key={h.id} className="text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleString()} — {LABELS[h.old_status ?? ""] ?? h.old_status ?? "new"} →{" "}
                  <span className="text-foreground">{LABELS[h.new_status] ?? h.new_status}</span>
                  {h.changed_by ? ` by ${h.changed_by}` : ""}
                  {h.note ? ` · ${h.note}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
