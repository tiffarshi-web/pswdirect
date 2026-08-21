// Contact & Address — self-service home address management for approved PSWs.
// Mobile/PWA friendly: large touch targets, single-column, sticky save button.

import { useEffect, useRef, useState } from "react";
import { MapPin, Save, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ENABLED_PROVINCES,
  validateAddress,
  geocodePSWAddress,
  saveOwnAddress,
  loadOwnAddress,
  normalizePostalCode,
  type PSWAddressInput,
} from "@/lib/pswAddressStore";

const EMPTY: PSWAddressInput = {
  streetAddress: "",
  unit: "",
  city: "",
  province: "ON",
  postalCode: "",
};

interface Props {
  pswId?: string;
}

export const PSWAddressSection = ({ pswId }: Props) => {
  const [form, setForm] = useState<PSWAddressInput>(EMPTY);
  const [saved, setSaved] = useState<PSWAddressInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  dirtyRef.current = dirty;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!pswId) {
        setLoading(false);
        return;
      }
      const rec = await loadOwnAddress(pswId);
      if (cancelled) return;
      const next: PSWAddressInput = rec
        ? {
            streetAddress: rec.streetAddress,
            unit: rec.unit || "",
            city: rec.city,
            province: ENABLED_PROVINCES.some((p) => p.code === rec.province)
              ? rec.province
              : "ON",
            postalCode: rec.postalCode,
          }
        : EMPTY;
      setForm(next);
      setSaved(next);
      setLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [pswId]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const set = (key: keyof PSWAddressInput, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const handleSave = async () => {
    const result = validateAddress(form);
    if (!result.valid || !result.normalized) {
      // Entered values are preserved — only errors are surfaced.
      setErrors(result.errors as Record<string, string>);
      toast.error("Please check your address details");
      return;
    }

    setSaving(true);
    try {
      const normalized = result.normalized;
      setForm({ ...normalized, unit: normalized.unit || "" });

      const geo = await geocodePSWAddress(normalized);
      if (geo.precision === "none" || geo.lat === null || geo.lng === null) {
        setErrors({
          streetAddress:
            "We couldn't locate this address. Please double-check the street name, number and postal code.",
        });
        toast.error("We couldn't confirm this address", {
          description: "Please review the street address and postal code, then try again.",
        });
        return;
      }

      const res = await saveOwnAddress(normalized, { lat: geo.lat, lng: geo.lng });
      if (!res.success) {
        toast.error(res.message || "We couldn't save your address. Please try again.");
        return;
      }

      const persisted = { ...normalized, unit: normalized.unit || "" };
      setForm(persisted);
      setSaved(persisted);
      toast.success(
        "Your address has been updated. Future job distances will use your new location.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Contact &amp; Address
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Keep your home address current — it is used to match you with nearby jobs. Your
          street address is private and is never shown on public pages.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your address…
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="psw-street">Street address</Label>
              <Input
                id="psw-street"
                inputMode="text"
                autoComplete="street-address"
                placeholder="123 Main St"
                value={form.streetAddress}
                onChange={(e) => set("streetAddress", e.target.value)}
                className="h-11 text-base"
              />
              {errors.streetAddress && (
                <p className="text-xs text-destructive">{errors.streetAddress}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="psw-unit">Apartment / unit (optional)</Label>
              <Input
                id="psw-unit"
                placeholder="Unit 4B"
                value={form.unit || ""}
                onChange={(e) => set("unit", e.target.value)}
                className="h-11 text-base"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="psw-city">City</Label>
                <Input
                  id="psw-city"
                  autoComplete="address-level2"
                  placeholder="Barrie"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  className="h-11 text-base"
                />
                {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="psw-province">Province</Label>
                <Select
                  value={form.province}
                  onValueChange={(v) => set("province", v)}
                  disabled={ENABLED_PROVINCES.length === 1}
                >
                  <SelectTrigger id="psw-province" className="h-11 text-base">
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENABLED_PROVINCES.map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.province && (
                  <p className="text-xs text-destructive">{errors.province}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="psw-postal">Postal code</Label>
              <Input
                id="psw-postal"
                autoComplete="postal-code"
                placeholder="M5V 1J9"
                value={form.postalCode}
                onChange={(e) => set("postalCode", e.target.value.toUpperCase())}
                onBlur={() =>
                  setForm((f) => ({
                    ...f,
                    postalCode: normalizePostalCode(f.postalCode) || f.postalCode.trim(),
                  }))
                }
                className="h-11 text-base uppercase"
              />
              {errors.postalCode && (
                <p className="text-xs text-destructive">{errors.postalCode}</p>
              )}
            </div>

            {dirty && (
              <p className="text-xs text-amber-600">You have unsaved changes.</p>
            )}

            <Button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="w-full h-12 text-base font-semibold"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Save Address
                </>
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Your full address stays private. Families and public pages only ever see your
              general service area.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PSWAddressSection;
