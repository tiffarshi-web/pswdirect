import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { clearProvinceCache } from "@/lib/provinceConfig";
import { ProvinceActivationCard } from "./ProvinceActivationCard";
import { ProvinceReviewQueueSection } from "./ProvinceReviewQueueSection";

interface ProvinceRow {
  code: string;
  name: string;
  is_active: boolean;
  bookings_enabled: boolean;
  recruitment_enabled: boolean;
  payments_enabled: boolean;
  launch_status: string;
  timezone: string | null;
  currency: string | null;
  provider_type: string;
  provider_term_long: string;
  provider_term_short: string;
  registration_required: boolean;
  registration_label: string | null;
  cities: string[] | null;
  policy_version: string;
  agreement_version: string | null;
  privacy_policy_version: string | null;
  required_documents: string[] | null;
}

interface PricingRow {
  id: string;
  province: string;
  city_or_zone: string | null;
  service_id: string;
  client_hourly_price: number;
  provider_hourly_payout: number;
  minimum_booking_hours: number;
  weekend_premium: number;
  holiday_premium: number;
  travel_charge: number;
  active: boolean;
}

/**
 * Provincial settings — administrators activate or pause a province, manage
 * cities, worker terminology, policy versions, required documents, and the
 * provincial price/payout table. "Enable Alberta Live Bookings" is the
 * separate switch that unlocks client payment in Alberta.
 */
export const ProvincialSettingsSection = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<ProvinceRow[]>([]);
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [canActivate, setCanActivate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: pr }, { data: pc }, { data: allowed }] = await Promise.all([
      supabase.from("provinces").select("*").order("name"),
      supabase.from("provincial_pricing").select("*").order("province").order("service_id"),
      supabase.rpc("can_activate_province"),
    ]);
    setRows((pr as ProvinceRow[]) || []);
    setPricing((pc as PricingRow[]) || []);
    setCanActivate(allowed === true);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (code: string, changes: Partial<ProvinceRow>) =>
    setRows((prev) => prev.map((r) => (r.code === code ? { ...r, ...changes } : r)));

  // Activation (recruitment / bookings / payment) is never saved here — it
  // goes through the guarded, audited activation RPC instead.
  const saveProvince = async (row: ProvinceRow) => {
    setSavingCode(row.code);
    const { error } = await supabase
      .from("provinces")
      .update({
        name: row.name,
        provider_type: row.provider_type,
        provider_term_long: row.provider_term_long,
        provider_term_short: row.provider_term_short,
        registration_required: row.registration_required,
        registration_label: row.registration_label,
        cities: row.cities || [],
        policy_version: row.policy_version,
        agreement_version: row.agreement_version,
        privacy_policy_version: row.privacy_policy_version,
        required_documents: row.required_documents || [],
      })
      .eq("code", row.code);
    setSavingCode(null);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    clearProvinceCache();
    toast({ title: `${row.name} settings saved` });
  };

  const savePricing = async (p: PricingRow) => {
    const { error } = await supabase
      .from("provincial_pricing")
      .update({
        client_hourly_price: p.client_hourly_price,
        provider_hourly_payout: p.provider_hourly_payout,
        minimum_booking_hours: p.minimum_booking_hours,
        weekend_premium: p.weekend_premium,
        holiday_premium: p.holiday_premium,
        travel_charge: p.travel_charge,
        active: p.active,
      })
      .eq("id", p.id);
    if (error) {
      toast({ title: "Could not save price", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Pricing saved" });
  };

  const patchPricing = (id: string, changes: Partial<PricingRow>) =>
    setPricing((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading provincial settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProvinceReviewQueueSection />
      {rows.map((row) => (
        <Card key={row.code}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {row.name}
                  <Badge variant={row.bookings_enabled ? "default" : "secondary"}>
                    {row.bookings_enabled ? "Bookings live" : "Coming soon"}
                  </Badge>
                  {!row.is_active && <Badge variant="outline">Paused</Badge>}
                </CardTitle>
                <CardDescription>
                  Workers are shown as {row.provider_term_long} ({row.provider_term_short}).
                  {row.timezone ? ` · ${row.timezone}` : ""}
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => saveProvince(row)} disabled={savingCode === row.code}>
                {savingCode === row.code ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProvinceActivationCard
              province={{
                code: row.code,
                name: row.name,
                recruitment_enabled: row.recruitment_enabled,
                bookings_enabled: row.bookings_enabled,
                payments_enabled: row.payments_enabled,
                launch_status: row.launch_status,
              }}
              canActivate={canActivate}
              onChanged={() => void load()}
            />


            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Worker term (short)</Label>
                <Input
                  value={row.provider_term_short}
                  onChange={(e) => patch(row.code, { provider_term_short: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Worker term (long)</Label>
                <Input
                  value={row.provider_term_long}
                  onChange={(e) => patch(row.code, { provider_term_long: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cities / zones (comma separated)</Label>
                <Input
                  value={(row.cities || []).join(", ")}
                  onChange={(e) =>
                    patch(row.code, {
                      cities: e.target.value.split(",").map((c) => c.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Policy version</Label>
                <Input
                  value={row.policy_version}
                  onChange={(e) => patch(row.code, { policy_version: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Required documents (comma separated)</Label>
                <Input
                  value={(row.required_documents || []).join(", ")}
                  onChange={(e) =>
                    patch(row.code, {
                      required_documents: e.target.value.split(",").map((d) => d.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="font-medium">Registration required</p>
                <p className="text-sm text-muted-foreground">
                  Workers stay ineligible for jobs until an administrator verifies their registration.
                </p>
              </div>
              <Switch
                checked={row.registration_required}
                onCheckedChange={(v) => patch(row.code, { registration_required: v })}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="font-medium">Prices, payouts, minimums and travel</p>
              {pricing.filter((p) => p.province === row.code).length === 0 && (
                <p className="text-sm text-muted-foreground">No prices configured for {row.name} yet.</p>
              )}
              {pricing
                .filter((p) => p.province === row.code)
                .map((p) => (
                  <div key={p.id} className="rounded-md border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-medium">
                        {p.service_id}
                        {p.city_or_zone ? ` — ${p.city_or_zone}` : " — all cities"}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Active</Label>
                          <Switch checked={p.active} onCheckedChange={(v) => patchPricing(p.id, { active: v })} />
                        </div>
                        <Button size="sm" variant="outline" onClick={() => savePricing(p)}>
                          Save
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {([
                        ["Client hourly price", "client_hourly_price"],
                        ["Worker hourly payout", "provider_hourly_payout"],
                        ["Minimum hours", "minimum_booking_hours"],
                        ["Weekend premium", "weekend_premium"],
                        ["Holiday premium", "holiday_premium"],
                        ["Travel charge", "travel_charge"],
                      ] as const).map(([label, field]) => (
                        <div key={field} className="space-y-1.5">
                          <Label className="text-sm">{label}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={p[field] as number}
                            onChange={(e) => patchPricing(p.id, { [field]: Number(e.target.value) } as Partial<PricingRow>)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
