import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2, BellRing, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface ReadinessRow { reason: string; psw_count: number }
interface BroadcastRow {
  booking_code: string;
  dispatched_at: string;
  targeted_count: number;
  channels: string[] | null;
  push_attempted: number;
  push_succeeded: number;
  push_failed: number;
}

const REASON_LABEL: Record<string, string> = {
  alert_ready: "Receiving job alerts",
  police_check_expired: "Police Check expired",
  not_approved: "Not approved",
  no_home_coordinates: "No home location on file",
  lifecycle_archived: "Archived",
  lifecycle_banned: "Banned",
  lifecycle_deactivated: "Deactivated",
};

export const JobNotificationHealth = () => {
  const [readiness, setReadiness] = useState<ReadinessRow[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, b] = await Promise.all([
      supabase.rpc("admin_psw_readiness_summary"),
      supabase.rpc("admin_broadcast_health", { p_limit: 25 }),
    ]);
    if (!r.error && Array.isArray(r.data)) setReadiness(r.data as unknown as ReadinessRow[]);
    if (!b.error && Array.isArray(b.data)) setBroadcasts(b.data as unknown as BroadcastRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const ready = readiness.find((r) => r.reason === "alert_ready")?.psw_count ?? 0;
  const blocked = readiness.filter((r) => r.reason !== "alert_ready");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BellRing className="w-4 h-4" />
          Job Notification Health
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Caregiver alert readiness</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm">
              {ready} receiving job alerts
            </Badge>
            {blocked.map((r) => (
              <Badge key={r.reason} variant="destructive" className="text-sm">
                {r.psw_count} · {REASON_LABEL[r.reason] ?? r.reason}
              </Badge>
            ))}
            {blocked.length === 0 && !loading && (
              <span className="text-sm text-muted-foreground">No blocked caregivers.</span>
            )}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Recent broadcasts</p>
          <div className="border rounded-lg divide-y">
            {broadcasts.length === 0 && (
              <p className="text-sm text-muted-foreground p-3">No broadcasts recorded yet.</p>
            )}
            {broadcasts.map((b, i) => {
              const failing = b.targeted_count > 0 && b.push_succeeded === 0;
              return (
                <div key={`${b.booking_code}-${i}`} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.booking_code}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.dispatched_at).toLocaleString("en-CA", {
                        timeZone: "America/Toronto",
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                      {b.channels?.length ? ` · ${b.channels.join(", ")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline">{b.targeted_count} targeted</Badge>
                    <Badge variant={failing ? "destructive" : "secondary"}>
                      {failing && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {b.push_succeeded}/{b.push_attempted} push
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
