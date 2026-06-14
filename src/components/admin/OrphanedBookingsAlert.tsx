// Orphaned Bookings Alert
// Flags any booking whose state falls outside the canonical lifecycle:
//   New / Open / Assigned / In Progress / Completed / Cancelled / Unserved
//
// Specifically detects bookings stuck at status='archived' that were never
// completed and never cancelled — the failure mode that hid Brian Lynch's
// CDT-000165 from operations.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface OrphanRow {
  id: string;
  booking_code: string;
  client_name: string | null;
  scheduled_date: string;
  payment_status: string | null;
}

export const OrphanedBookingsAlert = () => {
  const [orphans, setOrphans] = useState<OrphanRow[]>([]);
  const [restoring, setRestoring] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, booking_code, client_name, scheduled_date, payment_status, status, signed_out_at, cancelled_at, checked_in_at")
      .eq("status", "archived")
      .is("signed_out_at", null)
      .is("cancelled_at", null)
      .is("checked_in_at", null)
      .in("payment_status", ["paid", "invoice-pending", "overtime_adjusted"])
      .order("scheduled_date", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[OrphanedBookingsAlert] load error", error);
      return;
    }
    setOrphans((data || []) as OrphanRow[]);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  if (orphans.length === 0) return null;

  const restoreAll = async () => {
    setRestoring(true);
    const ids = orphans.map((o) => o.id);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "pending" })
      .in("id", ids);
    setRestoring(false);
    if (error) {
      toast.error("Failed to restore orphaned bookings");
      return;
    }
    toast.success(`Restored ${ids.length} orphaned booking${ids.length === 1 ? "" : "s"}`);
    await load();
  };

  return (
    <Alert variant="destructive" className="border-2">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="font-bold">
        {orphans.length} orphaned booking{orphans.length === 1 ? "" : "s"} hidden from the pipeline
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-sm">
          These orders are paid (or pending invoice) but stuck at <code>status=archived</code> with no check-in, sign-out, or cancellation — they are invisible to operations and should appear under <strong>Unserved</strong>.
        </p>
        <ul className="text-xs font-mono max-h-32 overflow-auto bg-background/40 rounded p-2">
          {orphans.slice(0, 10).map((o) => (
            <li key={o.id}>
              {o.booking_code} — {o.client_name ?? "—"} — {o.scheduled_date} — {o.payment_status}
            </li>
          ))}
          {orphans.length > 10 && <li>… and {orphans.length - 10} more</li>}
        </ul>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="secondary" onClick={restoreAll} disabled={restoring}>
            <RefreshCw className={`w-3 h-3 mr-2 ${restoring ? "animate-spin" : ""}`} />
            Restore to Unserved
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={restoring}>
            Recheck
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default OrphanedBookingsAlert;
