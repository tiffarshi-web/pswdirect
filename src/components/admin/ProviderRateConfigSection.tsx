// Approved caregiver pay rates, one per province + provider type.
//
// This is the ONLY place an approved provider rate can be set. The value is
// stored in the backend approved-rate table, locked onto every new booking and
// used by payroll. A province/provider type with no configured rate shows
// "Earnings amount pending verification" everywhere — an amount is never
// guessed.

import { useCallback, useEffect, useState } from "react";
import { DollarSign, Loader2, Lock, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EARNINGS_UNAVAILABLE } from "@/lib/pswPay";

interface RateRow {
  id: string;
  province: string;
  provider_type: string;
  rate_cents: number | null;
  is_active: boolean;
  notes: string | null;
}

const PROVINCE_LABEL: Record<string, string> = { ON: "Ontario", AB: "Alberta" };
const TYPE_LABEL: Record<string, string> = {
  psw: "Personal Support Worker",
  rpn: "Registered Practical Nurse",
  rn: "Registered Nurse",
  hca: "Health Care Aide",
  lpn: "Licensed Practical Nurse",
};

export const ProviderRateConfigSection = () => {
  const [rows, setRows] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("provider_earning_rates")
      .select("id, province, provider_type, rate_cents, is_active, notes")
      .order("province", { ascending: true })
      .order("provider_type", { ascending: true });
    if (error) {
      toast.error("Could not load approved rates");
    }
    const list = (data as RateRow[]) || [];
    setRows(list);
    setDrafts(
      Object.fromEntries(
        list.map((r) => [r.id, r.rate_cents ? (r.rate_cents / 100).toFixed(2) : ""]),
      ),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (row: RateRow) => {
    const raw = (drafts[row.id] ?? "").trim();
    const reason = (reasons[row.id] ?? "").trim();
    if (!reason) {
      toast.error("A reason is required — it is kept in the province history.");
      return;
    }
    let cents: number | null = null;
    if (raw !== "") {
      const dollars = Number(raw);
      if (!Number.isFinite(dollars) || dollars < 1 || dollars > 200) {
        toast.error("Enter an hourly amount between $1.00 and $200.00, or leave it blank.");
        return;
      }
      cents = Math.round(dollars * 100);
    }

    setSaving(row.id);
    const { error } = await (supabase as any).rpc("admin_set_provider_earning_rate", {
      p_province: row.province,
      p_provider_type: row.provider_type,
      p_rate_cents: cents,
      p_reason: reason,
    });
    setSaving(null);

    if (error) {
      toast.error(
        error.message?.includes("not_authorized")
          ? "Only an administrator can change approved rates."
          : "Rate not saved. Please try again.",
      );
      return;
    }
    toast.success(
      cents === null
        ? `${PROVINCE_LABEL[row.province] ?? row.province} ${row.provider_type.toUpperCase()} set back to pending verification.`
        : `${PROVINCE_LABEL[row.province] ?? row.province} ${row.provider_type.toUpperCase()} approved at $${(cents / 100).toFixed(2)}/hour.`,
    );
    setReasons((prev) => ({ ...prev, [row.id]: "" }));
    load();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Approved caregiver pay rates
        </CardTitle>
        <CardDescription>
          One approved hourly rate per province and provider type. Pay is always the hours the
          client requested × this rate — clocked time, travel, tips, taxes and the client price
          never change it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
          <Lock className="w-4 h-4 mt-0.5 text-amber-700 dark:text-amber-300" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            New rates apply to orders created afterwards. Completed shifts, existing payroll and
            recorded payments keep their original amount. Leave an amount blank to put that
            provider type back to “{EARNINGS_UNAVAILABLE}”.
          </p>
        </div>

        {rows.map((row) => (
          <div key={row.id} className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">
                  {PROVINCE_LABEL[row.province] ?? row.province} —{" "}
                  {TYPE_LABEL[row.provider_type] ?? row.provider_type.toUpperCase()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {row.rate_cents && row.is_active
                    ? `Approved at $${(row.rate_cents / 100).toFixed(2)} per requested hour`
                    : EARNINGS_UNAVAILABLE}
                </p>
              </div>
              <Badge variant={row.rate_cents && row.is_active ? "default" : "outline"}>
                {row.rate_cents && row.is_active ? "Approved" : "Pending verification"}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-[10rem_1fr_auto] items-end">
              <div>
                <Label className="text-xs text-muted-foreground">Hourly rate</Label>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    step={0.25}
                    placeholder="blank = pending"
                    value={drafts[row.id] ?? ""}
                    onChange={(e) => setDrafts((p) => ({ ...p, [row.id]: e.target.value }))}
                    className="text-right font-medium"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Reason (kept in history)</Label>
                <Input
                  className="mt-1"
                  value={reasons[row.id] ?? ""}
                  onChange={(e) => setReasons((p) => ({ ...p, [row.id]: e.target.value }))}
                  placeholder="e.g. Alberta Health Care Aide rate approved by owner"
                />
              </div>
              <Button
                variant="brand"
                onClick={() => save(row)}
                disabled={saving === row.id || !(reasons[row.id] ?? "").trim()}
              >
                {saving === row.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
