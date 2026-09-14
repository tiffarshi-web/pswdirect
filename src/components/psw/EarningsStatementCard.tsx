// Caregiver earnings statement download (Phase 5).
// Statements show earnings and recorded office payments only — never client
// health information, care instructions, addresses or photographs.

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  buildStatementCsv, downloadStatementPdf, downloadTextFile,
  STATEMENT_DISCLAIMER, type StatementRow,
} from "@/lib/earningsStatements";

const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

export const EarningsStatementCard = ({
  providerName,
  providerIdentifier,
}: { providerName: string; providerIdentifier: string }) => {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const fetchRows = async (): Promise<StatementRow[] | null> => {
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string, args: Record<string, unknown>,
    ) => Promise<{ data: StatementRow[] | null; error: { message: string } | null }>)(
      "psw_earnings_statement", { p_from: from, p_to: to },
    );
    if (error) { toast.error(error.message); return null; }
    if (!data || data.length === 0) { toast.error("No visits in that date range."); return null; }
    return data;
  };

  const meta = {
    providerName,
    providerIdentifier,
    periodStart: from,
    periodEnd: to,
  };

  const handleCsv = async () => {
    setBusy(true);
    const rows = await fetchRows();
    if (rows) downloadTextFile(`psw-direct-statement-${from}-${to}.csv`, buildStatementCsv(rows, meta));
    setBusy(false);
  };

  const handlePdf = async () => {
    setBusy(true);
    const rows = await fetchRows();
    if (rows) await downloadStatementPdf(rows, meta);
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Earnings statement</CardTitle>
        <CardDescription>Download a record of your visits, earnings and recorded payments.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePdf} disabled={busy}>
            <FileDown className="w-3.5 h-3.5 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handleCsv} disabled={busy}>
            <FileDown className="w-3.5 h-3.5 mr-1" /> CSV
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">{STATEMENT_DISCLAIMER}</p>
      </CardContent>
    </Card>
  );
};
