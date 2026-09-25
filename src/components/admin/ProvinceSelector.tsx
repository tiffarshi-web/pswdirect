import { useEffect, useState } from "react";
import { MapPin, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProvinceFilter } from "@/contexts/ProvinceFilterContext";
import { DEFAULT_PROVINCES, fetchProvinces, type ProvinceConfig } from "@/lib/provinceConfig";
import { provinceLaunchLabel } from "@/lib/provinceScope";
import { cn } from "@/lib/utils";

const useProvinceOptions = () => {
  const [options, setOptions] = useState<ProvinceConfig[]>(
    Object.values(DEFAULT_PROVINCES),
  );
  useEffect(() => {
    fetchProvinces().then((all) => {
      const list = Object.values(all).sort((a, b) =>
        // Live provinces first, then alphabetical.
        Number(provinceLaunchLabel(b) === "Live") - Number(provinceLaunchLabel(a) === "Live") ||
        a.name.localeCompare(b.name),
      );
      if (list.length) setOptions(list);
    });
  }, []);
  return options;
};

const LaunchBadge = ({ p }: { p?: ProvinceConfig }) => {
  const label = provinceLaunchLabel(p);
  return (
    <Badge variant={label === "Live" ? "default" : label === "Preparation" ? "secondary" : "outline"}>
      {label}
    </Badge>
  );
};

/**
 * Prominent Province button. Changing it only changes which province's
 * records are viewed — never a province's launch status or any record.
 */
export const ProvinceSelector = () => {
  const { province, setProvince } = useProvinceFilter();
  const options = useProvinceOptions();
  const [open, setOpen] = useState(false);
  const current = options.find((p) => p.code === province);

  return (
    <>
      <Button
        variant="outline"
        className="h-10 gap-2 border-primary/40 font-semibold"
        onClick={() => setOpen(true)}
        aria-label={`Province: ${current?.name ?? province}. Change province`}
      >
        <MapPin className="w-4 h-4 text-primary" />
        <span>{current?.name ?? province}</span>
        <ChevronDown className="w-4 h-4 opacity-60" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose a province</DialogTitle>
            <DialogDescription>
              The admin screens will show only this province's records. Switching never changes a
              province's launch status or moves any records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {options.map((p) => {
              const selected = p.code === province;
              return (
                <button
                  key={p.code}
                  onClick={() => { setProvince(p.code); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg border p-3 text-left transition-colors",
                    selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
                  )}
                >
                  <div>
                    <div className="font-medium text-foreground flex items-center gap-2">
                      {p.name} <span className="text-xs text-muted-foreground">{p.code}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Bookings {p.bookingsEnabled ? "on" : "off"} · Payments {p.paymentsEnabled ? "on" : "off"} ·
                      Recruitment {p.recruitmentEnabled ? "on" : "off"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <LaunchBadge p={p} />
                    {selected && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/** Always-visible strip showing which province's records are on screen. */
export const ProvinceViewingBanner = () => {
  const { province } = useProvinceFilter();
  const options = useProvinceOptions();
  const p = options.find((o) => o.code === province);
  const label = provinceLaunchLabel(p);
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 px-4 lg:px-6 py-2 text-sm border-b border-border",
        label === "Live" ? "bg-muted/40" : "bg-accent/40",
      )}
      data-testid="province-viewing-banner"
    >
      <MapPin className="w-4 h-4 text-primary" />
      <span className="text-muted-foreground">Viewing records for</span>
      <span className="font-semibold text-foreground">{p?.name ?? province}</span>
      <LaunchBadge p={p} />
      {label !== "Live" && (
        <span className="text-muted-foreground">
          — client bookings, payments{p?.recruitmentEnabled ? "" : " and recruitment"} are switched off.
        </span>
      )}
    </div>
  );
};
