// Office view of provider earnings and their manual-payment status.
// Money is always issued outside the app; this only records where each
// earning stands and keeps a permanent history of every change.

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { EarningStatusControl } from "./EarningStatusControl";
import { MANUAL_PAYOUT_NOTICE } from "@/lib/manualPayoutPolicy";

interface Row {
  id: string;
  psw_name: string | null;
  scheduled_date: string | null;
  hours_worked: number | null;
  total_owed: number | null;
  earning_status: string | null;
  booking_code?: string | null;
}

export const EarningStatusSection = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payroll_entries")
      .select("id, psw_name, scheduled_date, hours_worked, total_owed, earning_status")
      .order("scheduled_date", { ascending: false })
      .limit(150);
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) =>
    !search ||
    (r.psw_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (r.earning_status ?? "").includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Provider earning statuses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{MANUAL_PAYOUT_NOTICE}</p>
          <Input
            placeholder="Search by caregiver or status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading earnings...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No earnings found.</p>
      ) : (
        filtered.slice(0, 40).map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                {r.psw_name || "Caregiver"}
                <span className="text-muted-foreground font-normal">{r.scheduled_date}</span>
                <Badge variant="outline">{Number(r.hours_worked ?? 0).toFixed(1)}h</Badge>
                <Badge variant="secondary">${Number(r.total_owed ?? 0).toFixed(2)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EarningStatusControl
                payrollEntryId={r.id}
                currentStatus={r.earning_status}
                onChanged={load}
              />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
