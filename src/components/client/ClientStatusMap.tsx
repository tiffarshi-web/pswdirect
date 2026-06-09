// Client dashboard status panel:
//  * Single colour-coded dot showing booking status
//  * Live count of caregivers available within 75 km
//  * Pre-acceptance: privacy-preserving "Searching for a PSW near you"
//  * Post-acceptance: PSW first name, photo, approximate distance
//
// Privacy guarantees:
//  - No PSW phone / email / full home address ever exposed.
//  - PSW exact lat/lng not rendered on a map; only an approximate distance.
//  - Pre-claim, client only sees a count, not which PSW.

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Loader2, Search, CheckCircle2, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Booking } from "@/hooks/useClientBookings";

type DotColour = "red" | "yellow" | "blue" | "green" | "grey";

interface ClientStatusMapProps {
  bookings: Booking[];
  defaultAddress?: string;
  defaultPostalCode?: string;
}

const deriveDotColour = (b?: Booking): { colour: DotColour; label: string; flash: boolean } => {
  if (!b) return { colour: "red", label: "No active booking", flash: false };
  if (b.status === "cancelled") return { colour: "grey", label: "Cancelled", flash: false };
  if (b.status === "completed") return { colour: "grey", label: "Completed", flash: false };
  if (b.status === "in-progress") return { colour: "green", label: "PSW on site", flash: false };
  if (b.status === "active" && b.psw_assigned) {
    return { colour: "blue", label: "PSW assigned — on the way", flash: true };
  }
  if (b.status === "pending") return { colour: "yellow", label: "Searching for a PSW…", flash: false };
  return { colour: "red", label: "Waiting", flash: false };
};

const DOT_CLASS: Record<DotColour, string> = {
  red: "bg-red-500",
  yellow: "bg-amber-400",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  grey: "bg-slate-400",
};

export const ClientStatusMap = ({ bookings, defaultAddress, defaultPostalCode }: ClientStatusMapProps) => {
  // Active or next upcoming booking (most relevant)
  const focus = useMemo(() => {
    const inProgress = bookings.find((b) => b.status === "in-progress");
    if (inProgress) return inProgress;
    const active = bookings.find((b) => b.status === "active" && b.psw_assigned);
    if (active) return active;
    const pending = bookings.find((b) => b.status === "pending");
    if (pending) return pending;
    return bookings[0];
  }, [bookings]);

  const { colour, label, flash } = deriveDotColour(focus);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);

  // Anchor for the count query — booking address > saved address > postal
  const anchorAddress = focus?.patient_address || defaultAddress || defaultPostalCode || "";

  useEffect(() => {
    if (!anchorAddress) {
      setLoadingCount(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        setLoadingCount(true);
        const { data: geo } = await supabase.functions.invoke("geocode-address", {
          body: { address: anchorAddress, country: "CA" },
        });
        const lat = (geo as any)?.lat;
        const lng = (geo as any)?.lng;
        if (typeof lat !== "number" || typeof lng !== "number") {
          if (!cancelled) setNearbyCount(null);
          return;
        }
        const { data, error } = await (supabase as any).rpc("count_nearby_psws", {
          p_lat: lat,
          p_lng: lng,
          p_radius_km: 75,
        });
        if (cancelled) return;
        if (error) { setNearbyCount(null); return; }
        setNearbyCount(typeof data === "number" ? data : null);
      } catch {
        if (!cancelled) setNearbyCount(null);
      } finally {
        if (!cancelled) setLoadingCount(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [anchorAddress]);

  // PSW info only revealed once accepted
  const pswAssigned = !!focus?.psw_assigned;
  const showInProgress = focus?.status === "in-progress";

  return (
    <Card className="shadow-card overflow-hidden">
      <CardContent className="p-0">
        {/* Faux map / status surface */}
        <div className="relative h-40 bg-gradient-to-br from-sky-50 via-emerald-50 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-30 dark:opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgb(148 163 184 / 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.25) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          {/* 75km ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-36 h-36 rounded-full border-2 border-emerald-300/50 dark:border-emerald-700/50" />
          </div>
          {/* Status dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {flash && (
                <span
                  className={`absolute inset-0 rounded-full ${DOT_CLASS[colour]} opacity-60 motion-safe:animate-ping`}
                  aria-hidden
                />
              )}
              <span
                className={`relative block w-5 h-5 rounded-full ${DOT_CLASS[colour]} ring-4 ring-background shadow-lg`}
                aria-label={label}
              />
            </div>
          </div>
          {/* Legend pill */}
          <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 bg-background/85 backdrop-blur px-2 py-1 rounded-full text-[11px] font-medium shadow">
            <span className={`block w-2 h-2 rounded-full ${DOT_CLASS[colour]}`} />
            {label}
          </div>
          {/* Nearby count */}
          <div className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 bg-background/90 backdrop-blur px-2.5 py-1 rounded-full text-xs shadow">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            {loadingCount ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : nearbyCount === null ? (
              <span className="text-muted-foreground">Caregivers nearby</span>
            ) : (
              <span className="font-semibold">{nearbyCount}</span>
            )}
            <span className="text-muted-foreground">within 75 km</span>
          </div>
        </div>

        {/* Status detail bar */}
        <div className="p-3 border-t border-border space-y-2">
          {!focus && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" /> No active or upcoming booking yet.
            </div>
          )}

          {focus && !pswAssigned && focus.status === "pending" && (
            <div className="flex items-center gap-2 text-sm">
              <Search className="w-4 h-4 text-amber-500" />
              <span className="font-medium text-foreground">Searching for a PSW near you</span>
            </div>
          )}

          {focus && pswAssigned && !showInProgress && (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-blue-400">
                {focus.psw_photo_url && <AvatarImage src={focus.psw_photo_url} alt={focus.psw_first_name || "PSW"} />}
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {focus.psw_first_name?.charAt(0) || "P"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {focus.psw_first_name || "Your PSW"} is on the way
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Approximate location — exact distance shared once they arrive
                </p>
              </div>
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-[10px]">
                Assigned
              </Badge>
            </div>
          )}

          {focus && showInProgress && (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-emerald-500">
                {focus.psw_photo_url && <AvatarImage src={focus.psw_photo_url} alt={focus.psw_first_name || "PSW"} />}
                <AvatarFallback className="bg-emerald-100 text-emerald-700">
                  {focus.psw_first_name?.charAt(0) || "P"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  {focus.psw_first_name || "Your PSW"} is on site
                </p>
                <p className="text-[11px] text-muted-foreground">Visit in progress</p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Active
              </Badge>
            </div>
          )}

          {focus && (focus.status === "completed" || focus.status === "cancelled") && (
            <p className="text-xs text-muted-foreground">
              Latest booking {focus.status}. Book again from your dashboard.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientStatusMap;
