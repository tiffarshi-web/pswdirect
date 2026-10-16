import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldAlert, CheckCircle2, XCircle, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChecklistRow {
  id: string;
  province_code: string;
  item_key: string;
  item_label: string;
  is_required: boolean;
  is_complete: boolean;
  approval_notice: string;
  completed_by: string | null;
  completed_at: string | null;
  evidence: string | null;
  notes: string | null;
  sort_order: number;
}

interface EvidenceRow {
  item_key: string;
  auto_ok: boolean | null;
  detail: string;
}

interface Props {
  provinceCode?: string;
}

/**
 * Administrator-only activation readiness checklist. Each item shows its live
 * evidence. Items that can be checked automatically (documents, rates, tax,
 * prices, verified providers, tests) cannot be ticked until the evidence
 * passes; every tick needs a written evidence note. Enforced in the database.
 */
export const ProvinceReadinessChecklist = ({ provinceCode = "AB" }: Props) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<ChecklistRow[]>([]);
  const [evidence, setEvidence] = useState<Record<string, EvidenceRow>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, ev] = await Promise.all([
      (supabase as any)
        .from("province_activation_checklist")
        .select("*")
        .eq("province_code", provinceCode)
        .order("sort_order", { ascending: true }),
      (supabase as any).rpc("province_readiness_evidence", { p_code: provinceCode }),
    ]);
    if (list.error) {
      toast({ title: "Could not load the checklist", description: list.error.message, variant: "destructive" });
    }
    setRows((list.data as ChecklistRow[]) || []);
    const map: Record<string, EvidenceRow> = {};
    ((ev.data as EvidenceRow[]) || []).forEach((e) => { map[e.item_key] = e; });
    setEvidence(map);
    setLoading(false);
  }, [provinceCode, toast]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (row: ChecklistRow, next: boolean) => {
    const note = (notes[row.id] || "").trim();
    if (next && !note) {
      toast({ title: "Evidence needed", description: "Write what was checked and by whom before ticking this item.", variant: "destructive" });
      return;
    }
    setSaving(row.id);
    const { error } = await (supabase as any)
      .from("province_activation_checklist")
      .update(next ? { is_complete: true, evidence: note } : { is_complete: false, evidence: null, completed_by: null, completed_at: null })
      .eq("id", row.id);
    setSaving(null);
    if (error) {
      toast({
        title: "Not saved",
        description: error.message.includes("checklist_evidence_missing")
          ? error.message.replace(/^.*checklist_evidence_missing:\s*/, "Evidence not met: ")
          : error.message,
        variant: "destructive",
      });
      return;
    }
    load();
  };

  const isReady = (r: ChecklistRow) =>
    r.is_complete && !!r.evidence?.trim() && evidence[r.item_key]?.auto_ok !== false;
  const outstanding = rows.filter((r) => r.is_required && !isReady(r)).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{provinceCode} activation readiness</CardTitle>
            <CardDescription>
              Booking and payment stay locked until every required item is complete with evidence.
            </CardDescription>
          </div>
          <Badge variant={outstanding === 0 && rows.length > 0 ? "default" : "outline"}>
            {outstanding === 0 && rows.length > 0 ? "All items complete" : `${outstanding} outstanding`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Requires Alberta legal and operational approval before activation.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading checklist...
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const ev = evidence[row.item_key];
              return (
                <li key={row.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <Checkbox
                    checked={row.is_complete}
                    disabled={saving === row.id || (!row.is_complete && ev?.auto_ok === false)}
                    onCheckedChange={(v) => toggle(row, v === true)}
                    aria-label={row.item_label}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">{row.item_label}</p>
                    {ev && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        {ev.auto_ok === true && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                        {ev.auto_ok === false && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                        {ev.auto_ok === null && <UserCheck className="h-3.5 w-3.5" />}
                        {ev.detail}
                      </p>
                    )}
                    {row.is_complete ? (
                      <p className="text-xs text-muted-foreground">
                        Completed by {row.completed_by || "unknown"} — {row.evidence}
                      </p>
                    ) : (
                      ev?.auto_ok !== false && (
                        <Textarea
                          rows={2}
                          placeholder="Evidence: what was checked, document or approval reference"
                          value={notes[row.id] || ""}
                          onChange={(e) => setNotes((p) => ({ ...p, [row.id]: e.target.value }))}
                        />
                      )
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
