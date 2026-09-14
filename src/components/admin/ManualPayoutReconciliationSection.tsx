// Manual payout reconciliation (Phase 5).
// Flags mismatches between recorded provider earnings and recorded manual
// payments. Nothing is repaired automatically — every item needs office review.

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MANUAL_PAYOUT_NOTICE } from "@/lib/manualPayoutPolicy";
import { toCsv, downloadTextFile } from "@/lib/earningsStatements";

interface Issue {
  issue_type: string;
  severity: string;
  reference: string;
  detail: string;
  amount: number | null;
}

const LABEL: Record<string, string> = {
  paid_without_payout: "Paid earning with no payment record",
  payout_without_earnings: "Payment with no linked earnings",
  amount_mismatch: "Payment does not match linked earnings",
  duplicate_link: "Earning linked twice to one payment",
  incomplete_payment_record: "Payment record missing required details",
  invalid_earning_linked: "Voided or disputed earning linked to a payment",
  provider_mismatch: "Payment recorded for the wrong provider",
  orphan_correction: "Correction without an original payment",
};

export const ManualPayoutReconciliationSection = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
    ) => Promise<{ data: Issue[] | null; error: { message: string } | null }>)(
      "admin_manual_payout_reconciliation",
    );
    if (error) toast.error(error.message);
    setIssues(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    downloadTextFile(
      `psw-direct-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(["Issue", "Severity", "Reference", "Detail", "Amount"],
        issues.map((i) => [LABEL[i.issue_type] ?? i.issue_type, i.severity, i.reference, i.detail, i.amount])),
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Manual payment reconciliation
          </CardTitle>
          <CardDescription>{MANUAL_PAYOUT_NOTICE} Discrepancies are never repaired automatically.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-check
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={issues.length === 0}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Checking records…</p>
          ) : issues.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Earnings and recorded payments reconcile. No discrepancies found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">Issue</TableHead>
                  <TableHead className="text-xs">Severity</TableHead>
                  <TableHead className="text-xs">Reference</TableHead>
                  <TableHead className="text-xs">Detail</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {issues.map((i, idx) => (
                    <TableRow key={`${i.issue_type}-${i.reference}-${idx}`}>
                      <TableCell className="text-xs font-medium">{LABEL[i.issue_type] ?? i.issue_type}</TableCell>
                      <TableCell>
                        <Badge variant={i.severity === "high" ? "destructive" : "secondary"} className="text-[10px]">
                          {i.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono">{i.reference}</TableCell>
                      <TableCell className="text-xs">{i.detail}</TableCell>
                      <TableCell className="text-xs text-right">
                        {i.amount == null ? "—" : `$${Number(i.amount).toFixed(2)}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
