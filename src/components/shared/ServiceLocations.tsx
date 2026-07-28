// Shared, mobile-friendly renderer for an order's labelled service locations.
// Used by admin pipeline cards, order details, assign dialogs, PSW job screens
// and client order views so every surface stays consistent.

import { useState } from "react";
import { MapPin, Hospital, Home, Stethoscope, Navigation, ChevronDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getServiceKind,
  getServiceLocations,
  isFacilityLocationMissing,
  FACILITY_MISSING_WARNING,
  mapsUrl,
  type ServiceLocation,
} from "@/lib/serviceLocations";

const iconFor = (loc: ServiceLocation) => {
  if (loc.key === "facility") return Stethoscope;
  if (loc.key === "pickup") return loc.label.includes("Hospital") ? Hospital : MapPin;
  if (loc.key === "destination") return Home;
  return MapPin;
};

interface ServiceLocationsProps {
  booking: any;
  /** Show navigation links (assigned PSW / admin only). */
  showNavigation?: boolean;
  /** Render the admin "missing address" warning. Never enable for clients/PSWs. */
  showAdminWarning?: boolean;
  /** Start collapsed behind a "Service locations" toggle. */
  collapsible?: boolean;
  /** Hide the block entirely for plain Home Care orders. */
  hideForHomeCare?: boolean;
  className?: string;
}

export const ServiceLocations = ({
  booking,
  showNavigation = false,
  showAdminWarning = false,
  collapsible = false,
  hideForHomeCare = true,
  className,
}: ServiceLocationsProps) => {
  const [open, setOpen] = useState(!collapsible);
  const kind = getServiceKind(booking);
  const locations = getServiceLocations(booking);
  const missing = isFacilityLocationMissing(booking);

  if (kind === "home-care" && hideForHomeCare) return null;
  if (!locations.length) return null;

  const body = (
    <div className="space-y-2">
      {locations.map((loc) => {
        const Icon = iconFor(loc);
        const hasValue = !!(loc.address || loc.name);
        return (
          <div
            key={loc.key + loc.label}
            className="rounded-md border border-border bg-muted/40 px-2.5 py-2"
          >
            <div className="flex items-start gap-2">
              <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {loc.label}
                </p>
                {loc.name && (
                  <p className="text-sm font-medium text-foreground break-words">{loc.name}</p>
                )}
                {loc.address ? (
                  <p className="text-sm text-foreground break-words">{loc.address}</p>
                ) : (
                  !loc.name && (
                    <p className="text-sm italic text-muted-foreground">Not provided</p>
                  )
                )}
                {loc.unit && (
                  <p className="text-xs text-muted-foreground break-words">Unit / Dept: {loc.unit}</p>
                )}
                {loc.time && (
                  <p className="text-xs text-muted-foreground">Appointment: {loc.time.slice(0, 5)}</p>
                )}
                {loc.instructions && (
                  <p className="text-xs text-muted-foreground break-words whitespace-pre-line">
                    {loc.instructions}
                  </p>
                )}
              </div>
              {showNavigation && hasValue && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(mapsUrl(loc), "_blank", "noopener,noreferrer");
                  }}
                >
                  <Navigation className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={cn("space-y-2", className)}>
      {showAdminWarning && missing && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs font-medium text-destructive">{FACILITY_MISSING_WARNING}</p>
        </div>
      )}

      {collapsible ? (
        <div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <MapPin className="w-3.5 h-3.5" />
            Service locations ({locations.length})
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
          </button>
          {open && <div className="mt-2">{body}</div>}
        </div>
      ) : (
        body
      )}
    </div>
  );
};

export default ServiceLocations;
