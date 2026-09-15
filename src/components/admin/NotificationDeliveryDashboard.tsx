import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2, Inbox, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

/**
 * Office-only view of what the platform tried to send and what came back.
 *
 * Recipient addresses are masked by the server and device tokens are never
 * returned at all — only the last few characters live in the delivery record.
 * "Accepted by service" means the push service took the message; it is NOT
 * proof the handset displayed it.
 */

interface Row {
  event_type: string;
  booking_code: string | null;
  recipient_masked: string | null;
  channel: string | null;
  created_at: string;
  sent_at: string | null;
  opened_at: string | null;
  delivery_status: string | null;
  failure_category: string | null;
  retry_count: number | null;
  platform: string | null;
  app_version: string | null;
  still_actionable: boolean | null;
}

interface GapRow {
  psw_number: string | null;
  first_name: string | null;
  recipient_masked: string | null;
  active_devices: number;
  last_seen_at: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  pending: "Queued",
  sending: "Sending",
  sent: "Sent",
  service_accepted: "Accepted by service",
  delivered: "Delivered to device",
  opened: "Opened",
  failed_temporary: "Failed — will retry",
  failed_permanent: "Failed — no retry",
  token_invalid: "Device no longer valid",
  permission_denied: "Notifications turned off",
  skipped_ineligible: "Skipped — not eligible",
  cancelled: "Cancelled",
  expired: "Expired",
};

const isBad = (s: string | null) =>
  !!s && ["failed_temporary", "failed_permanent", "token_invalid", "permission_denied"].includes(s);

const fmt = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("en-CA", {
        timeZone: "America/Toronto",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

export const NotificationDeliveryDashboard = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [gaps, setGaps] = useState<GapRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, g] = await Promise.all([
      supabase.rpc("admin_notification_dashboard", { p_limit: 100 }),
      supabase.rpc("admin_notification_channel_gaps"),
    ]);
    if (!d.error && Array.isArray(d.data)) setRows(d.data as unknown as Row[]);
    if (!g.error && Array.isArray(g.data)) setGaps(g.data as unknown as GapRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Inbox className="w-4 h-4" />
          Notification Delivery
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {gaps.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <PhoneOff className="w-4 h-4" />
              {gaps.length} approved caregiver{gaps.length === 1 ? "" : "s"} with no working alert channel
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {gaps.slice(0, 20).map((g, i) => (
                <Badge key={`${g.psw_number}-${i}`} variant="outline" className="text-xs">
                  {g.psw_number || g.first_name || g.recipient_masked || "unknown"}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="border rounded-lg divide-y max-h-[520px] overflow-auto">
          {rows.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground p-3">No notification activity recorded yet.</p>
          )}
          {rows.map((r, i) => (
            <div key={`${r.event_type}-${r.created_at}-${i}`} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {r.event_type}
                  {r.booking_code ? ` · ${r.booking_code}` : ""}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {r.recipient_masked || "—"} · {r.channel || "—"}
                  {r.platform ? ` · ${r.platform}` : ""}
                  {r.app_version ? ` v${r.app_version}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created {fmt(r.created_at)} · Sent {fmt(r.sent_at)} · Opened {fmt(r.opened_at)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant={isBad(r.delivery_status) ? "destructive" : "secondary"}>
                  {STATUS_LABEL[r.delivery_status ?? ""] ?? r.delivery_status ?? "unknown"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {r.retry_count ? `${r.retry_count} attempt${r.retry_count === 1 ? "" : "s"}` : "1 attempt"}
                  {r.failure_category ? ` · ${r.failure_category}` : ""}
                </span>
                {r.still_actionable && (
                  <span className="text-xs text-primary">Job still open</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
