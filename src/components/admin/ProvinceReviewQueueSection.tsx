import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPinOff, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReviewRow {
  id: string;
  record_table: string;
  record_id: string;
  record_label: string | null;
  reason: string;
  status: string;
  created_at: string;
}

/**
 * Addresses whose province could not be established. Nothing is guessed —
 * these orders and profiles wait here for the office. Only a short label is
 * shown, never the full address.
 */
export const ProvinceReviewQueueSection = () => {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc("admin_province_review_queue");
    setRows(((data as ReviewRow[]) || []).filter((r) => r.status === "pending"));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPinOff className="h-4 w-4" />
              Province review
              <Badge variant={rows.length ? "destructive" : "secondary"}>{rows.length}</Badge>
            </CardTitle>
            <CardDescription>
              Addresses we could not place in a province. These never reach payment.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{r.record_label || r.record_table}</p>
                <p className="text-muted-foreground">{r.reason}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {new Date(r.created_at).toLocaleString("en-CA")}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
