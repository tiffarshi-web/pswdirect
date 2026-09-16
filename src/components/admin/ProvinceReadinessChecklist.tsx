import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert } from "lucide-react";
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
  sort_order: number;
}

interface Props {
  provinceCode?: string;
}

/**
 * Administrator-only activation readiness checklist. Booking and payment for a
 * prepared province stay locked until every required item is complete and an
 * authorised administrator runs the existing audited activation process.
 */
export const ProvinceReadinessChecklist = ({ provinceCode = "AB" }: Props) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<ChecklistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("province_activation_checklist")
      .select("*")
      .eq("province_code", provinceCode)
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ title: "Could not load the checklist", description: error.message, variant: "destructive" });
    }
    setRows((data as ChecklistRow[]) || []);
    setLoading(false);
  }, [provinceCode, toast]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (row: ChecklistRow, next: boolean) => {
    setSaving(row.id);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("province_activation_checklist")
      .update({
        is_complete: next,
        completed_by: next ? (userRes?.user?.email || userRes?.user?.id || "admin") : null,
        completed_at: next ? new Date().toISOString() : null,
      })
      .eq("id", row.id);
    setSaving(null);
    if (error) {
      toast({ title: "Not saved", description: error.message, variant: "destructive" });
      return;
    }
    setRows(prev => prev.map(r => (r.id === row.id ? { ...r, is_complete: next } : r)));
  };

  const outstanding = rows.filter(r => r.is_required && !r.is_complete).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{provinceCode} activation readiness</CardTitle>
            <CardDescription>
              Booking and payment stay locked until every required item is complete.
            </CardDescription>
          </div>
          <Badge variant={outstanding === 0 ? "default" : "outline"}>
            {outstanding === 0 ? "All items complete" : `${outstanding} outstanding`}
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
            {rows.map(row => (
              <li key={row.id} className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={row.is_complete}
                  disabled={saving === row.id}
                  onCheckedChange={(v) => toggle(row, v === true)}
                  aria-label={row.item_label}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{row.item_label}</p>
                  {!row.is_complete && (
                    <p className="text-xs text-muted-foreground">{row.approval_notice}</p>
                  )}
                  {row.is_complete && row.completed_by && (
                    <p className="text-xs text-muted-foreground">Completed by {row.completed_by}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
